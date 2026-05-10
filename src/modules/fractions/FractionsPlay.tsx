import { useCallback, useEffect, useRef, useState } from 'react';
import { Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { FractionQuestion, FractionSettings, Frac } from './logic';
import {
  generateFractionQuestions,
  simplifyFrac,
  fracEquals,
  fracIsSimplified,
  skillOp,
} from './logic';
import { FractionDisplay } from './FractionDisplay';

export interface FractionGameResult {
  score: number;
  total: number;
  bestStreak: number;
  incorrectQuestions: Array<{
    skill: FractionQuestion['skill'];
    a: Frac;
    b: Frac;
    userAnswer: Frac | null;
    correctAnswer: Frac;
  }>;
  settings: FractionSettings;
}

interface Props {
  settings: FractionSettings;
  onComplete: (r: FractionGameResult) => void;
  onQuit: () => void;
}

const opGlyph = (op: 'add' | 'sub') => (op === 'add' ? '+' : '−');

export function FractionsPlay({ settings, onComplete, onQuit }: Props) {
  const [questions, setQuestions] = useState<FractionQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [incorrect, setIncorrect] = useState<FractionGameResult['incorrectQuestions']>([]);
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'incorrect'>('none');
  const [numInput, setNumInput] = useState('');
  const [denInput, setDenInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(settings.timeLimit);
  const [isComplete, setIsComplete] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const numRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const count = settings.gameMode === 'questions' ? settings.questionCount : 200;
    setQuestions(generateFractionQuestions(settings, count));
  }, [settings]);

  useEffect(() => {
    setNumInput('');
    setDenInput('');
    setTimeout(() => numRef.current?.focus(), 50);
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

  const submit = useCallback(
    (value: Frac | null) => {
      if (questions.length === 0) return;
      const q = questions[currentIndex];
      // Accept the correct answer in either its exact simplified form (when
      // simplify is on we require simplified form), or in any equivalent form
      // when simplify is off.
      let isCorrect = false;
      if (value !== null && value.den !== 0) {
        if (settings.simplify) {
          // Must equal the stored simplified answer AND be in simplest form.
          isCorrect = fracEquals(value, q.answer) && fracIsSimplified(value);
        } else {
          isCorrect = fracEquals(value, q.answer);
        }
      }

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
          { skill: q.skill, a: q.a, b: q.b, userAnswer: value, correctAnswer: q.answer },
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
    },
    [currentIndex, questions, settings]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numP = parseInt(numInput, 10);
    const denP = parseInt(denInput, 10);
    if (isNaN(numP) || isNaN(denP) || denP === 0) {
      submit(null);
      return;
    }
    submit({ num: numP, den: denP });
  };

  if (questions.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-2xl font-bold text-primary">Loading...</div>
      </div>
    );
  }

  const q = questions[currentIndex];
  const op = skillOp(q.skill);
  const progress =
    settings.gameMode === 'questions'
      ? (currentIndex / settings.questionCount) * 100
      : ((settings.timeLimit - timeLeft) / settings.timeLimit) * 100;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, '0')}`;
  };

  const correctDisplay = settings.simplify ? simplifyFrac(q.answer) : q.answer;

  return (
    <div className="min-h-screen bg-background py-2 px-3 md:py-[26px] md:px-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-3 md:mb-[19px]">
          <div className="mb-2 flex items-center justify-between">
            <Button variant="ghost" onClick={onQuit} className="text-muted-foreground h-11">
              ← Quit
            </Button>
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
          <div className="flex items-center justify-center gap-3 text-foreground">
            <FractionDisplay frac={q.a} size="md" />
            <span className="text-4xl md:text-5xl font-extrabold">{opGlyph(op)}</span>
            <FractionDisplay frac={q.b} size="md" />
            <span className="text-4xl md:text-5xl font-extrabold">=</span>
          </div>
          {feedback === 'incorrect' && (
            <div className="mt-3 flex items-center justify-center gap-2 text-destructive">
              <span className="text-2xl md:text-3xl font-bold">=</span>
              <FractionDisplay frac={correctDisplay} size="sm" />
            </div>
          )}
          {feedback === 'correct' && (
            <div className="mt-3 text-2xl md:text-3xl font-extrabold text-success">Brilliant!</div>
          )}
        </Card>

        {feedback === 'none' && (
          <form onSubmit={handleSubmit} className="space-y-2 md:space-y-[13px]">
            <div className="flex items-center justify-center gap-2 md:gap-3">
              <Input
                ref={numRef}
                type="number"
                inputMode="numeric"
                value={numInput}
                onChange={e => setNumInput(e.target.value)}
                placeholder="num"
                aria-label="Numerator"
                className="h-12 md:h-[64px] w-24 md:w-28 text-center text-2xl md:text-3xl font-bold"
                autoFocus
              />
              <span className="text-3xl md:text-4xl font-extrabold text-foreground">/</span>
              <Input
                type="number"
                inputMode="numeric"
                value={denInput}
                onChange={e => setDenInput(e.target.value)}
                placeholder="den"
                aria-label="Denominator"
                className="h-12 md:h-[64px] w-24 md:w-28 text-center text-2xl md:text-3xl font-bold"
              />
            </div>
            <Button
              type="submit"
              className="w-full py-3 md:py-[19px] text-lg md:text-xl font-bold shadow-button"
              disabled={numInput === '' || denInput === ''}
            >
              Check
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
