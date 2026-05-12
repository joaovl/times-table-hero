import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { UserSelector } from '@/components/UserSelector';
import { PrintWorksheetModal } from '@/components/PrintWorksheetModal';
import type { UserProfile } from '@/lib/userStorage';
import type { Difficulty, MoneySettings, MoneySkill } from './logic';
import {
  CURRICULUM_TAGS,
  MONEY_SKILL_LABEL,
  MONEY_SKILL_OPTIONS,
  generateMoneyQuestions,
  moneyExample,
} from './logic';
import { generateMoneyPdf } from './pdf';
import {
  getSavedMoneyPrintConfig,
  getSavedMoneySettings,
  saveMoneyPrintConfig,
  saveMoneySettings,
} from './storage';
import {
  PRINT_PAGE_OPTIONS,
  buildMoneySummary,
  perPageOptionsForSkills,
} from './printConfig';

interface Props {
  onStart: (s: MoneySettings) => void;
  currentUser: UserProfile | null;
  onUserChange: (u: UserProfile | null) => void;
  onNewUser: () => void;
  onNavigateToHub: () => void;
  autoOpenPrint?: boolean;
}

const QUESTION_COUNTS = [5, 10, 25, 50, 75, 100];
const TIME_LIMITS = [
  { label: '1 min', value: 60 },
  { label: '3 min', value: 180 },
  { label: '5 min', value: 300 },
  { label: '10 min', value: 600 },
];

const DIFFICULTY_HINTS: Record<Difficulty, string> = {
  easy: 'Pence-only or whole pounds',
  medium: '£ + p, no decimal carry',
  hard: '£ + p, with carries',
};

const buttonClass = (active: boolean) =>
  cn(
    'rounded-lg md:rounded-xl min-h-[44px] md:h-[42px] flex items-center justify-center text-center font-bold transition-all',
    'hover:scale-[1.02] active:scale-[0.98]',
    active
      ? 'bg-gradient-to-b from-primary via-primary/90 to-primary/70 text-primary-foreground shadow-xl hover:shadow-2xl'
      : 'bg-gradient-to-b from-secondary via-secondary/85 to-secondary/65 text-muted-foreground hover:from-secondary/80 hover:to-secondary/60 border border-card-border shadow-lg'
  );

// Multi-select chip picker over the money-skill list.
interface SkillChipPickerProps {
  selected: MoneySkill[];
  onChange: (next: MoneySkill[]) => void;
}

function SkillChipPicker({ selected, onChange }: SkillChipPickerProps) {
  const orderIndex = new Map<MoneySkill, number>(
    MONEY_SKILL_OPTIONS.map((s, i) => [s, i])
  );
  const isSelected = (s: MoneySkill) => selected.includes(s);
  const toggle = (s: MoneySkill) => {
    if (isSelected(s)) {
      // Refuse to deselect the last chip — generation needs at least one.
      if (selected.length === 1) return;
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
    <div className="grid grid-cols-2 md:grid-cols-3 gap-1 md:gap-2">
      {MONEY_SKILL_OPTIONS.map(s => {
        const tag = CURRICULUM_TAGS[s];
        const years = tag.years.length === 1 ? `Y${tag.years[0]}` : `Y${tag.years[0]}-Y${tag.years[tag.years.length - 1]}`;
        return (
          <button
            key={s}
            type="button"
            onClick={() => toggle(s)}
            aria-pressed={isSelected(s)}
            className={cn(buttonClass(isSelected(s)), 'flex-col py-2 leading-tight')}
          >
            <span className="text-[13px] md:text-[15px]">{MONEY_SKILL_LABEL[s]}</span>
            <span className="text-[10px] md:text-[11px] opacity-80">{years}</span>
          </button>
        );
      })}
    </div>
  );
}

export function MoneySetup({
  onStart,
  currentUser,
  onUserChange,
  onNewUser,
  onNavigateToHub,
  autoOpenPrint = false,
}: Props) {
  const [skills, setSkills] = useState<MoneySkill[]>(['add-money']);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [gameMode, setGameMode] = useState<'questions' | 'time'>('questions');
  const [questionCount, setQuestionCount] = useState(10);
  const [timeLimit, setTimeLimit] = useState(180);
  const [isLoaded, setIsLoaded] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [printConfig, setPrintConfig] = useState({ pageCount: 1, questionsPerPage: 16 });
  // Force the example to refresh on skill/difficulty changes so the parent
  // can see what shape of question they'll get.
  const [exampleSeed, setExampleSeed] = useState(0);

  const perPageOptions = useMemo(() => perPageOptionsForSkills(skills), [skills]);

  useEffect(() => {
    setIsLoaded(false);
    const s = getSavedMoneySettings(currentUser?.id);
    setSkills(s.skills);
    setDifficulty(s.difficulty);
    setGameMode(s.gameMode);
    setQuestionCount(s.questionCount);
    setTimeLimit(s.timeLimit);
    setPrintConfig(getSavedMoneyPrintConfig(currentUser?.id));
    setIsLoaded(true);
  }, [currentUser?.id]);

  useEffect(() => {
    if (!isLoaded) return;
    saveMoneySettings(
      { skills, difficulty, gameMode, questionCount, timeLimit },
      currentUser?.id
    );
  }, [isLoaded, skills, difficulty, gameMode, questionCount, timeLimit, currentUser?.id]);

  useEffect(() => {
    if (autoOpenPrint && isLoaded) setPrintOpen(true);
  }, [autoOpenPrint, isLoaded]);

  // Bump the example seed whenever the user changes skills / difficulty.
  useEffect(() => {
    setExampleSeed(n => n + 1);
  }, [skills, difficulty]);

  const exampleText = useMemo(
    () => moneyExample(skills, difficulty),
    // exampleSeed forces a re-roll; logic above already depends on
    // skills+difficulty, but adding it to the deps array is the cleanest way
    // to keep the dependency explicit for the linter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [skills, difficulty, exampleSeed]
  );

  const start = () =>
    onStart({ skills, difficulty, gameMode, questionCount, timeLimit });

  const handlePrintDownload = (pages: number, perPage: number, name: string) => {
    const settings: MoneySettings = {
      skills,
      difficulty,
      gameMode: 'questions',
      questionCount: perPage,
      timeLimit: 0,
    };
    const pagesArr = Array.from({ length: pages }, () =>
      generateMoneyQuestions(settings, perPage)
    );
    const subtitle = `${perPage} Questions per page — ${buildMoneySummary(skills, difficulty)}`;
    const doc = generateMoneyPdf({
      pages: pagesArr,
      title: 'Maths Challenge — Money',
      subtitle,
      studentName: name || undefined,
      includeAnswerKey: true,
    });
    doc.save('maths-money.pdf');
    const next = { pageCount: pages, questionsPerPage: perPage };
    setPrintConfig(next);
    saveMoneyPrintConfig(next, currentUser?.id);
  };

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
          Money Practice
        </h1>
        <p className="text-center text-[12px] md:text-[17px] text-muted-foreground mb-3">
          {currentUser ? `Hi ${currentUser.name}! ` : ''}Pick which skills to work on
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
          <p className="text-[12px] md:text-[14px] text-foreground/70 text-center mt-3">
            Example: {exampleText}
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
            <div className="grid grid-cols-6 gap-2">
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
        questionsPerPageOptions={perPageOptions}
        summary={buildMoneySummary(skills, difficulty)}
        onDownload={handlePrintDownload}
      />
    </div>
  );
}
