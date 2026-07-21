import { recordPractice } from '@/lib/practice/recordPractice';
import { getCurrentUser } from '@/lib/userStorage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MultiFieldInput } from '@/components/MultiFieldInput';
import { cn } from '@/lib/utils';
import type {
  CompareDecimalsQuestion,
  DecimalsQuestion,
  DecimalsSettings,
} from './logic';
import {
  checkFractionAnswer,
  checkNumericAnswer,
  checkOrderAnswer,
  formatDecimal,
  fractionGlyph,
  generateDecimalsQuestions,
  isAddSubQuestion,
  isCompareQuestion,
  isFractionDecimalQuestion,
  isIdentifyQuestion,
  isPercentQuestion,
  isRoundQuestion,
  parseDecimalList,
  roundTo,
} from './logic';
import { useT } from '@/lib/i18n/react';
import { parseAnswer } from '@/lib/i18n/number';
import { E2EOracle } from '@/lib/e2e/oracle';
import { E2E_ENABLED } from '@/lib/e2e/env';
import { decimalsOracle } from './oracle';

// User-typed answer kept on each incorrect entry so the results screen can
// show what the kid wrote.
export type DecimalsUserAnswer =
  | { kind: 'number'; value: number | null }
  | { kind: 'fraction'; num: number | null; den: number | null }
  | { kind: 'order'; values: number[] }
  | { kind: 'none' };

export interface DecimalsIncorrectEntry {
  question: DecimalsQuestion;
  userAnswer: DecimalsUserAnswer;
}

export interface DecimalsGameResult {
  score: number;
  total: number;
  bestStreak: number;
  incorrectQuestions: DecimalsIncorrectEntry[];
  settings: DecimalsSettings;
}

interface Props {
  settings: DecimalsSettings;
  onComplete: (r: DecimalsGameResult) => void;
  onQuit: () => void;
}

// Natural display dp for a value. Mirrors pdf.ts so screen and PDF agree.
function naturalDp(n: number): number {
  if (Number.isInteger(n)) return 0;
  const s = n.toString();
  const dot = s.indexOf('.');
  if (dot === -1) return 0;
  return Math.min(3, s.length - dot - 1);
}

function PromptLine({ q }: { q: DecimalsQuestion }) {
  const { t } = useT();
  if (isIdentifyQuestion(q)) {
    const dp =
      q.skill === 'identify-tenths' ? 1 : q.skill === 'identify-hundredths' ? 2 : 3;
    return <span>{t('decimals.play.asAFraction', { value: formatDecimal(q.decimal, dp) })}</span>;
  }
  if (isRoundQuestion(q)) {
    const targetLabel = q.precision === 0 ? t('decimals.play.wholeNumber') : t('decimals.play.onedp');
    const sourceDp = q.skill === 'round-1dp' ? 1 : 2;
    return (
      <span>
        {t('decimals.play.round', { value: formatDecimal(q.decimal, sourceDp), target: targetLabel })}
      </span>
    );
  }
  if (isFractionDecimalQuestion(q)) {
    if (q.skill === 'fraction-to-decimal') {
      const glyph = fractionGlyph(q.num, q.den);
      return (
        <span>
          {t('decimals.play.asADecimal', { value: glyph ?? `${q.num}/${q.den}` })}
        </span>
      );
    }
    return (
      <span>
        {t('decimals.play.asAFraction', { value: formatDecimal(q.decimal, naturalDp(q.decimal)) })}
      </span>
    );
  }
  if (isPercentQuestion(q)) {
    if (q.skill === 'percent-fraction') return <span>{t('decimals.play.percentAsFraction', { percent: q.percent })}</span>;
    if (q.skill === 'percent-decimal') return <span>{t('decimals.play.percentAsDecimal', { percent: q.percent })}</span>;
    return <span>{t('decimals.play.asAPercent', { value: formatDecimal(q.decimal, naturalDp(q.decimal)) })}</span>;
  }
  if (isAddSubQuestion(q)) {
    const dp = Math.max(naturalDp(q.a), naturalDp(q.b));
    const sign = q.sign === '+' ? '+' : '−';
    return (
      <span>
        {formatDecimal(q.a, dp)} {sign} {formatDecimal(q.b, dp)} =
      </span>
    );
  }
  if (isCompareQuestion(q)) {
    return <span>{t('decimals.play.tapInOrder')}</span>;
  }
  return null;
}

