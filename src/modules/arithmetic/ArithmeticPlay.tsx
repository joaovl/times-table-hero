import { useCallback, useEffect, useRef, useState } from 'react';
import { Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ArithQuestion, ArithSettings } from './logic';
import { generateArithQuestions } from './logic';

export interface ArithGameResult {
  score: number;
  total: number;
  bestStreak: number;
  incorrectQuestions: Array<{
    op: 'add' | 'subtract' | 'multiply';
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

const symbol = (op: 'add' | 'subtract' | 'multiply') =>
  op === 'add' ? '+' : op === 'subtract' ? '−' : '×';

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
  const [timeLeft, setTimeLeft] = useState(settings.timeLimit);
  const [isComplete, setIsComplete] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const count = settings.gameMode === 'questions' ? settings.questionCount : 200;
    setQuestions(generateArithQuestions(settings, count));
  }, [settings]);

  useEffect(() => {
    setTyped('');
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
    }
  }, [isComplete, score, questionsAnswered, bestStreak, incorrect, settings, onComplete]);

  const submit = useCallback((value: number | null) => {
    if (questions.length === 0) return;
    const q = questions[currentIndex];
    const isCorrect = value === q.answer;

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
        { op: q.op, operand1: q.operand1, operand2: q.operand2, userAnswer: value, correctAnswer: q.answer },
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
    const parsed = parseInt(typed, 10);
    submit(isNaN(parsed) ? null : parsed);
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
          <ColumnDisplay q={q} />
          {feedback === 'incorrect' && (
            <div className="mt-3 text-2xl md:text-3xl font-bold text-destructive">= {q.answer}</div>
          )}
          {feedback === 'correct' && (
            <div className="mt-3 text-2xl md:text-3xl font-extrabold text-success">Brilliant!</div>
          )}
        </Card>

        {feedback === 'none' && (
          <form onSubmit={handleSubmit} className="space-y-2 md:space-y-[13px]">
            <Input
              ref={inputRef}
              type="number"
              inputMode="numeric"
              value={typed}
              onChange={e => setTyped(e.target.value)}
              placeholder="Type the answer"
              className="h-12 md:h-[64px] text-center text-2xl md:text-4xl font-bold"
              autoFocus
            />
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
