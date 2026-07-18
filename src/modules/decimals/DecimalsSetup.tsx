import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { UserSelector } from '@/components/UserSelector';
import { PrintWorksheetModal } from '@/components/PrintWorksheetModal';
import type { UserProfile } from '@/lib/userStorage';
import type { DecimalsSettings, DecimalsSkill } from './logic';
import {
  ALL_SKILLS,
  skillLabel,
  generateDecimalsQuestions,
} from './logic';
import { useT } from '@/lib/i18n/react';
import { generateDecimalsPdf } from './pdf';
import {
  getSavedDecimalsSettings,
  saveDecimalsSettings,
  getSavedDecimalsPrintConfig,
  saveDecimalsPrintConfig,
} from './storage';
import {
  PRINT_PAGE_OPTIONS,
  PRINT_PER_PAGE_OPTIONS,
  buildDecimalsSummary,
} from './printConfig';

interface Props {
  onStart: (s: DecimalsSettings) => void;
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

export function DecimalsSetup({
  onStart,
  currentUser,
  onUserChange,
  onNewUser,
  onNavigateToHub,
  autoOpenPrint = false,
}: Props) {
  const { t } = useT();
  const [skills, setSkills] = useState<DecimalsSkill[]>(['identify-tenths']);
  const [gameMode, setGameMode] = useState<'questions' | 'time'>('questions');
  const [questionCount, setQuestionCount] = useState(10);
  const [timeLimit, setTimeLimit] = useState(180);
  const [isLoaded, setIsLoaded] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [printConfig, setPrintConfig] = useState({ pageCount: 1, questionsPerPage: 20 });

  useEffect(() => {
    setIsLoaded(false);
    const s = getSavedDecimalsSettings(currentUser?.id);
    setSkills(s.skills);
    setGameMode(s.gameMode);
    setQuestionCount(s.questionCount);
    setTimeLimit(s.timeLimit);
    setPrintConfig(getSavedDecimalsPrintConfig(currentUser?.id));
    setIsLoaded(true);
  }, [currentUser?.id]);

  useEffect(() => {
    if (!isLoaded) return;
    saveDecimalsSettings(
      { skills, gameMode, questionCount, timeLimit },
      currentUser?.id
    );
  }, [isLoaded, skills, gameMode, questionCount, timeLimit, currentUser?.id]);

  useEffect(() => {
    if (autoOpenPrint && isLoaded) setPrintOpen(true);
  }, [autoOpenPrint, isLoaded]);

  const toggleSkill = (s: DecimalsSkill) => {
    setSkills(prev => {
      if (prev.includes(s)) {
        if (prev.length === 1) return prev;
        return prev.filter(x => x !== s);
      }
      return ALL_SKILLS.filter(x => prev.includes(x) || x === s);
    });
  };

  const start = () =>
    onStart({ skills, gameMode, questionCount, timeLimit });

  const handlePrintDownload = (pages: number, perPage: number, name: string) => {
    const settings: DecimalsSettings = {
      skills,
      gameMode: 'questions',
      questionCount: perPage,
      timeLimit: 0,
    };
    const pagesArr = Array.from({ length: pages }, () =>
      generateDecimalsQuestions(settings, perPage)
    );
    const subtitle = buildDecimalsSummary(skills);
    const doc = generateDecimalsPdf({
      pages: pagesArr,
      title: 'Maths Challenge - Decimals & Percentages',
      subtitle: `${perPage} Questions per page - ${subtitle}`,
      studentName: name || undefined,
      includeAnswerKey: true,
    });
    doc.save('maths-decimals.pdf');
    const next = { pageCount: pages, questionsPerPage: perPage };
    setPrintConfig(next);
    saveDecimalsPrintConfig(next, currentUser?.id);
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
          {t('decimals.setup.title')}
        </h1>
        <p className="text-center text-[12px] md:text-[17px] text-muted-foreground mb-3">
          {currentUser ? t('decimals.setup.hiName', { name: currentUser.name }) : ''}{t('decimals.setup.subtitle')}
        </p>

        <div className="mb-3 md:mb-6 flex items-center justify-end">
          <UserSelector currentUser={currentUser} onUserChange={onUserChange} onNewUser={onNewUser} />
        </div>

        <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
          <h2 className="mb-2 md:mb-3 text-[14px] md:text-[20px] font-semibold text-foreground">
            {t('decimals.setup.skills')}
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
          <h2 className="mb-2 md:mb-3 text-[14px] md:text-[20px] font-semibold text-foreground">{t('decimals.setup.gameMode')}</h2>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setGameMode('questions')}
              className={cn('flex-1', buttonClass(gameMode === 'questions'))}
            >
              <span className="text-[13px] md:text-[16px]">{t('decimals.setup.questions')}</span>
            </button>
            <button
              onClick={() => setGameMode('time')}
              className={cn('flex-1', buttonClass(gameMode === 'time'))}
            >
              <span className="text-[13px] md:text-[16px]">{t('decimals.setup.timed')}</span>
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
            {t('decimals.setup.printWorksheet')}
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
        summary={buildDecimalsSummary(skills)}
        onDownload={handlePrintDownload}
      />
    </div>
  );
}
