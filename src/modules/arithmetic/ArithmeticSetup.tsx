import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { UserSelector } from '@/components/UserSelector';
import { PrintWorksheetModal } from '@/components/PrintWorksheetModal';
import type { UserProfile } from '@/lib/userStorage';
import type { ArithOp, ArithSettings, Difficulty } from './logic';
import {
  generateArithQuestions,
  MULTIPLY_DIGIT_OPTIONS,
  multiplyExample,
  addSubExample,
  divideExample,
} from './logic';
import { generateArithPdf } from './pdf';
import {
  getSavedArithSettings,
  saveArithSettings,
  getSavedArithPrintConfig,
  saveArithPrintConfig,
} from './storage';
import {
  PRINT_PAGE_OPTIONS,
  perPageOptionsForOp,
  buildArithSummary,
  formatDigitSet,
} from './printConfig';
import { useT } from '@/lib/i18n/react';
import type { MessageKey } from '@/lib/i18n/i18n';

interface Props {
  onStart: (s: ArithSettings) => void;
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

const DIFFICULTY_HINT_KEYS: Record<ArithOp, [MessageKey, MessageKey, MessageKey]> = {
  add: ['arithmetic.setup.hint.noCarry', 'arithmetic.setup.hint.oneCarry', 'arithmetic.setup.hint.multipleCarries'],
  subtract: ['arithmetic.setup.hint.noBorrow', 'arithmetic.setup.hint.oneBorrow', 'arithmetic.setup.hint.multipleBorrows'],
  multiply: ['arithmetic.setup.hint.oneByOneDigit', 'arithmetic.setup.hint.oneByTwoDigit', 'arithmetic.setup.hint.twoByTwoDigit'],
  divide: ['arithmetic.setup.hint.easy', 'arithmetic.setup.hint.medium', 'arithmetic.setup.hint.hard'],
  all: ['arithmetic.setup.hint.easy', 'arithmetic.setup.hint.medium', 'arithmetic.setup.hint.hard'],
};

const DIFFICULTY_LABEL_KEY: Record<Difficulty, MessageKey> = {
  easy: 'arithmetic.setup.difficultyEasy',
  medium: 'arithmetic.setup.difficultyMedium',
  hard: 'arithmetic.setup.difficultyHard',
};

const buttonClass = (active: boolean) =>
  cn(
    'rounded-lg md:rounded-xl min-h-[44px] md:h-[42px] flex items-center justify-center text-center font-bold transition-all',
    'hover:scale-[1.02] active:scale-[0.98]',
    active
      ? 'bg-gradient-to-b from-primary via-primary/90 to-primary/70 text-primary-foreground shadow-xl hover:shadow-2xl'
      : 'bg-gradient-to-b from-secondary via-secondary/85 to-secondary/65 text-muted-foreground hover:from-secondary/80 hover:to-secondary/60 border border-card-border shadow-lg'
  );

const opLabel = (op: ArithOp): string =>
  op === 'add'
    ? '+'
    : op === 'subtract'
      ? '−'
      : op === 'multiply'
        ? '×'
        : op === 'divide'
          ? '÷'
          : '+−×÷';

// Multi-select chip picker over a digit set. Always non-empty: the last
// selected chip refuses to deselect, so generation always has something to
// pick from. Sorted ascending on every change.
interface DigitChipPickerProps {
  label: string;
  options: ReadonlyArray<number>;
  selected: number[];
  onChange: (next: number[]) => void;
}

function DigitChipPicker({ label, options, selected, onChange }: DigitChipPickerProps) {
  const isSelected = (d: number) => selected.includes(d);
  const toggle = (d: number) => {
    if (isSelected(d)) {
      // Refuse to deselect if it's the last remaining chip.
      if (selected.length === 1) return;
      onChange(selected.filter(x => x !== d).sort((a, b) => a - b));
    } else {
      onChange([...selected, d].sort((a, b) => a - b));
    }
  };
  return (
    <>
      <p className="text-[12px] md:text-[14px] text-muted-foreground mb-1">{label}</p>
      <div className="grid grid-cols-5 gap-1 md:gap-2 mb-2">
        {options.map(d => (
          <button
            key={`${label}-${d}`}
            type="button"
            onClick={() => toggle(d)}
            aria-pressed={isSelected(d)}
            className={buttonClass(isSelected(d))}
          >
            <span className="text-[15px] md:text-[18px]">{d}</span>
          </button>
        ))}
      </div>
    </>
  );
}

const DIGIT_CHIP_OPTIONS = MULTIPLY_DIGIT_OPTIONS;

export function ArithmeticSetup({
  onStart,
  currentUser,
  onUserChange,
  onNewUser,
  onNavigateToHub,
  autoOpenPrint = false,
}: Props) {
  const { t } = useT();
  const [operation, setOperation] = useState<ArithOp>('add');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [addSubFirstDigits, setAddSubFirstDigits] = useState<number[]>([2]);
  const [addSubSecondDigits, setAddSubSecondDigits] = useState<number[]>([2]);
  const [multiplyFirstDigits, setMultiplyFirstDigits] = useState<number[]>([2]);
  const [multiplySecondDigits, setMultiplySecondDigits] = useState<number[]>([1]);
  const [divideFirstDigits, setDivideFirstDigits] = useState<number[]>([2]);
  const [divideSecondDigits, setDivideSecondDigits] = useState<number[]>([1]);
  const [allowRemainders, setAllowRemainders] = useState<boolean>(true);
  const [gameMode, setGameMode] = useState<'questions' | 'time'>('questions');
  const [questionCount, setQuestionCount] = useState(10);
  const [timeLimit, setTimeLimit] = useState(180);
  const [isLoaded, setIsLoaded] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [printConfig, setPrintConfig] = useState({ pageCount: 1, questionsPerPage: 30 });

  const perPageOptions = useMemo(() => perPageOptionsForOp(operation), [operation]);


  useEffect(() => {
    setIsLoaded(false);
    const s = getSavedArithSettings(currentUser?.id);
    setOperation(s.operation);
    setDifficulty(s.difficulty);
    setAddSubFirstDigits(s.addSubFirstDigits);
    setAddSubSecondDigits(s.addSubSecondDigits);
    setMultiplyFirstDigits(s.multiplyFirstDigits);
    setMultiplySecondDigits(s.multiplySecondDigits);
    setDivideFirstDigits(s.divideFirstDigits);
    setDivideSecondDigits(s.divideSecondDigits);
    setAllowRemainders(s.allowRemainders);
    setGameMode(s.gameMode);
    setQuestionCount(s.questionCount);
    setTimeLimit(s.timeLimit);
    setPrintConfig(getSavedArithPrintConfig(currentUser?.id));
    setIsLoaded(true);
  }, [currentUser?.id]);

  useEffect(() => {
    if (!isLoaded) return;
    saveArithSettings(
      {
        operation,
        difficulty,
        addSubFirstDigits,
        addSubSecondDigits,
        multiplyFirstDigits,
        multiplySecondDigits,
        divideFirstDigits,
        divideSecondDigits,
        allowRemainders,
        gameMode,
        questionCount,
        timeLimit,
      },
      currentUser?.id
    );
  }, [
    isLoaded,
    operation,
    difficulty,
    addSubFirstDigits,
    addSubSecondDigits,
    multiplyFirstDigits,
    multiplySecondDigits,
    divideFirstDigits,
    divideSecondDigits,
    allowRemainders,
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
      operation,
      difficulty,
      addSubFirstDigits,
      addSubSecondDigits,
      multiplyFirstDigits,
      multiplySecondDigits,
      divideFirstDigits,
      divideSecondDigits,
      allowRemainders,
      gameMode,
      questionCount,
      timeLimit,
    });

  const handlePrintDownload = (pages: number, perPage: number, name: string) => {
    const settings: ArithSettings = {
      operation,
      difficulty,
      addSubFirstDigits,
      addSubSecondDigits,
      multiplyFirstDigits,
      multiplySecondDigits,
      divideFirstDigits,
      divideSecondDigits,
      allowRemainders,
      gameMode: 'questions',
      questionCount: perPage,
      timeLimit: 0,
    };
    const pagesArr = Array.from({ length: pages }, () => generateArithQuestions(settings, perPage));
    const subtitleParts: string[] = [opLabel(operation)];
    if (operation === 'add' || operation === 'subtract' || operation === 'all') {
      subtitleParts.push(difficulty);
      subtitleParts.push(
        `${formatDigitSet(addSubFirstDigits)} + ${formatDigitSet(addSubSecondDigits)}`
      );
    }
    if (operation === 'multiply' || operation === 'all') {
      subtitleParts.push(
        `${formatDigitSet(multiplyFirstDigits)} × ${formatDigitSet(multiplySecondDigits)}`
      );
    }
    if (operation === 'divide' || operation === 'all') {
      const r = allowRemainders ? ' (with remainders)' : '';
      subtitleParts.push(
        `${formatDigitSet(divideFirstDigits)} ÷ ${formatDigitSet(divideSecondDigits)}${r}`
      );
    }
    const subtitle = subtitleParts.join(' • ');
    const doc = generateArithPdf({
      pages: pagesArr,
      title: 'Maths Challenge — Arithmetic',
      subtitle: `${perPage} Questions per page — ${subtitle}`,
      studentName: name || undefined,
      includeAnswerKey: true,
    });
    doc.save('maths-arithmetic.pdf');
    const next = { pageCount: pages, questionsPerPage: perPage };
    setPrintConfig(next);
    saveArithPrintConfig(next, currentUser?.id);
  };

  const hints = DIFFICULTY_HINT_KEYS[operation].map(k => t(k)) as [string, string, string];

  // Header label for the digit / difficulty cards so 'all' mode doesn't
  // present an ambiguous "Digits" next to "Multiply digits".
  const addSubLabel = t(
    operation === 'add'
      ? 'arithmetic.setup.opAdd'
      : operation === 'subtract'
        ? 'arithmetic.setup.opSubtract'
        : 'arithmetic.setup.opAddSubtract'
  );

  // For the live add/subtract example, pick the first concrete op so the
  // user sees "23 + 7" or "23 − 7" depending on the picker.
  const exampleOp: 'add' | 'subtract' = operation === 'subtract' ? 'subtract' : 'add';

  // Visibility flags for op-specific cards. 'all' shows every op's controls.
  const showAddSub = operation === 'add' || operation === 'subtract' || operation === 'all';
  const showMultiply = operation === 'multiply' || operation === 'all';
  const showDivide = operation === 'divide' || operation === 'all';

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
          {t('arithmetic.setup.title')}
        </h1>
        <p className="text-center text-[12px] md:text-[17px] text-muted-foreground mb-3">
          {currentUser ? t('arithmetic.setup.hiName', { name: currentUser.name }) : ''}{t('arithmetic.setup.subtitle')}
        </p>

        <div className="mb-3 md:mb-6 flex items-center justify-end">
          <UserSelector currentUser={currentUser} onUserChange={onUserChange} onNewUser={onNewUser} />
        </div>

        <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
          <h2 className="mb-2 md:mb-3 text-[14px] md:text-[20px] font-semibold text-foreground">{t('arithmetic.setup.operation')}</h2>
          <div className="grid grid-cols-5 gap-1 md:gap-2">
            {([
              { id: 'add', label: '+' },
              { id: 'subtract', label: '−' },
              { id: 'multiply', label: '×' },
              { id: 'divide', label: '÷' },
              { id: 'all', label: t('arithmetic.setup.all') },
            ] as const).map(op => (
              <button key={op.id} onClick={() => setOperation(op.id)} className={buttonClass(operation === op.id)}>
                <span className="text-[15px] md:text-[18px]">{op.label}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Digits + Difficulty drive add/subtract. Shown for 'all' because
            'all' includes add/subtract. Header names the operations it
            affects so 'all' mode doesn't leave the parent guessing which
            "Digits" card is which. */}
        {showAddSub && (
          <>
            <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
              <h2 className="mb-2 md:mb-3 text-[14px] md:text-[20px] font-semibold text-foreground">
                {t('arithmetic.setup.digitsHeader', { op: addSubLabel })}
              </h2>
              <DigitChipPicker
                label={t('arithmetic.setup.firstNumber')}
                options={DIGIT_CHIP_OPTIONS}
                selected={addSubFirstDigits}
                onChange={setAddSubFirstDigits}
              />
              <DigitChipPicker
                label={t('arithmetic.setup.secondNumber')}
                options={DIGIT_CHIP_OPTIONS}
                selected={addSubSecondDigits}
                onChange={setAddSubSecondDigits}
              />
              <p className="text-[12px] md:text-[14px] text-foreground/70 text-center mt-3">
                {t('arithmetic.setup.example', { value: addSubExample(addSubFirstDigits, addSubSecondDigits, exampleOp) })}
              </p>
            </Card>

            <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
              <h2 className="mb-2 md:mb-3 text-[14px] md:text-[20px] font-semibold text-foreground">
                {t('arithmetic.setup.difficultyHeader', { op: addSubLabel })}
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {(['easy', 'medium', 'hard'] as const).map((d, idx) => (
                  <div key={d} className="flex flex-col gap-1 md:gap-1.5">
                    <button onClick={() => setDifficulty(d)} className={buttonClass(difficulty === d)}>
                      <span className="text-[13px] md:text-[16px]">{t(DIFFICULTY_LABEL_KEY[d])}</span>
                    </button>
                    <p className="text-[10px] md:text-[12px] text-foreground/70 text-center leading-tight">{hints[idx]}</p>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}

        {/* Multiply digits — multi-select chip pickers (one per operand) so
            any mix from 1×1 up to 5×5 is allowed. The example below the
            pickers updates live so the parent sees exactly what kind of
            problem will be generated. */}
        {showMultiply && (
          <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
            <h2 className="mb-2 md:mb-3 text-[14px] md:text-[20px] font-semibold text-foreground">
              {t('arithmetic.setup.multiplyDigits')}
            </h2>
            <DigitChipPicker
              label={t('arithmetic.setup.firstNumber')}
              options={DIGIT_CHIP_OPTIONS}
              selected={multiplyFirstDigits}
              onChange={setMultiplyFirstDigits}
            />
            <DigitChipPicker
              label={t('arithmetic.setup.secondNumber')}
              options={DIGIT_CHIP_OPTIONS}
              selected={multiplySecondDigits}
              onChange={setMultiplySecondDigits}
            />
            <p className="text-[12px] md:text-[14px] text-foreground/70 text-center mt-3">
              {t('arithmetic.setup.example', { value: multiplyExample(multiplyFirstDigits, multiplySecondDigits) })}
            </p>
          </Card>
        )}

        {/* Divide digits — mirrors Multiply. First number is the dividend
            (e.g. 672 in "672 ÷ 8"), second is the divisor. */}
        {showDivide && (
          <>
            <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
              <h2 className="mb-2 md:mb-3 text-[14px] md:text-[20px] font-semibold text-foreground">
                {t('arithmetic.setup.divideDigits')}
              </h2>
              <DigitChipPicker
                label={t('arithmetic.setup.firstNumber')}
                options={DIGIT_CHIP_OPTIONS}
                selected={divideFirstDigits}
                onChange={setDivideFirstDigits}
              />
              <DigitChipPicker
                label={t('arithmetic.setup.secondNumber')}
                options={DIGIT_CHIP_OPTIONS}
                selected={divideSecondDigits}
                onChange={setDivideSecondDigits}
              />
              <p className="text-[12px] md:text-[14px] text-foreground/70 text-center mt-3">
                {t('arithmetic.setup.example', { value: divideExample(divideFirstDigits, divideSecondDigits) })}
              </p>
            </Card>

            <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
              <h2 className="mb-2 md:mb-3 text-[14px] md:text-[20px] font-semibold text-foreground">
                {t('arithmetic.setup.allowRemainders')}
              </h2>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setAllowRemainders(true)}
                  aria-pressed={allowRemainders}
                  className={buttonClass(allowRemainders)}
                >
                  <span className="text-[13px] md:text-[16px]">{t('arithmetic.setup.on')}</span>
                </button>
                <button
                  onClick={() => setAllowRemainders(false)}
                  aria-pressed={!allowRemainders}
                  className={buttonClass(!allowRemainders)}
                >
                  <span className="text-[13px] md:text-[16px]">{t('arithmetic.setup.off')}</span>
                </button>
              </div>
              <p className="text-[10px] md:text-[12px] text-foreground/70 text-center mt-2 leading-tight">
                {allowRemainders
                  ? t('arithmetic.setup.remainderOn')
                  : t('arithmetic.setup.remainderOff')}
              </p>
            </Card>
          </>
        )}

        <Card className="mb-2 md:mb-4 p-3 md:p-5 shadow-card">
          <h2 className="mb-2 md:mb-3 text-[14px] md:text-[20px] font-semibold text-foreground">{t('arithmetic.setup.gameMode')}</h2>
          <div className="flex gap-2 mb-3">
            <button onClick={() => setGameMode('questions')} className={cn('flex-1', buttonClass(gameMode === 'questions'))}>
              <span className="text-[13px] md:text-[16px]">{t('arithmetic.setup.questions')}</span>
            </button>
            <button onClick={() => setGameMode('time')} className={cn('flex-1', buttonClass(gameMode === 'time'))}>
              <span className="text-[13px] md:text-[16px]">{t('arithmetic.setup.timed')}</span>
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
            {t('arithmetic.setup.printWorksheet')}
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
        questionsPerPageOptions={perPageOptions}
        summary={buildArithSummary(
          operation,
          difficulty,
          addSubFirstDigits,
          addSubSecondDigits,
          multiplyFirstDigits,
          multiplySecondDigits,
          divideFirstDigits,
          divideSecondDigits,
          allowRemainders
        )}
        onDownload={handlePrintDownload}
      />
    </div>
  );
}
