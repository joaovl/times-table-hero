import { recordPractice } from '@/lib/practice/recordPractice';
import { getCurrentUser } from '@/lib/userStorage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { AnswerChoices } from '@/components/game/AnswerChoices';
import { NONE_OF_THESE, isChoiceCorrect } from '@/lib/game/choices';
import type { ArithQuestion, ArithSettings } from './logic';
import { checkArithAnswer, divideUsesRemainderField, generateArithChoices, generateArithQuestions } from './logic';

export interface ArithGameResult {
  score: number;
  total: number;
  bestStreak: number;
  incorrectQuestions: Array<{
    op: 'add' | 'subtract' | 'multiply' | 'divide';
    operand1: number;
    operand2: number;
    userAnswer: number | null;
    correctAnswer: number;
  }>;
  settings: ArithSettings;
}

interface Props {
  settings: ArithSettings;
  onComplete: (r: ArithGameResult) => void;
  onQuit: () => void;
}

const symbol = (op: 'add' | 'subtract' | 'multiply' | 'divide') =>
  op === 'add' ? '+' : op === 'subtract' ? '−' : op === 'multiply' ? '×' : '÷';

// Horizontal display for divide and other ≤3-digit single-row questions.
function HorizontalDisplay({ q }: { q: ArithQuestion }) {
  return (
    <div className="font-mono text-5xl md:text-6xl font-extrabold text-foreground tracking-wider inline-block">
      {q.operand1} {symbol(q.op)} {q.operand2} =
    </div>
  );
}

function ColumnDisplay({ q }: { q: ArithQuestion }) {
  const a = String(q.operand1);
  const b = String(q.operand2);
  const width = Math.max(a.length, b.length);
  return (
    <div className="font-mono text-5xl md:text-6xl font-extrabold text-foreground tracking-wider inline-block">
      <div className="text-right" style={{ minWidth: `${width + 1}ch` }}>{a}</div>
      <div className="text-right" style={{ minWidth: `${width + 1}ch` }}>
        <span className="mr-2">{symbol(q.op)}</span>{b}
      </div>
      <div className="border-t-[3px] border-current mt-1" style={{ minWidth: `${width + 1}ch` }} />
    </div>
  );
}

