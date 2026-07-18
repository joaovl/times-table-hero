import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { UserSelector } from '@/components/UserSelector';
import { PrintWorksheetModal } from '@/components/PrintWorksheetModal';
import type { UserProfile } from '@/lib/userStorage';
import type { FractionSettings, FractionSkill } from './logic';
import {
  ALL_SKILLS,
  DENOMINATOR_OPTIONS,
  skillLabel,
  generateFractionQuestions,
} from './logic';
import { useT } from '@/lib/i18n/react';
import { generateFractionsPdf } from './pdf';
import {
  getSavedFractionSettings,
  saveFractionSettings,
  getSavedFractionPrintConfig,
  saveFractionPrintConfig,
} from './storage';
import {
  PRINT_PAGE_OPTIONS,
  PRINT_PER_PAGE_OPTIONS,
  buildFractionsSummary,
} from './printConfig';

interface Props {
  onStart: (s: FractionSettings) => void;
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

const buttonClass = (active: boolean) =>
  cn(
    'rounded-lg md:rounded-xl min-h-[44px] md:h-[42px] flex items-center justify-center text-center font-bold transition-all',
    'hover:scale-[1.02] active:scale-[0.98]',
    active
      ? 'bg-gradient-to-b from-primary via-primary/90 to-primary/70 text-primary-foreground shadow-xl hover:shadow-2xl'
      : 'bg-gradient-to-b from-secondary via-secondary/85 to-secondary/65 text-muted-foreground hover:from-secondary/80 hover:to-secondary/60 border border-card-border shadow-lg'
  );

export function FractionsSetup({
  onStart,
  currentUser,
  onUserChange,
  onNewUser,
  onNavigateToHub,
  autoOpenPrint = false,
}: Props) {
  const { t } = useT();
  const [skills, setSkills] = useState<FractionSkill[]>(['add-same']);
  const [denominators, setDenominators] = useState<number[]>([2, 3, 4]);
  const [simplify, setSimplify] = useState(true);
  const [gameMode, setGameMode] = useState<'questions' | 'time'>('questions');
  const [questionCount, setQuestionCount] = useState(10);
  const [timeLimit, setTimeLimit] = useState(180);
  const [isLoaded, setIsLoaded] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [printConfig, setPrintConfig] = useState({ pageCount: 1, questionsPerPage: 18 });

  useEffect(() => {
    setIsLoaded(false);
    const s = getSavedFractionSettings(currentUser?.id);
    setSkills(s.skills);
    setDenominators(s.denominators);
    setSimplify(s.simplify);
    setGameMode(s.gameMode);
    setQuestionCount(s.questionCount);
    setTimeLimit(s.timeLimit);
    setPrintConfig(getSavedFractionPrintConfig(currentUser?.id));
    setIsLoaded(true);
  }, [currentUser?.id]);

  useEffect(() => {
    if (!isLoaded) return;
    saveFractionSettings(
      { skills, denominators, simplify, gameMode, questionCount, timeLimit },
      currentUser?.id
    );
  }, [
    isLoaded,
    skills,
    denominators,
    simplify,
    gameMode,
    questionCount,
    timeLimit,
    currentUser?.id,
  ]);

  useEffect(() => {
    if (autoOpenPrint && isLoaded) setPrintOpen(true);
  }, [autoOpenPrint, isLoaded]);

  const toggleSkill = (s: FractionSkill) => {
    setSkills(prev => {
      if (prev.includes(s)) {
        if (prev.length === 1) return prev;
        return prev.filter(x => x !== s);
      }
      // Preserve canonical order from ALL_SKILLS.
      return ALL_SKILLS.filter(x => prev.includes(x) || x === s);
    });
  };

  const toggleDenom = (d: number) => {
    setDenominators(prev => {
      if (prev.includes(d)) {
        if (prev.length === 1) return prev;
        return prev.filter(x => x !== d).sort((a, b) => a - b);
      }
      return [...prev, d].sort((a, b) => a - b);
    });
  };

  // Diff-denom skills need at least two distinct denominators. Surface a hint
  // when the kid picks only one denom but selects a diff-denom skill.
  const hasDiffSkill = skills.some(s => s === 'add-diff' || s === 'sub-diff');
  const denomWarning = hasDiffSkill && denominators.length < 2;

  const start = () =>
    onStart({ skills, denominators, simplify, gameMode, questionCount, timeLimit });

  const handlePrintDownload = (pages: number, perPage: number, name: string) => {
    const settings: FractionSettings = {
      skills,
      denominators,
      simplify,
      gameMode: 'questions',
      questionCount: perPage,
      timeLimit: 0,
    };
    const pagesArr = Array.from({ length: pages }, () =>
      generateFractionQuestions(settings, perPage)
    );
    const subtitle = buildFractionsSummary(skills, denominators, simplify);
    const doc = generateFractionsPdf({
      pages: pagesArr,
      title: 'Maths Challenge — Fractions',
      subtitle: `${perPage} Questions per page — ${subtitle}`,
      studentName: name || undefined,
      includeAnswerKey: true,
    });
    doc.save('maths-fractions.pdf');
    const next = { pageCount: pages, questionsPerPage: perPage };
    setPrintConfig(next);
    saveFractionPrintConfig(next, currentUser?.id);
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
          {t('fractions.setup.title')}
        </h1>
        <p className="text-center text-[12px] md:text-[17px] text-muted-foreground mb-3">
          {currentUser ? t('fractions.setup.hiName', { name: currentUser.name }) : ''}{t('fractions.setup.subtitle')}
        </p>

        <div className="mb-3 md:mb-6 flex items-center justify-end">
          <UserSelector currentUser={currentUser} onUserChange={onUserChange} onNewUser={onNewUser} />
        </div>

        <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
          <h2 className="mb-2 md:mb-3 text-[14px] md:text-[20px] font-semibold text-foreground">
            {t('fractions.setup.skills')}
          </h2>
          <div className="grid grid-cols-2 gap-1 md:gap-2">
            {ALL_SKILLS.map(s => (
              <button
                key={s}
                onClick={() => toggleSkill(s)}
                aria-pressed={skills.includes(s)}
                className={buttonClass(skills.includes(s))}
              >
                <span className="text-[12px] md:text-[14px] px-2 text-center">{skillLabel(s)}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
          <h2 className="mb-2 md:mb-3 text-[14px] md:text-[20px] font-semibold text-foreground">
            {t('fractions.setup.denominators')}
          </h2>
          <div className="grid grid-cols-6 gap-1 md:gap-2">
            {DENOMINATOR_OPTIONS.map(d => (
              <button
                key={d}
                onClick={() => toggleDenom(d)}
                aria-pressed={denominators.includes(d)}
                className={buttonClass(denominators.includes(d))}
              >
                <span className="text-[15px] md:text-[18px]">{d}</span>
              </button>
            ))}
          </div>
          {denomWarning && (
            <p className="text-[11px] md:text-[13px] text-destructive mt-2 text-center">
              {t('fractions.setup.denomWarning')}
            </p>
          )}
        </Card>

        <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
          <h2 className="mb-2 md:mb-3 text-[14px] md:text-[20px] font-semibold text-foreground">
            {t('fractions.setup.simplifyAnswers')}
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setSimplify(true)} className={buttonClass(simplify)}>
              <span className="text-[13px] md:text-[16px]">{t('fractions.setup.on')}</span>
            </button>
            <button onClick={() => setSimplify(false)} className={buttonClass(!simplify)}>
              <span className="text-[13px] md:text-[16px]">{t('fractions.setup.off')}</span>
            </button>
          </div>
          <p className="text-[10px] md:text-[12px] text-foreground/70 text-center mt-2">
            {simplify ? t('fractions.setup.simplifyOnHelp') : t('fractions.setup.simplifyOffHelp')}
          </p>
        </Card>

        <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
          <h2 className="mb-2 md:mb-3 text-[14px] md:text-[20px] font-semibold text-foreground">{t('fractions.setup.gameMode')}</h2>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setGameMode('questions')}
              className={cn('flex-1', buttonClass(gameMode === 'questions'))}
            >
              <span className="text-[13px] md:text-[16px]">{t('fractions.setup.questions')}</span>
            </button>
            <button
              onClick={() => setGameMode('time')}
              className={cn('flex-1', buttonClass(gameMode === 'time'))}
            >
              <span className="text-[13px] md:text-[16px]">{t('fractions.setup.timed')}</span>
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
            {t('fractions.setup.printWorksheet')}
          </Button>
          <Button
            onClick={start}
            className="py-3 md:py-4 text-lg md:text-2xl font-bold bg-gradient-to-b from-primary via-primary/85 to-primary/65 shadow-button transition-all hover:translate-y-[-2px]"
            size="lg"
            disabled={denomWarning}
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
        summary={buildFractionsSummary(skills, denominators, simplify)}
        onDownload={handlePrintDownload}
      />
    </div>
  );
}
