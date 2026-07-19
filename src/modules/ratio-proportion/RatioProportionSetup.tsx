import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { UserSelector } from '@/components/UserSelector';
import { PrintWorksheetModal } from '@/components/PrintWorksheetModal';
import type { UserProfile } from '@/lib/userStorage';
import type { RatioSettings, RatioSkill, Difficulty } from './logic';
import { ALL_SKILLS, ratioSkillLabel, generateRatioQuestions } from './logic';
import { useT } from '@/lib/i18n/react';
import type { MessageKey } from '@/lib/i18n/i18n';
import { generateRatioPdf } from './pdf';
import {
  getSavedRatioSettings,
  saveRatioSettings,
  getSavedRatioPrintConfig,
  saveRatioPrintConfig,
} from './storage';
import { PRINT_PAGE_OPTIONS, PRINT_PER_PAGE_OPTIONS, buildRatioSummary } from './printConfig';

interface Props {
  onStart: (s: RatioSettings) => void;
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

const DIFFICULTY_HINT_KEYS: [MessageKey, MessageKey, MessageKey] = [
  'ratio.setup.hintEasy',
  'ratio.setup.hintMedium',
  'ratio.setup.hintHard',
];

const DIFFICULTY_LABEL_KEY: Record<'easy' | 'medium' | 'hard', MessageKey> = {
  easy: 'ratio.setup.difficultyEasy',
  medium: 'ratio.setup.difficultyMedium',
  hard: 'ratio.setup.difficultyHard',
};

const buttonClass = (active: boolean) =>
  cn(
    'rounded-lg md:rounded-xl min-h-[44px] md:h-[42px] flex items-center justify-center text-center font-bold transition-all',
    'hover:scale-[1.02] active:scale-[0.98]',
    active
      ? 'bg-gradient-to-b from-primary via-primary/90 to-primary/70 text-primary-foreground shadow-xl hover:shadow-2xl'
      : 'bg-gradient-to-b from-secondary via-secondary/85 to-secondary/65 text-muted-foreground hover:from-secondary/80 hover:to-secondary/60 border border-card-border shadow-lg'
  );

export function RatioProportionSetup({
  onStart,
  currentUser,
  onUserChange,
  onNewUser,
  onNavigateToHub,
  autoOpenPrint = false,
}: Props) {
  const { t } = useT();
  const [skills, setSkills] = useState<RatioSkill[]>(['percent-of']);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [gameMode, setGameMode] = useState<'questions' | 'time'>('questions');
  const [questionCount, setQuestionCount] = useState(10);
  const [timeLimit, setTimeLimit] = useState(180);
  const [isLoaded, setIsLoaded] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [printConfig, setPrintConfig] = useState({ pageCount: 1, questionsPerPage: 20 });

  useEffect(() => {
    setIsLoaded(false);
    const s = getSavedRatioSettings(currentUser?.id);
    setSkills(s.skills);
    setDifficulty(s.difficulty);
    setGameMode(s.gameMode);
    setQuestionCount(s.questionCount);
    setTimeLimit(s.timeLimit);
    setPrintConfig(getSavedRatioPrintConfig(currentUser?.id));
    setIsLoaded(true);
  }, [currentUser?.id]);

  useEffect(() => {
    if (!isLoaded) return;
    saveRatioSettings(
      { skills, difficulty, gameMode, questionCount, timeLimit },
      currentUser?.id
    );
  }, [isLoaded, skills, difficulty, gameMode, questionCount, timeLimit, currentUser?.id]);

  useEffect(() => {
    if (autoOpenPrint && isLoaded) setPrintOpen(true);
  }, [autoOpenPrint, isLoaded]);

  const toggleSkill = (s: RatioSkill) => {
    setSkills(prev => {
      if (prev.includes(s)) {
        if (prev.length === 1) return prev;
        return prev.filter(x => x !== s);
      }
      return ALL_SKILLS.filter(x => prev.includes(x) || x === s);
    });
  };

  const start = () =>
    onStart({ skills, difficulty, gameMode, questionCount, timeLimit });

  const handlePrintDownload = (pages: number, perPage: number, name: string) => {
    const settings: RatioSettings = {
      skills,
      difficulty,
      gameMode: 'questions',
      questionCount: perPage,
      timeLimit: 0,
    };
    const pagesArr = Array.from({ length: pages }, () =>
      generateRatioQuestions(settings, perPage)
    );
    const subtitle = buildRatioSummary(skills, difficulty);
    const doc = generateRatioPdf({
      pages: pagesArr,
      title: 'Maths Challenge - Ratio & Proportion',
      subtitle: `${perPage} Questions per page - ${subtitle}`,
      studentName: name || undefined,
      includeAnswerKey: true,
    });
    doc.save('maths-ratio-proportion.pdf');
    const next = { pageCount: pages, questionsPerPage: perPage };
    setPrintConfig(next);
    saveRatioPrintConfig(next, currentUser?.id);
  };

  return (
    <div className="min-h-screen bg-background p-7">
      <div className="mx-auto max-w-[600px]">
        <button
          onClick={onNavigateToHub}
          className="text-muted-foreground hover:text-foreground transition-colors text-sm md:text-base mb-2"
        >
          {t('common.backToHub')}
        </button>

        <h1 className="text-[22px] md:text-[36px] font-bold text-primary text-center mb-1 md:mb-2">
          {t('ratio.setup.title')}
        </h1>
        <p className="text-center text-[12px] md:text-[17px] text-muted-foreground mb-3">
          {currentUser ? t('ratio.setup.hiName', { name: currentUser.name }) : ''}{t('ratio.setup.subtitle')}
        </p>

        <div className="mb-3 md:mb-6 flex items-center justify-end">
          <UserSelector currentUser={currentUser} onUserChange={onUserChange} onNewUser={onNewUser} />
        </div>

        <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
          <h2 className="mb-2 md:mb-3 text-[14px] md:text-[20px] font-semibold text-foreground">{t('ratio.setup.skills')}</h2>
          <div className="grid grid-cols-2 gap-1 md:gap-2">
            {ALL_SKILLS.map(s => (
              <button
                key={s}
                onClick={() => toggleSkill(s)}
                aria-pressed={skills.includes(s)}
                className={buttonClass(skills.includes(s))}
              >
                <span className="text-[12px] md:text-[14px] px-2 text-center">{ratioSkillLabel(s)}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
          <h2 className="mb-2 md:mb-3 text-[14px] md:text-[20px] font-semibold text-foreground">{t('ratio.setup.difficulty')}</h2>
          <div className="grid grid-cols-3 gap-2">
            {(['easy', 'medium', 'hard'] as const).map((d, idx) => (
              <div key={d} className="flex flex-col gap-1 md:gap-1.5">
                <button onClick={() => setDifficulty(d)} className={buttonClass(difficulty === d)}>
                  <span className="text-[13px] md:text-[16px]">{t(DIFFICULTY_LABEL_KEY[d])}</span>
                </button>
                <p className="text-[10px] md:text-[12px] text-foreground/70 text-center leading-tight">
                  {t(DIFFICULTY_HINT_KEYS[idx])}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
          <h2 className="mb-2 md:mb-3 text-[14px] md:text-[20px] font-semibold text-foreground">{t('ratio.setup.gameMode')}</h2>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setGameMode('questions')}
              className={cn('flex-1', buttonClass(gameMode === 'questions'))}
            >
              <span className="text-[13px] md:text-[16px]">{t('ratio.setup.questions')}</span>
            </button>
            <button
              onClick={() => setGameMode('time')}
              className={cn('flex-1', buttonClass(gameMode === 'time'))}
            >
              <span className="text-[13px] md:text-[16px]">{t('ratio.setup.timed')}</span>
            </button>
          </div>
          {gameMode === 'questions' ? (
            <div className="grid grid-cols-6 gap-2">
              {QUESTION_COUNTS.map(c => (
                <button key={c} onClick={() => setQuestionCount(c)} className={buttonClass(questionCount === c)}>
                  <span className="text-[15px] md:text-[16px]">{c}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-1 md:gap-1.5">
              {TIME_LIMITS.map(t => (
                <button key={t.value} onClick={() => setTimeLimit(t.value)} className={buttonClass(timeLimit === t.value)}>
                  <span className="text-[13px] md:text-[16px]">{t.label}</span>
                </button>
              ))}
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
          <Button variant="outline" onClick={() => setPrintOpen(true)} className="py-3 font-bold">
            {t('ratio.setup.printWorksheet')}
          </Button>
          <Button
            onClick={start}
            className="py-3 md:py-4 text-lg md:text-2xl font-bold bg-gradient-to-b from-primary via-primary/85 to-primary/65 shadow-button transition-all hover:translate-y-[-2px]"
            size="lg"
          >
            {t('game.setup.start')}
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
        summary={buildRatioSummary(skills, difficulty)}
        onDownload={handlePrintDownload}
      />
    </div>
  );
}
