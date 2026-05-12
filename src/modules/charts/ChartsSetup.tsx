import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { UserSelector } from '@/components/UserSelector';
import { PrintWorksheetModal } from '@/components/PrintWorksheetModal';
import type { UserProfile } from '@/lib/userStorage';
import type { ChartSettings, ChartSkill } from './logic';
import {
  CHART_MAX_VALUE_OPTIONS,
  CHART_NUM_CATEGORIES_OPTIONS,
  CHART_SKILL_LABEL,
  CHART_SKILL_OPTIONS,
  generateChartQuestions,
} from './logic';
import { generateChartsPdf } from './pdf';
import {
  getSavedChartsSettings,
  saveChartsSettings,
  getSavedChartsPrintConfig,
  saveChartsPrintConfig,
} from './storage';
import {
  PRINT_PAGE_OPTIONS,
  PRINT_PER_PAGE_OPTIONS,
  buildChartsSummary,
} from './printConfig';

interface Props {
  onStart: (s: ChartSettings) => void;
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

// Multi-select chip picker over the fixed skill set. Refuses to empty.
interface SkillChipPickerProps {
  selected: ChartSkill[];
  onChange: (next: ChartSkill[]) => void;
}

function SkillChipPicker({ selected, onChange }: SkillChipPickerProps) {
  const orderIndex = new Map<ChartSkill, number>(
    CHART_SKILL_OPTIONS.map((s, i) => [s, i])
  );
  const isSelected = (s: ChartSkill) => selected.includes(s);
  const toggle = (s: ChartSkill) => {
    if (isSelected(s)) {
      if (selected.length === 1) return;
      onChange(
        selected
          .filter(x => x !== s)
          .sort((a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0))
      );
    } else {
      onChange(
        [...selected, s].sort((a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0))
      );
    }
  };
  return (
    <div className="grid grid-cols-3 md:grid-cols-4 gap-1 md:gap-2">
      {CHART_SKILL_OPTIONS.map(s => (
        <button
          key={s}
          type="button"
          onClick={() => toggle(s)}
          aria-pressed={isSelected(s)}
          className={buttonClass(isSelected(s))}
        >
          <span className="text-[11px] md:text-[12px]">{CHART_SKILL_LABEL[s]}</span>
        </button>
      ))}
    </div>
  );
}

export function ChartsSetup({
  onStart,
  currentUser,
  onUserChange,
  onNewUser,
  onNavigateToHub,
  autoOpenPrint = false,
}: Props) {
  const [skills, setSkills] = useState<ChartSkill[]>(['read-bar']);
  const [maxValue, setMaxValue] = useState<number>(50);
  const [numCategories, setNumCategories] = useState<number>(5);
  const [gameMode, setGameMode] = useState<'questions' | 'time'>('questions');
  const [questionCount, setQuestionCount] = useState(10);
  const [timeLimit, setTimeLimit] = useState(180);
  const [isLoaded, setIsLoaded] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [printConfig, setPrintConfig] = useState({ pageCount: 1, questionsPerPage: 6 });

  useEffect(() => {
    setIsLoaded(false);
    const s = getSavedChartsSettings(currentUser?.id);
    setSkills(s.skills);
    setMaxValue(s.maxValue);
    setNumCategories(s.numCategories);
    setGameMode(s.gameMode);
    setQuestionCount(s.questionCount);
    setTimeLimit(s.timeLimit);
    setPrintConfig(getSavedChartsPrintConfig(currentUser?.id));
    setIsLoaded(true);
  }, [currentUser?.id]);

  useEffect(() => {
    if (!isLoaded) return;
    saveChartsSettings(
      {
        skills,
        maxValue,
        numCategories,
        gameMode,
        questionCount,
        timeLimit,
      },
      currentUser?.id
    );
  }, [isLoaded, skills, maxValue, numCategories, gameMode, questionCount, timeLimit, currentUser?.id]);

  useEffect(() => {
    if (autoOpenPrint && isLoaded) setPrintOpen(true);
  }, [autoOpenPrint, isLoaded]);

  const start = () =>
    onStart({
      skills,
      maxValue,
      numCategories,
      gameMode,
      questionCount,
      timeLimit,
    });

  const handlePrintDownload = (pages: number, perPage: number, name: string) => {
    const settings: ChartSettings = {
      skills,
      maxValue,
      numCategories,
      gameMode: 'questions',
      questionCount: perPage,
      timeLimit: 0,
    };
    const pagesArr = Array.from({ length: pages }, () => generateChartQuestions(settings, perPage));
    const subtitle = `${perPage} Questions per page — ${buildChartsSummary(skills, maxValue, numCategories)}`;
    const doc = generateChartsPdf({
      pages: pagesArr,
      title: 'Maths Challenge — Charts',
      subtitle,
      studentName: name || undefined,
      includeAnswerKey: true,
    });
    doc.save('maths-charts.pdf');
    const next = { pageCount: pages, questionsPerPage: perPage };
    setPrintConfig(next);
    saveChartsPrintConfig(next, currentUser?.id);
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
          Charts Practice
        </h1>
        <p className="text-center text-[12px] md:text-[17px] text-muted-foreground mb-3">
          {currentUser ? `Hi ${currentUser.name}! ` : ''}Read the bar chart, type the answer
        </p>

        <div className="mb-3 md:mb-6 flex items-center justify-end">
          <UserSelector currentUser={currentUser} onUserChange={onUserChange} onNewUser={onNewUser} />
        </div>

        <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
          <h2 className="mb-2 md:mb-3 text-[14px] md:text-[20px] font-semibold text-foreground">Skill</h2>
          <SkillChipPicker selected={skills} onChange={setSkills} />
        </Card>

        <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
          <h2 className="mb-2 md:mb-3 text-[14px] md:text-[20px] font-semibold text-foreground">Max value</h2>
          <div className="grid grid-cols-4 gap-2">
            {CHART_MAX_VALUE_OPTIONS.map(v => (
              <button
                key={v}
                onClick={() => setMaxValue(v)}
                className={buttonClass(maxValue === v)}
              >
                <span className="text-[13px] md:text-[16px]">{v}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
          <h2 className="mb-2 md:mb-3 text-[14px] md:text-[20px] font-semibold text-foreground">Categories</h2>
          <div className="grid grid-cols-4 gap-2">
            {CHART_NUM_CATEGORIES_OPTIONS.map(v => (
              <button
                key={v}
                onClick={() => setNumCategories(v)}
                className={buttonClass(numCategories === v)}
              >
                <span className="text-[13px] md:text-[16px]">{v}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
          <h2 className="mb-2 md:mb-3 text-[14px] md:text-[20px] font-semibold text-foreground">Game Mode</h2>
          <div className="flex gap-2 mb-3">
            <button onClick={() => setGameMode('questions')} className={cn('flex-1', buttonClass(gameMode === 'questions'))}>
              <span className="text-[13px] md:text-[16px]">Questions</span>
            </button>
            <button onClick={() => setGameMode('time')} className={cn('flex-1', buttonClass(gameMode === 'time'))}>
              <span className="text-[13px] md:text-[16px]">Timed</span>
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
        summary={buildChartsSummary(skills, maxValue, numCategories)}
        onDownload={handlePrintDownload}
      />
    </div>
  );
}