// Compare-skill chip picker. Maintains an ordered list of clicks; a chip can
// be unselected by tapping it again (removes from the order).
function CompareChips({
  q,
  picks,
  onChange,
}: {
  q: CompareDecimalsQuestion;
  picks: number[]; // indices into q.decimals, in tap order
  onChange: (next: number[]) => void;
}) {
  const toggle = (idx: number) => {
    if (picks.includes(idx)) {
      onChange(picks.filter(i => i !== idx));
    } else if (picks.length < q.decimals.length) {
      onChange([...picks, idx]);
    }
  };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {q.decimals.map((v, idx) => {
          const order = picks.indexOf(idx);
          const isPicked = order >= 0;
          return (
            <button
              key={idx}
              onClick={() => toggle(idx)}
              type="button"
              aria-pressed={isPicked}
              className={cn(
                'rounded-lg min-h-[56px] flex flex-col items-center justify-center font-bold transition-all',
                'hover:scale-[1.02] active:scale-[0.98] px-2',
                isPicked
                  ? 'bg-gradient-to-b from-primary via-primary/90 to-primary/70 text-primary-foreground shadow-xl'
                  : 'bg-gradient-to-b from-secondary via-secondary/85 to-secondary/65 text-foreground hover:from-secondary/80 hover:to-secondary/60 border border-card-border shadow-lg'
              )}
            >
              <span className="text-xl md:text-2xl">{formatDecimal(v, naturalDp(v))}</span>
              {isPicked && (
                <span className="text-xs md:text-sm opacity-80">#{order + 1}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DecimalsPlay({ settings, onComplete, onQuit }: Props) {
  const { t } = useT();
  const [questions, setQuestions] = useState<DecimalsQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [incorrect, setIncorrect] = useState<DecimalsIncorrectEntry[]>([]);
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'incorrect'>('none');
  // Numeric input (used for round, identify-as-decimal-not-applicable, conversions, percent-decimal, add-sub).
  const [numericInput, setNumericInput] = useState('');
  // Two-field fraction input (identify-*, percent-fraction, decimal-to-fraction).
  const [fracNum, setFracNum] = useState('');
  const [fracDen, setFracDen] = useState('');
  // Compare ordering — list of indices into q.decimals.
  const [comparePicks, setComparePicks] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(settings.timeLimit);
  const [isComplete, setIsComplete] = useState(false);
  const startTimeRef = useRef(Date.now());
  const loggedRef = useRef(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const fracDenRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const count = settings.gameMode === 'questions' ? settings.questionCount : 200;
    setQuestions(generateDecimalsQuestions(settings, count));
  }, [settings]);

  useEffect(() => {
    setNumericInput('');
    setFracNum('');
    setFracDen('');
    setComparePicks([]);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [currentIndex, questions.length]);

  useEffect(() => {
    if (settings.gameMode !== 'time' || isComplete) return;
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(t);
          setIsComplete(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [settings.gameMode, isComplete]);

  useEffect(() => {
    if (isComplete) {
      onComplete({
        score,
        total: questionsAnswered,
        bestStreak,
        incorrectQuestions: incorrect,
        settings,
      });
      if (!loggedRef.current) {
        loggedRef.current = true;
        const end = new Date();
        recordPractice(getCurrentUser()?.id, {
          module: 'decimals',
          correct: score,
          total: questionsAnswered,
          durationSec: Math.max(1, Math.round((end.getTime() - startTimeRef.current) / 1000)),
          topics: [],
          startedAt: new Date(startTimeRef.current).toISOString(),
          endedAt: end.toISOString(),
        });
      }
    }
  }, [isComplete, score, questionsAnswered, bestStreak, incorrect, settings, onComplete]);

  const advance = useCallback(
    (isCorrect: boolean) => {
      setQuestionsAnswered(p => p + 1);
      if (isCorrect) {
        setScore(p => p + 1);
        setStreak(p => {
          const next = p + 1;
          setBestStreak(b => Math.max(b, next));
          return next;
        });
        setFeedback('correct');
      } else {
        setStreak(0);
        setFeedback('incorrect');
      }
      const delay = isCorrect ? 800 : 1400;
      setTimeout(() => {
        setFeedback('none');
        const next = currentIndex + 1;
        if (settings.gameMode === 'questions' && next >= settings.questionCount) {
          setIsComplete(true);
        } else if (next >= questions.length) {
          setIsComplete(true);
        } else {
          setCurrentIndex(next);
        }
      }, delay);
    },
    [currentIndex, questions.length, settings]
  );

  const recordIncorrect = (ua: DecimalsUserAnswer) => {
    const q = questions[currentIndex];
    if (!q) return;
    setIncorrect(prev => [...prev, { question: q, userAnswer: ua }]);
  };

  const submitNumeric = useCallback(
    (expected: number) => {
      const typed = parseAnswer(numericInput);
      const isCorrect = checkNumericAnswer(expected, typed);
      if (!isCorrect) recordIncorrect({ kind: 'number', value: typed });
      advance(isCorrect);
    },
    // recordIncorrect closes over `questions` via state; safe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [numericInput, advance, currentIndex, questions]
  );

  const submitFraction = useCallback(
    (expectedNum: number, expectedDen: number) => {
      const n = parseAnswer(fracNum);
      const d = parseAnswer(fracDen);
      const isCorrect = checkFractionAnswer(expectedNum, expectedDen, n, d);
      if (!isCorrect) {
        recordIncorrect({ kind: 'fraction', num: n, den: d });
      }
      advance(isCorrect);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fracNum, fracDen, advance, currentIndex, questions]
  );

  const submitPercentAsPercent = useCallback(
    (expected: number) => {
      // Accept either "25" or "25%" — strip a trailing %.
      const stripped = numericInput.replace(/%/g, '').trim();
      const typed = parseAnswer(stripped);
      const isCorrect = checkNumericAnswer(expected, typed);
      if (!isCorrect) recordIncorrect({ kind: 'number', value: typed });
      advance(isCorrect);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [numericInput, advance, currentIndex, questions]
  );

  const submitOrder = useCallback(
    (q: CompareDecimalsQuestion) => {
      const picks = comparePicks.map(idx => q.decimals[idx]);
      const typedOrder = picks.length === q.decimals.length ? picks : null;
      const isCorrect = typedOrder !== null && checkOrderAnswer(q.answer, typedOrder);
      if (!isCorrect) {
        recordIncorrect({ kind: 'order', values: typedOrder ?? [] });
      }
      advance(isCorrect);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [comparePicks, advance, currentIndex, questions]
  );

  if (questions.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-2xl font-bold text-primary">{t('common.loading')}</div>
      </div>
    );
  }

  const q = questions[currentIndex];
  const progress =
    settings.gameMode === 'questions'
      ? (currentIndex / settings.questionCount) * 100
      : ((settings.timeLimit - timeLeft) / settings.timeLimit) * 100;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, '0')}`;
  };

  // Build the right input form for the current question.
  const renderForm = () => {
    if (feedback !== 'none') return null;

    // Compare: 4 chips, with a Check button.
    if (isCompareQuestion(q)) {
      const allPicked = comparePicks.length === q.decimals.length;
      return (
        <div className="space-y-3">
          <CompareChips q={q} picks={comparePicks} onChange={setComparePicks} />
          <Button
            onClick={() => submitOrder(q)}
            className="w-full py-3 md:py-[19px] text-lg md:text-xl font-bold shadow-button"
            disabled={!allPicked}
          >
            {t('decimals.play.check')}
          </Button>
        </div>
      );
    }

    // Two-field fraction input for: identify-*, percent-fraction, decimal-to-fraction.
    const needsFraction =
      isIdentifyQuestion(q) ||
      (isPercentQuestion(q) && q.skill === 'percent-fraction') ||
      (isFractionDecimalQuestion(q) && q.skill === 'decimal-to-fraction');

    if (needsFraction) {
      const expectedNum =
        isIdentifyQuestion(q)
          ? q.answerNum
          : isPercentQuestion(q)
            ? q.num
            : (q as { num: number }).num;
      const expectedDen =
        isIdentifyQuestion(q)
          ? q.answerDen
          : isPercentQuestion(q)
            ? q.den
            : (q as { den: number }).den;
      return (
        <form
          onSubmit={e => {
            e.preventDefault();
            submitFraction(expectedNum, expectedDen);
          }}
          className="space-y-2 md:space-y-[13px]"
        >
          {/* Two-field fraction picker is shared by decimal-to-fraction,
              identify-tenths/hundredths/thousandths, and percent-fraction.
              All three share the exact same input shape, so a single
              <MultiFieldInput> covers them. See the component header for
              the wider migration plan across other modules (arithmetic
              quotient-r-remainder, shapes coord-read, fractions, etc.). */}
          <MultiFieldInput
            fields={[
              {
                value: fracNum,
                onChange: setFracNum,
                ariaLabel: t('decimals.play.numerator'),
                placeholder: t('decimals.play.numPlaceholder'),
                inputRef,
                autoFocus: true,
              },
              {
                value: fracDen,
                onChange: setFracDen,
                ariaLabel: t('decimals.play.denominator'),
                placeholder: t('decimals.play.denPlaceholder'),
                inputRef: fracDenRef,
              },
            ]}
            separators={['/']}
            inputClassName="w-24 md:w-28 text-2xl md:text-3xl"
          />
          <Button
            type="submit"
            className="w-full py-3 md:py-[19px] text-lg md:text-xl font-bold shadow-button"
            disabled={fracNum === '' || fracDen === ''}
          >
            {t('decimals.play.check')}
          </Button>
        </form>
      );
    }

    // Numeric (decimal / percent / whole) input for round, fraction-to-decimal,
    // percent-decimal, decimal-percent, add-sub.
    let expected: number;
    let isPercent = false;
    if (isRoundQuestion(q)) expected = q.answer;
    else if (isFractionDecimalQuestion(q)) expected = q.decimal;
    else if (isPercentQuestion(q)) {
      if (q.skill === 'percent-decimal') expected = q.decimal;
      else {
        // decimal-percent — answer is a percent number (e.g. 50 for 50%).
        expected = q.percent;
        isPercent = true;
      }
    } else if (isAddSubQuestion(q)) expected = q.answer;
    else expected = 0;

    return (
      <form
        onSubmit={e => {
          e.preventDefault();
          if (isPercent) submitPercentAsPercent(expected);
          else submitNumeric(expected);
        }}
        className="space-y-2 md:space-y-[13px]"
      >
        <Input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={numericInput}
          onChange={e => setNumericInput(e.target.value)}
          placeholder={isPercent ? t('decimals.play.egFifty') : t('decimals.play.typeTheAnswer')}
          aria-label={t('decimals.play.typeTheAnswer')}
          className="h-12 md:h-[64px] text-center text-2xl md:text-4xl font-bold"
          autoFocus
        />
        <Button
          type="submit"
          className="w-full py-3 md:py-[19px] text-lg md:text-xl font-bold shadow-button"
          disabled={numericInput.trim() === ''}
        >
          {t('decimals.play.check')}
        </Button>
      </form>
    );
  };

  // The "correct answer" display shown on a wrong attempt.
  const correctText = (): string => {
    if (isIdentifyQuestion(q)) return `${q.answerNum}/${q.answerDen}`;
    if (isRoundQuestion(q)) {
      const dp = q.precision;
      return formatDecimal(roundTo(q.answer, dp), dp);
    }
    if (isCompareQuestion(q)) {
      return q.answer.map(v => formatDecimal(v, naturalDp(v))).join(', ');
    }
    if (isFractionDecimalQuestion(q)) {
      if (q.skill === 'fraction-to-decimal') return formatDecimal(q.decimal, naturalDp(q.decimal));
      return `${q.num}/${q.den}`;
    }
    if (isPercentQuestion(q)) {
      if (q.skill === 'percent-fraction') return `${q.num}/${q.den}`;
      if (q.skill === 'percent-decimal') return formatDecimal(q.decimal, naturalDp(q.decimal));
      return `${q.percent}%`;
    }
    if (isAddSubQuestion(q)) {
      const dp = Math.max(naturalDp(q.a), naturalDp(q.b));
      return formatDecimal(q.answer, dp);
    }
    return '';
  };

  return (
    <div className="min-h-screen bg-background py-2 px-3 md:py-[26px] md:px-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-3 md:mb-[19px]">
          <div className="mb-2 flex items-center justify-between">
            <Button variant="ghost" onClick={onQuit} className="text-muted-foreground h-11">
              {t('decimals.play.quit')}
            </Button>
            <div className="text-center">
              <span className="text-xl md:text-2xl font-bold text-primary">{score}</span>
              <span className="text-sm md:text-base text-muted-foreground">{t('decimals.play.correct')}</span>
            </div>
            <div className="text-right">
              {settings.gameMode === 'questions' ? (
                <span className="text-sm md:text-base font-bold">
                  {currentIndex + 1} / {settings.questionCount}
                </span>
              ) : (
                <span
                  className={cn(
                    'font-bold text-lg md:text-xl',
                    timeLeft <= 30 ? 'text-destructive' : 'text-foreground'
                  )}
                >
                  {formatTime(timeLeft)}
                </span>
              )}
            </div>
          </div>
          <div className="h-[10px] overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          {streak >= 3 && (
            <div className="mt-2 flex justify-center" role="status" aria-live="polite">
              <span
                key={streak}
                className="animate-bounce-in inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-3 py-1 text-sm font-bold text-white shadow-lg"
              >
                <Flame className="w-4 h-4" />
                {t('decimals.play.streak', { count: streak })}
              </span>
            </div>
          )}
        </div>

        <Card
          className={cn(
            'mb-3 md:mb-[19px] py-6 md:py-10 px-4 md:px-8 text-center shadow-card transition-all',
            feedback === 'correct' && 'animate-pop bg-success/10',
            feedback === 'incorrect' && 'animate-shake bg-destructive/10'
          )}
        >
          {E2E_ENABLED && <E2EOracle data={decimalsOracle(q)} />}
          <div className="text-3xl md:text-4xl font-extrabold text-foreground tracking-wide">
            <PromptLine q={q} />
          </div>
          {feedback === 'incorrect' && (
            <div className="mt-3 text-2xl md:text-3xl font-bold text-destructive">
              = {correctText()}
            </div>
          )}
          {feedback === 'correct' && (
            <div className="mt-3 text-2xl md:text-3xl font-extrabold text-success">{t('play.feedback.brilliant')}</div>
          )}
        </Card>

        {renderForm()}
      </div>
    </div>
  );
}
