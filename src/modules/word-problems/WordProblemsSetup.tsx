import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { UserSelector } from '@/components/UserSelector';
import { PrintWorksheetModal } from '@/components/PrintWorksheetModal';
import type { UserProfile } from '@/lib/userStorage';
import type {
  WordDifficulty,
  WordProblemSkill,
  WordSettings,
} from './logic';
import {
  generateWordQuestions,
  WORD_SKILL_OPTIONS,
  WORD_SKILL_SHORT,
  CURRICULUM_TAGS,
} from './logic';
import { generateWordPdf } from './pdf';
import {
  getSavedWordSettings,
  saveWordSettings,
  getSavedWordPrintConfig,
  saveWordPrintConfig,
} from './storage';
import {
  PRINT_PAGE_OPTIONS,
  PRINT_PER_PAGE_OPTIONS,
  buildWordSummary,
} from './printConfig';

interface Props {
  onStart: (s: WordSettings) => void;
  currentUser: UserProfile | null;
  onUserChange: (u: UserProfile | null) => void;
  onNewUser: () => void;
  onNavigateToHub: () => void;
  autoOpenPrint?: boolean;
}

const QUESTION_COUNTS = [5, 10, 15, 20, 25];
const TIME_LIMITS = [
  { label: '3 min', value: 180 },
  { label: '5 min', value: 300 },
  { label: '10 min', value: 600 },
  { label: '15 min', value: 900 },
];

const DIFFICULTY_HINTS: Record<WordDifficulty, string> = {
  easy: 'Small numbers, one step',
  medium: 'Two-digit numbers',
  hard: 'Two steps, harder numbers',
};

const buttonClass = (active: boolean) =>
  cn(
    'rounded-lg md:rounded-xl min-h-[44px] md:h-[42px] flex items-center justify-center text-center font-bold transition-all',
    'hover:scale-[1.02] active:scale-[0.98]',
    active
      ? 'bg-gradient-to-b from-primary via-primary/90 to-primary/70 text-primary-foreground shadow-xl hover:shadow-2xl'
      : 'bg-gradient-to-b from-secondary via-secondary/85 to-secondary/65 text-muted-foreground hover:from-secondary/80 hover:to-secondary/60 border border-card-border shadow-lg'
  );

// Multi-select chip picker over the WordProblemSkill enum. Always
// non-empty: the last selected chip refuses to deselect so generation
// always has at least one skill to draw from.
interface SkillChipPickerProps {
  selected: WordProblemSkill[];
  onChange: (next: WordProblemSkill[]) => void;
}

function SkillChipPicker({ selected, onChange }: SkillChipPickerProps) {
  const orderIndex = new Map<WordProblemSkill, number>(
    WORD_SKILL_OPTIONS.map((s, i) => [s, i])
  );
  const isSelected = (s: WordProblemSkill) => selected.includes(s);
  const toggle = (s: WordProblemSkill) => {
    if (isSelected(s)) {
      if (selected.length === 1) return; // refuse to empty
      onChange(
        selected
          .filter(x => x !== s)
          .sort((a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0))
      );
    } else {
      onChange(
        [...selected, s].sort(
          (a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0)
        )
      );
    }
  };

  return (
    <div className="grid grid-cols-2 gap-1.5 md:gap-2">
      {WORD_SKILL_OPTIONS.map(s => (
        <button
          key={s}
          type="button"
          onClick={() => toggle(s)}
          aria-pressed={isSelected(s)}
          className={cn(
            'rounded-lg md:rounded-xl min-h-[52px] md:min-h-[60px] px-2 py-1 flex flex-col items-center justify-center text-center font-bold transition-all',
            'hover:scale-[1.02] active:scale-[0.98]',
            isSelected(s)
              ? 'bg-gradient-to-b from-primary via-primary/90 to-primary/70 text-primary-foreground shadow-xl hover:shadow-2xl'
              : 'bg-gradient-to-b from-secondary via-secondary/85 to-secondary/65 text-muted-foreground hover:from-secondary/80 hover:to-secondary/60 border border-card-border shadow-lg'
          )}
        >
          <span className="text-[13px] md:text-[15px] leading-tight">
            {WORD_SKILL_SHORT[s]}
          </span>
          <span className="text-[10px] md:text-[11px] opacity-80 leading-tight">
            {CURRICULUM_TAGS[s].join(' / ')}
          </span>
        </button>
      ))}
    </div>
  );
}

