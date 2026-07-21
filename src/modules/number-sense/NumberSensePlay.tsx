import { AnswerChoices } from '@/components/game/AnswerChoices';
import { generateChoices } from './logic';
import { recordPractice } from '@/lib/practice/recordPractice';
import { getCurrentUser } from '@/lib/userStorage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { NumberSenseQuestion, NumberSenseSettings } from './logic';
import {
  generateNumberSenseQuestions,
  checkNumberSenseAnswer,
  answerText,
  isPlaceValueQuestion,
  isRoundQuestion,
  isSequenceQuestion,
  isRomanQuestion,
  isOrderQuestion,
  isNegativeIntervalQuestion,
  isBidmasQuestion,
} from './logic';
import { useT } from '@/lib/i18n/react';
import type { MessageKey } from '@/lib/i18n/i18n';
import { formatNumber } from '@/lib/i18n/number';
import { E2EOracle } from '@/lib/e2e/oracle';
import { E2E_ENABLED } from '@/lib/e2e/env';
import { numberSenseOracle } from './oracle';

export interface NumberSenseIncorrectEntry {
  question: NumberSenseQuestion;
  userAnswer: string;
}

export interface NumberSenseGameResult {
  score: number;
  total: number;
  bestStreak: number;
  incorrectQuestions: NumberSenseIncorrectEntry[];
  settings: NumberSenseSettings;
}

interface Props {
  settings: NumberSenseSettings;
  onComplete: (r: NumberSenseGameResult) => void;
  onQuit: () => void;
}

// Format a number with thousands separators for screen display (app locale).
function fmt(n: number): string {
  return formatNumber(n, { useGrouping: true });
}

// Highlight the targeted digit inside the place-value prompt. We render the
// number as a row of digits with the targeted one in primary colour.
function HighlightedNumber({ number, digitIndex }: { number: number; digitIndex: number }) {
  const digits = String(number).split('');
  return (
    <span className="font-mono text-5xl md:text-6xl font-extrabold tracking-wider">
      {digits.map((d, i) => (
        <span
          key={i}
          className={cn(
            i === digitIndex ? 'text-primary underline decoration-4 underline-offset-4' : 'text-foreground'
          )}
        >
          {d}
        </span>
      ))}
    </span>
  );
}

function SequenceDisplay({
  sequence,
  missingIndices,
}: {
  sequence: number[];
  missingIndices: number[];
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 font-mono text-3xl md:text-4xl font-extrabold text-foreground">
      {sequence.map((n, i) => {
        const isBlank = missingIndices.includes(i);
        return (
          <span key={i} className="inline-flex items-center">
            <span className={cn(isBlank ? 'text-primary' : 'text-foreground')}>
              {isBlank ? '?' : fmt(n)}
            </span>
            {i < sequence.length - 1 && (
              <span className="ml-2 md:ml-3 text-muted-foreground">,</span>
            )}
          </span>
        );
      })}
    </div>
  );
}

const ROUND_NEAREST_KEY: Record<number, MessageKey> = {
  10: 'numberSense.nearest.10',
  100: 'numberSense.nearest.100',
  1000: 'numberSense.nearest.1000',
  10000: 'numberSense.nearest.10000',
  100000: 'numberSense.nearest.100000',
  1000000: 'numberSense.nearest.1000000',
};