export function ArithmeticPlay({ settings, onComplete, onQuit }: Props) {
  const [questions, setQuestions] = useState<ArithQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [incorrect, setIncorrect] = useState<ArithGameResult['incorrectQuestions']>([]);
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'incorrect'>('none');
  const [typed, setTyped] = useState('');
  const [typedRemainder, setTypedRemainder] = useState('');
  const [choices, setChoices] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(settings.timeLimit);
  const [isComplete, setIsComplete] = useState(false);
  const startTimeRef = useRef(Date.now());
  const loggedRef = useRef(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const remainderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const count = settings.gameMode === 'questions' ? settings.questionCount : 200;
    // Online play now supports remainders via a two-field `[q] r [r]` input
    // (see the form below). The PDF path always honoured the user setting; we
    // no longer need to clobber it here.
    setQuestions(generateArithQuestions(settings, count));
  }, [settings]);

  useEffect(() => {
    setTyped('');
    setTypedRemainder('');
    if (questions.length > 0 && currentIndex < questions.length && settings.difficulty !== 'hard') {
      // On medium, hide the answer ~1 in 4 so 'None of these' is the right pick.
      const hideCorrect = settings.difficulty === 'medium' && Math.random() < 0.25;
      setChoices(generateArithChoices(questions[currentIndex], settings.difficulty, hideCorrect));
    } else {
      setChoices([]);
    }
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [currentIndex, questions, settings.difficulty]);

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
          module: 'arithmetic',
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

  const finalize = useCallback((isCorrect: boolean, userAnswer: number | null) => {
    if (questions.length === 0) return;
    const q = questions[currentIndex];

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
      setIncorrect(prev => [
        ...prev,
        { op: q.op, operand1: q.operand1, operand2: q.operand2, userAnswer, correctAnswer: q.answer },
      ]);
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
  }, [currentIndex, questions, settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = questions[currentIndex];
    const parsedQ = parseInt(typed, 10);
    const parsedR = parseInt(typedRemainder, 10);
    const quotient = isNaN(parsedQ) ? null : parsedQ;
    const remainder = isNaN(parsedR) ? null : parsedR;
    finalize(checkArithAnswer(q, quotient, remainder), quotient);
  };

  // A multiple-choice pick. 'None of these' is correct when the answer was
  // hidden (no shown option grades right); otherwise the numeric pick is graded.
  const handleChoose = (option: string) => {
    const q = questions[currentIndex];
    const isCorrect = isChoiceCorrect(option, choices, c => !checkArithAnswer(q, Number(c), null));
    finalize(isCorrect, option === NONE_OF_THESE ? null : Number(option));
  };

  if (questions.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-2xl font-bold text-primary">Loading...</div>
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

  // Divide questions render horizontally for ≤3-digit dividends so they look
  // like "672 ÷ 8 ="; 4+ digit dividends fall through to column form.
  const dividendDigits = String(q.operand1).length;
  const useHorizontalForDivide = q.op === 'divide' && dividendDigits <= 3;
  const showRemainderField = divideUsesRemainderField(q);

  // What the kid was supposed to type. Divide-with-remainder shows both halves
  // so they can see what they got wrong.
  const formatExpected = (qq: ArithQuestion) =>
    divideUsesRemainderField(qq) ? `${qq.answer} r ${qq.remainder ?? 0}` : `${qq.answer}`;

  return (
    <div className="min-h-screen bg-background py-2 px-3 md:py-[26px] md:px-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-3 md:mb-[19px]">
          <div className="mb-2 flex items-center justify-between">
            <Button variant="ghost" onClick={onQuit} className="text-muted-foreground h-11">← Quit</Button>
            <div className="text-center">
              <span className="text-xl md:text-2xl font-bold text-primary">{score}</span>
              <span className="text-sm md:text-base text-muted-foreground"> correct</span>
            </div>
            <div className="text-right">
              {settings.gameMode === 'questions' ? (
                <span className="text-sm md:text-base font-bold">
                  {currentIndex + 1} / {settings.questionCount}
                </span>
              ) : (
                <span className={cn('font-bold text-lg md:text-xl', timeLeft <= 30 ? 'text-destructive' : 'text-foreground')}>
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
                {streak} in a row!
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
          {useHorizontalForDivide ? <HorizontalDisplay q={q} /> : <ColumnDisplay q={q} />}
          {feedback === 'incorrect' && (
            <div className="mt-3 text-2xl md:text-3xl font-bold text-destructive">= {formatExpected(q)}</div>
          )}
          {feedback === 'correct' && (
            <div className="mt-3 text-2xl md:text-3xl font-extrabold text-success">Brilliant!</div>
          )}
        </Card>

        {feedback === 'none' && settings.difficulty !== 'hard' && choices.length > 0 && (
          <AnswerChoices options={choices} onChoose={handleChoose} />
        )}

        {feedback === 'none' && !(settings.difficulty !== 'hard' && choices.length > 0) && (
          <form onSubmit={handleSubmit} className="space-y-2 md:space-y-[13px]">
            {showRemainderField ? (
              <div className="flex items-center gap-2 md:gap-3">
                <Input
                  ref={inputRef}
                  type="number"
                  inputMode="numeric"
                  value={typed}
                  onChange={e => setTyped(e.target.value)}
                  onKeyDown={e => {
                    // Enter on the quotient field should jump to the remainder
                    // field instead of submitting the (likely-empty) form.
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      remainderInputRef.current?.focus();
                      remainderInputRef.current?.select();
                    }
                  }}
                  placeholder="quotient"
                  aria-label="Quotient"
                  className="h-12 md:h-[64px] flex-1 text-center text-2xl md:text-4xl font-bold"
                  autoFocus
                />
                <span className="font-mono text-2xl md:text-4xl font-extrabold text-foreground select-none">r</span>
                <Input
                  ref={remainderInputRef}
                  type="number"
                  inputMode="numeric"
                  value={typedRemainder}
                  onChange={e => setTypedRemainder(e.target.value)}
                  placeholder="remainder"
                  aria-label="Remainder"
                  className="h-12 md:h-[64px] flex-1 text-center text-2xl md:text-4xl font-bold"
                />
              </div>
            ) : (
              <Input
                ref={inputRef}
                type="number"
                inputMode="numeric"
                value={typed}
                onChange={e => setTyped(e.target.value)}
                placeholder="Type the answer"
                aria-label="Type the answer"
                className="h-12 md:h-[64px] text-center text-2xl md:text-4xl font-bold"
                autoFocus
              />
            )}
            <Button
              type="submit"
              className="w-full py-3 md:py-[19px] text-lg md:text-xl font-bold shadow-button"
              disabled={typed === ''}
            >
              Check
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
