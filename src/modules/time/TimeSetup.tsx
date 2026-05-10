import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { UserSelector } from '@/components/UserSelector';
import { PrintWorksheetModal } from '@/components/PrintWorksheetModal';
import type { UserProfile } from '@/lib/userStorage';
import type {
  TimeArithDifficulty,
  TimeFormat,
  TimePrecision,
  TimeSettings,
  TimeSkill,
} from './logic';
import {
  generateTimeQuestions,
  TIME_PRECISION_LABEL,
  TIME_PRECISION_OPTIONS,
  TIME_SKILL_LABEL,
  TIME_SKILL_OPTIONS,
} from './logic';
import { generateTimePdf } from './pdf';
import {
  getSavedTimeSettings,
  saveTimeSettings,
  getSavedTimePrintConfig,
  saveTimePrintConfig,
} from './storage';
import {
  PRINT_PAGE_OPTIONS,
  PRINT_PER_PAGE_OPTIONS,
  buildTimeSummary,
} from './printConfig';

interface Props {
  onStart: (s: TimeSettings) => void;
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

const ARITH_DIFFICULTY_HINTS: Record<TimeArithDifficulty, string> = {
  easy: 'Within the same hour',
  medium: 'Crosses the hour',
  hard: 'Crosses midnight',
};

type SkillId = Exclude<TimeSkill, 'all'>;
type SkillSelection = SkillId | 'all';

const buttonClass = (active: boolean) =>
  cn(
    'rounded-lg md:rounded-xl min-h-[44px] md:h-[42px] flex items-center justify-center text-center font-bold transition-all',
    'hover:scale-[1.02] active:scale-[0.98]',
    active
      ? 'bg-gradient-to-b from-primary via-primary/90 to-primary/70 text-primary-foreground shadow-xl hover:shadow-2xl'
      : 'bg-gradient-to-b from-secondary via-secondary/85 to-secondary/65 text-muted-foreground hover:from-secondary/80 hover:to-secondary/60 border border-card-border shadow-lg'
  );

// Multi-select chip picker over a fixed list of precision values. Always
// non-empty: the last selected chip refuses to deselect so generation
// always has something to pick from.
interface PrecisionChipPickerProps {
  selected: TimePrecision[];
  onChange: (next: TimePrecision[]) => void;
}

function PrecisionChipPicker({ selected, onChange }: PrecisionChipPickerProps) {
  const orderIndex = new Map<TimePrecision, number>(
    TIME_PRECISION_OPTIONS.map((p, i) => [p, i])
  );
  const isSelected = (p: TimePrecision) => selected.includes(p);
  const toggle = (p: TimePrecision) => {
    if (isSelected(p)) {
      if (selected.length === 1) return; // refuse to empty
      onChange(
        selected.filter(x => x !== p).sort((a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0))
      );
    } else {
      onChange(
        [...selected, p].sort((a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0))
      );
    }
  };
  return (
    <div className="grid grid-cols-5 gap-1 md:gap-2">
      {TIME_PRECISION_OPTIONS.map(p => (
        <button
          key={p}
          type="button"
          onClick={() => toggle(p)}
          aria-pressed={isSelected(p)}
          className={buttonClass(isSelected(p))}
        >
          <span className="text-[13px] md:text-[15px]">{TIME_PRECISION_LABEL[p]}</span>
        </button>
      ))}
    </div>
  );
}

// Skill picker. Mirrors the arithmetic "Operation" card pattern: three chip
// buttons {Read clock, Time arithmetic, All}. "All" is a shortcut that
// selects both individual skills; clicking an individual chip narrows to
// just that skill. Selection is always non-empty.
interface SkillPickerProps {
  selected: SkillId[];
  onChange: (next: SkillId[]) => void;
}

function SkillPicker({ selected, onChange }: SkillPickerProps) {
  const isAll = selected.length === TIME_SKILL_OPTIONS.length;
  const handleClick = (id: SkillSelection) => {
    if (id === 'all') {
      onChange([...TIME_SKILL_OPTIONS]);
      return;
    }
    onChange([id]);
  };
  const isActive = (id: SkillSelection): boolean => {
    if (id === 'all') return isAll;
    return !isAll && selected.includes(id);
  };
  const items: Array<{ id: SkillSelection; label: string }> = [
    { id: 'read', label: TIME_SKILL_LABEL.read },
    { id: 'arith', label: TIME_SKILL_LABEL.arith },
    { id: 'all', label: 'All' },
  ];
  return (
    <div className="grid grid-cols-3 gap-1 md:gap-2">
      {items.map(it => (
        <button
          key={it.id}
          type="button"
          onClick={() => handleClick(it.id)}
          aria-pressed={isActive(it.id)}
          className={buttonClass(isActive(it.id))}
        >
          <span className="text-[13px] md:text-[15px]">{it.label}</span>
        </button>
      ))}
    </div>
  );
}

export function TimeSetup({
  onStart,
  currentUser,
  onUserChange,
  onNewUser,
  onNavigateToHub,
  autoOpenPrint = false,
}: Props) {
  const [skills, setSkills] = useState<SkillId[]>(['read']);
  const [precisions, setPrecisions] = useState<TimePrecision[]>(['hour']);
  const [format, setFormat] = useState<TimeFormat>('12h');
  const [arithDifficulty, setArithDifficulty] = useState<TimeArithDifficulty>('easy');
  const [gameMode, setGameMode] = useState<'questions' | 'time'>('questions');
  const [questionCount, setQuestionCount] = useState(10);
  const [timeLimit, setTimeLimit] = useState(180);
  const [isLoaded, setIsLoaded] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [printConfig, setPrintConfig] = useState({ pageCount: 1, questionsPerPage: 15 });

  useEffect(() => {
    setIsLoaded(false);
    const s = getSavedTimeSettings(currentUser?.id);
    setSkills(s.skills);
    setPrecisions(s.precisions);
    setFormat(s.format);
    setArithDifficulty(s.arithDifficulty);
    setGameMode(s.gameMode);
    setQuestionCount(s.questionCount);
    setTimeLimit(s.timeLimit);
    setPrintConfig(getSavedTimePrintConfig(currentUser?.id));
    setIsLoaded(true);
  }, [currentUser?.id]);

  useEffect(() => {
    if (!isLoaded) return;
    saveTimeSettings(
      {
        skills,
        precisions,
        format,
        arithDifficulty,
        gameMode,
        questionCount,
        timeLimit,
      },
      currentUser?.id
    );
  }, [
    isLoaded,
    skills,
    precisions,
    format,
    arithDifficulty,
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
      precisions,
      format,
      arithDifficulty,
      gameMode,
      questionCount,
      timeLimit,
    });

  // Visibility for the arith-only difficulty card.
  const showArithDifficulty = skills.includes('arith');

  const handlePrintDownload = (pages: number, perPage: number, name: string) => {
    const settings: TimeSettings = {
      skills,
      precisions,
      format,
      arithDifficulty,
      gameMode: 'questions',
      questionCount: perPage,
      timeLimit: 0,
    };
    const pagesArr = Array.from({ length: pages }, () => generateTimeQuestions(settings, perPage));
    const subtitle = `${perPage} Questions per page — ${buildTimeSummary(precisions, format, skills)}`;
    const doc = generateTimePdf({
      pages: pagesArr,
      title: 'Maths Challenge — Time',
      subtitle,
      studentName: name || undefined,
      includeAnswerKey: true,
    });
    doc.save('maths-time.pdf');
    const next = { pageCount: pages, questionsPerPage: perPage };
    setPrintConfig(next);
    saveTimePrintConfig(next, currentUser?.id);
  };

  const summaryLine = useMemo(
    () => buildTimeSummary(precisions, format, skills),
    [precisions, format, skills]
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
          Time Practice
        </h1>
        <p className="text-center text-[12px] md:text-[17px] text-muted-foreground mb-3">
          {currentUser ? `Hi ${currentUser.name}! ` : ''}Read the clock or add minutes
        </p>

        <div className="mb-3 md:mb-6 flex items-center justify-end">
          <UserSelector currentUser={currentUser} onUserChange={onUserChange} onNewUser={onNewUser} />
        </div>

        <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
          <h2 className="mb-2 md:mb-3 text-[14px] md:text-[20px] font-semibold text-foreground">Skill</h2>
          <SkillPicker selected={skills} onChange={setSkills} />
        </Card>

        <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
          <h2 className="mb-2 md:mb-3 text-[14px] md:text-[20px] font-semibold text-foreground">Precision</h2>
          <PrecisionChipPicker selected={precisions} onChange={setPrecisions} />
        </Card>

        <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
          <h2 className="mb-2 md:mb-3 text-[14px] md:text-[20px] font-semibold text-foreground">Format</h2>
          <div className="grid grid-cols-3 gap-2">
            {([
              { id: '12h', label: '12-hour' },
              { id: '24h', label: '24-hour' },
              { id: 'both', label: 'Both' },
            ] as const).map(f => (
              <button key={f.id} onClick={() => setFormat(f.id)} className={buttonClass(format === f.id)}>
                <span className="text-[13px] md:text-[16px]">{f.label}</span>
              </button>
            ))}
          </div>
        </Card>

        {showArithDifficulty && (
          <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
            <h2 className="mb-2 md:mb-3 text-[14px] md:text-[20px] font-semibold text-foreground">
              Time arithmetic difficulty
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {(['easy', 'medium', 'hard'] as const).map(d => (
                <div key={d} className="flex flex-col gap-1 md:gap-1.5">
                  <button
                    onClick={() => setArithDifficulty(d)}
                    className={buttonClass(arithDifficulty === d)}
                  >
                    <span className="text-[13px] md:text-[16px]">
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </span>
                  </button>
                  <p className="text-[10px] md:text-[12px] text-foreground/70 text-center leading-tight">
                    {ARITH_DIFFICULTY_HINTS[d]}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

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
        summary={summaryLine}
        onDownload={handlePrintDownload}
      />
    </div>
  );
}