export function NumberSensePlay({ settings, onComplete, onQuit }: Props) {
  const { t } = useT();
  const [questions, setQuestions] = useState<NumberSenseQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [incorrect, setIncorrect] = useState<NumberSenseIncorrectEntry[]>([]);
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'incorrect'>('none');
  const [typed, setTyped] = useState('');
  const [choices, setChoices] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(settings.timeLimit);
  const [isComplete, setIsComplete] = useState(false);
  const startTimeRef = useRef(Date.now());
  const loggedRef = useRef(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const count = settings.gameMode === 'questions' ? settings.questionCount : 200;
    setQuestions(generateNumberSenseQuestions(settings, count));
  }, [settings]);

  useEffect(() => {
    setTyped('');
    if (questions.length > 0) {
      setChoices(settings.difficulty !== 'hard'
        ? generateChoices(questions[currentIndex], settings.difficulty)
        : []);
    }
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
          module: 'number-sense',
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

  const submit = useCallback(
    (input: string) => {
      if (questions.length === 0) return;
      const q = questions[currentIndex];
      const isCorrect = checkNumberSenseAnswer(q, input);
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
        setIncorrect(prev => [...prev, { question: q, userAnswer: input }]);
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
    [currentIndex, questions, settings]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit(typed);
  };

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

  // Choose the placeholder + input type per skill so the kid sees a hint of
  // what shape the answer should take.
  let placeholder = t('numberSense.play.typeTheAnswer');
  let inputType: 'number' | 'text' = 'number';
  let inputMode: 'numeric' | 'text' = 'numeric';
  if (
    isPlaceValueQuestion(q) ||
    isRoundQuestion(q) ||
    isNegativeIntervalQuestion(q) ||
    isBidmasQuestion(q)
  ) {
    placeholder = t('numberSense.play.typeANumber');
    inputType = 'number';
    inputMode = 'numeric';
  } else if (isSequenceQuestion(q)) {
    placeholder = t('numberSense.play.numbersCommaSeparated', { count: q.missingIndices.length });
    inputType = 'text';
    inputMode = 'text';
  } else if (isRomanQuestion(q)) {
    placeholder = q.direction === 'r2n' ? t('numberSense.play.typeANumber') : t('numberSense.play.typeRomanNumerals');
    inputType = 'text';
    inputMode = 'text';
  } else if (isOrderQuestion(q)) {
    placeholder = t('numberSense.play.smallestToLargestCommaSeparated');
    inputType = 'text';
    inputMode = 'text';
  }

  return (
    <div className="min-h-screen bg-background py-2 px-3 md:py-[26px] md:px-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-3 md:mb-[19px]">
          <div className="mb-2 flex items-center justify-between">
            <Button variant="ghost" onClick={onQuit} className="text-muted-foreground h-11">
              {t('numberSense.play.quit')}
            </Button>
            <div className="text-center">
              <span className="text-xl md:text-2xl font-bold text-primary">{score}</span>
              <span className="text-sm md:text-base text-muted-foreground">{t('numberSense.play.correct')}</span>
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
                {t('numberSense.play.streak', { count: streak })}
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
          {E2E_ENABLED && <E2EOracle data={numberSenseOracle(q, choices)} />}
          {isPlaceValueQuestion(q) && (
            <>
              <p className="text-sm md:text-base font-semibold text-muted-foreground mb-3">
                {t('numberSense.play.whatIsHighlightedDigit')}
              </p>
              <HighlightedNumber number={q.number} digitIndex={q.digitIndex} />
            </>
          )}

          {isRoundQuestion(q) && (
            <>
              <p className="text-sm md:text-base font-semibold text-muted-foreground mb-3">
                {t('numberSense.play.roundToNearest', { nearest: t(ROUND_NEAREST_KEY[q.nearest] ?? 'numberSense.nearest.1000000') })}
              </p>
              <div className="font-mono text-5xl md:text-6xl font-extrabold text-foreground">
                {fmt(q.number)}
              </div>
            </>
          )}

          {isNegativeIntervalQuestion(q) && (
            <>
              <p className="text-sm md:text-base font-semibold text-muted-foreground mb-3">
                {t('numberSense.play.fromToHowMany', { from: q.from, to: q.to })}
              </p>
              <div className="font-mono text-4xl md:text-5xl font-extrabold text-foreground">
                {q.from} → {q.to}
              </div>
            </>
          )}

          {isBidmasQuestion(q) && (
            <>
              <p className="text-sm md:text-base font-semibold text-muted-foreground mb-3">
                {t('numberSense.play.workOutBidmas')}
              </p>
              <div className="font-mono text-3xl md:text-5xl font-extrabold text-foreground">
                {q.expression} = ?
              </div>
            </>
          )}

          {isSequenceQuestion(q) && (
            <>
              <p className="text-sm md:text-base font-semibold text-muted-foreground mb-3">
                {t('numberSense.play.fillInBlanks')}
              </p>
              <SequenceDisplay sequence={q.sequence} missingIndices={q.missingIndices} />
            </>
          )}

          {isRomanQuestion(q) && (
            <>
              <p className="text-sm md:text-base font-semibold text-muted-foreground mb-3">
                {q.direction === 'r2n'
                  ? t('numberSense.play.whatNumberIsRoman')
                  : t('numberSense.play.writeInRoman')}
              </p>
              <div className="font-mono text-5xl md:text-6xl font-extrabold text-foreground tracking-wider">
                {q.prompt}
              </div>
            </>
          )}

          {isOrderQuestion(q) && (
            <>
              <p className="text-sm md:text-base font-semibold text-muted-foreground mb-3">
                {t('numberSense.play.typeSmallestToLargest')}
              </p>
              <div className="flex flex-wrap justify-center gap-2 md:gap-3 font-mono text-3xl md:text-4xl font-extrabold text-foreground">
                {q.numbers.map((n, i) => (
                  <span key={i} className="px-2">
                    {fmt(n)}
                  </span>
                ))}
              </div>
            </>
          )}

          {feedback === 'incorrect' && (
            <div className="mt-4 text-xl md:text-2xl font-bold text-destructive break-words">
              {t('numberSense.play.answer', { value: answerText(q) })}
            </div>
          )}
          {feedback === 'correct' && (
            <div className="mt-3 text-2xl md:text-3xl font-extrabold text-success">{t('play.feedback.brilliant')}</div>
          )}
        </Card>

        {feedback === 'none' && (
          settings.difficulty !== 'hard' && choices.length > 0 ? (
            <AnswerChoices options={choices} onChoose={submit} />
          ) : (
          <form onSubmit={handleSubmit} className="space-y-2 md:space-y-[13px]">
            <Input
              ref={inputRef}
              type={inputType}
              inputMode={inputMode}
              value={typed}
              onChange={e => setTyped(e.target.value)}
              placeholder={placeholder}
              aria-label={t('numberSense.play.typeTheAnswer')}
              className="h-12 md:h-[64px] text-center text-xl md:text-3xl font-bold"
              autoFocus
            />
            <Button
              type="submit"
              className="w-full py-3 md:py-[19px] text-lg md:text-xl font-bold shadow-button"
              disabled={typed.trim() === ''}
            >
              {t('numberSense.play.check')}
            </Button>
          </form>
          )
        )}
      </div>
    </div>
  );
}