export function WordProblemsSetup({
  onStart,
  currentUser,
  onUserChange,
  onNewUser,
  onNavigateToHub,
  autoOpenPrint = false,
}: Props) {
  const [skills, setSkills] = useState<WordProblemSkill[]>([
    'arith-1step',
    'money-1step',
  ]);
  const [difficulty, setDifficulty] = useState<WordDifficulty>('easy');
  const [gameMode, setGameMode] = useState<'questions' | 'time'>('questions');
  const [questionCount, setQuestionCount] = useState(10);
  const [timeLimit, setTimeLimit] = useState(300);
  const [isLoaded, setIsLoaded] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [printConfig, setPrintConfig] = useState({
    pageCount: 1,
    questionsPerPage: 6,
  });

  useEffect(() => {
    setIsLoaded(false);
    const s = getSavedWordSettings(currentUser?.id);
    setSkills(s.skills);
    setDifficulty(s.difficulty);
    setGameMode(s.gameMode);
    setQuestionCount(s.questionCount);
    setTimeLimit(s.timeLimit);
    setPrintConfig(getSavedWordPrintConfig(currentUser?.id));
    setIsLoaded(true);
  }, [currentUser?.id]);

  useEffect(() => {
    if (!isLoaded) return;
    saveWordSettings(
      {
        skills,
        difficulty,
        gameMode,
        questionCount,
        timeLimit,
      },
      currentUser?.id
    );
  }, [
    isLoaded,
    skills,
    difficulty,
    gameMode,
    questionCount,
    timeLimit,
    currentUser?.id,
  ]);

  useEffect(() => {
    if (autoOpenPrint && isLoaded) setPrintOpen(true);
  }, [autoOpenPrint, isLoaded]);

  const start = () =>
    onStart({
      skills,
      difficulty,
      gameMode,
      questionCount,
      timeLimit,
    });

  const handlePrintDownload = (pages: number, perPage: number, name: string) => {
    const settings: WordSettings = {
      skills,
      difficulty,
      gameMode: 'questions',
      questionCount: perPage,
      timeLimit: 0,
    };
    const pagesArr = Array.from({ length: pages }, () =>
      generateWordQuestions(settings, perPage)
    );
    const subtitle = `${perPage} questions per page - ${buildWordSummary(skills, difficulty)}`;
    const doc = generateWordPdf({
      pages: pagesArr,
      title: 'Maths Challenge - Word Problems',
      subtitle,
      studentName: name || undefined,
      includeAnswerKey: true,
    });
    doc.save('maths-word-problems.pdf');
    const next = { pageCount: pages, questionsPerPage: perPage };
    setPrintConfig(next);
    saveWordPrintConfig(next, currentUser?.id);
  };

  const summaryLine = useMemo(
    () => buildWordSummary(skills, difficulty),
    [skills, difficulty]
  );

  return (
    <div className="min-h-screen bg-background p-7">
      <div className="mx-auto max-w-[600px]">
        <button
          onClick={onNavigateToHub}
          className="text-muted-foreground hover:text-foreground transition-colors text-sm md:text-base mb-2"
        >
          ← Hub
        </button>

        <h1 className="text-[22px] md:text-[36px] font-bold text-primary text-center mb-1 md:mb-2">
          Word Problems
        </h1>
        <p className="text-center text-[12px] md:text-[17px] text-muted-foreground mb-3">
          {currentUser ? `Hi ${currentUser.name}! ` : ''}Read the question, work it out
        </p>

        <div className="mb-3 md:mb-6 flex items-center justify-end">
          <UserSelector
            currentUser={currentUser}
            onUserChange={onUserChange}
            onNewUser={onNewUser}
          />
        </div>

        <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
          <h2 className="mb-2 md:mb-3 text-[14px] md:text-[20px] font-semibold text-foreground">
            Skills
          </h2>
          <SkillChipPicker selected={skills} onChange={setSkills} />
          <p className="text-[11px] md:text-[12px] text-muted-foreground text-center mt-2 leading-tight">
            Pick one or more topics
          </p>
        </Card>

        <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
          <h2 className="mb-2 md:mb-3 text-[14px] md:text-[20px] font-semibold text-foreground">
            Difficulty
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {(['easy', 'medium', 'hard'] as const).map(d => (
              <div key={d} className="flex flex-col gap-1 md:gap-1.5">
                <button
                  onClick={() => setDifficulty(d)}
                  className={buttonClass(difficulty === d)}
                >
                  <span className="text-[13px] md:text-[16px]">
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </span>
                </button>
                <p className="text-[10px] md:text-[12px] text-foreground/70 text-center leading-tight">
                  {DIFFICULTY_HINTS[d]}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
          <h2 className="mb-2 md:mb-3 text-[14px] md:text-[20px] font-semibold text-foreground">
            Game Mode
          </h2>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setGameMode('questions')}
              className={cn('flex-1', buttonClass(gameMode === 'questions'))}
            >
              <span className="text-[13px] md:text-[16px]">Questions</span>
            </button>
            <button
              onClick={() => setGameMode('time')}
              className={cn('flex-1', buttonClass(gameMode === 'time'))}
            >
              <span className="text-[13px] md:text-[16px]">Timed</span>
            </button>
          </div>
          {gameMode === 'questions' ? (
            <div className="grid grid-cols-5 gap-2">
              {QUESTION_COUNTS.map(c => (
                <button
                  key={c}
                  onClick={() => setQuestionCount(c)}
                  className={buttonClass(questionCount === c)}
                >
                  <span className="text-[15px] md:text-[16px]">{c}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-1 md:gap-1.5">
              {TIME_LIMITS.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTimeLimit(t.value)}
                  className={buttonClass(timeLimit === t.value)}
                >
                  <span className="text-[13px] md:text-[16px]">{t.label}</span>
                </button>
              ))}
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
          <Button
            variant="outline"
            onClick={() => setPrintOpen(true)}
            className="py-3 font-bold"
          >
            Print Worksheet
          </Button>
          <Button
            onClick={start}
            className="py-3 md:py-4 text-lg md:text-2xl font-bold bg-gradient-to-b from-primary via-primary/85 to-primary/65 shadow-button transition-all hover:translate-y-[-2px]"
            size="lg"
          >
            Let's Go!
          </Button>
        </div>
      </div>

      <PrintWorksheetModal
        isOpen={printOpen}
        onClose={() => setPrintOpen(false)}
        defaultName={currentUser?.name ?? ''}
        initialPageCount={printConfig.pageCount}
        initialQuestionsPerPage={printConfig.questionsPerPage}
        pageCountOptions={PRINT_PAGE_OPTIONS}
        questionsPerPageOptions={PRINT_PER_PAGE_OPTIONS}
        summary={summaryLine}
        onDownload={handlePrintDownload}
      />
    </div>
  );
}
