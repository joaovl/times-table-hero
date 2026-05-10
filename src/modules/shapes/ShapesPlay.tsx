import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ShapeKind, ShapeQuestion, ShapeSettings } from './logic';
import {
  ANGLE_CATEGORIES,
  answerString,
  generateShapeQuestions,
  isAnswerCorrect,
  pickNameDistractors,
  promptFor,
} from './logic';
import { ShapeFigure } from './ShapeFigure';

export interface ShapesGameResult {
  score: number;
  total: number;
  bestStreak: number;
  incorrectQuestions: Array<{
    prompt: string;
    correctAnswer: string;
    userAnswer: string | null;
  }>;
  settings: ShapeSettings;
}

interface Props {
  settings: ShapeSettings;
  onComplete: (r: ShapesGameResult) => void;
  onQuit: () => void;
}

// Shuffle helper for MC choices. Returns a new array.
function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function ShapesPlay({ settings, onComplete, onQuit }: Props) {
  const [questions, setQuestions] = useState<ShapeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [incorrect, setIncorrect] = useState<ShapesGameResult['incorrectQuestions']>([]);
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'incorrect'>('none');
  const [typed, setTyped] = useState('');
  const [timeLeft, setTimeLeft] = useState(settings.timeLimit);
  const [isComplete, setIsComplete] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const count = settings.gameMode === 'questions' ? settings.questionCount : 200;
    setQuestions(generateShapeQuestions(settings, count));
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

  // Pre-compute multiple-choice options for the current name-2d question so
  // re-renders don't reshuffle. Keyed on currentIndex.
  const mcChoices = useMemo<ShapeKind[] | null>(() => {
    if (questions.length === 0) return null;
    const q = questions[currentIndex];
    if (q.skill !== 'name-2d' || !q.shape) return null;
    const distractors = pickNameDistractors(q.shape, 3);
    return shuffle([q.shape, ...distractors]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, questions]);

  const submit = useCallback(
    (value: string) => {
      if (questions.length === 0) return;
      const q = questions[currentIndex];
      const correct = isAnswerCorrect(q, value);

      setQuestionsAnswered(p => p + 1);

      if (correct) {
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
          {
            prompt: promptFor(q),
            correctAnswer: answerString(q),
            userAnswer: value || null,
          },
        ]);
      }

      const delay = correct ? 800 : 1400;
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
    submit(typed.trim());
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

  // Visual mode for the figure component. Each skill maps to a distinct
  // figure layout — ShapeFigure consults `question.skill` first, so the
  // mode here is a hint for the shape-only paths (name-2d / count-sides).
  let figureMode: ShapeKind | 'rect-with-dims' | 'right-triangle' | 'circle-with-radius' | 'angle';
  if (q.skill === 'perimeter-rect' || q.skill === 'area-rect') {
    figureMode = 'rect-with-dims';
  } else if (q.skill === 'area-tri') {
    figureMode = 'right-triangle';
  } else if (q.skill === 'area-circle' || q.skill === 'circumference') {
    figureMode = 'circle-with-radius';
  } else if (q.skill === 'angle-name') {
    figureMode = 'angle';
  } else {
    figureMode = q.shape ?? 'circle';
  }

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
            'mb-3 md:mb-[19px] py-4 md:py-6 px-4 md:px-8 text-center shadow-card transition-all',
            feedback === 'correct' && 'animate-pop bg-success/10',
            feedback === 'incorrect' && 'animate-shake bg-destructive/10'
          )}
        >
          <div className="flex justify-center text-foreground">
            <ShapeFigure shape={figureMode} question={q} size={220} />
          </div>
          <p className="mt-3 text-sm md:text-base text-muted-foreground">{promptFor(q)}</p>
          {feedback === 'incorrect' && (
            <div className="mt-3 text-2xl md:text-3xl font-bold text-destructive">
              {answerString(q)}
            </div>
          )}
          {feedback === 'correct' && (
            <div className="mt-3 text-2xl md:text-3xl font-extrabold text-success">Brilliant!</div>
          )}
        </Card>

        {feedback === 'none' && q.skill === 'name-2d' && mcChoices && (
          <div className="grid grid-cols-2 gap-2">
            {mcChoices.map(choice => (
              <Button
                key={choice}
                onClick={() => submit(choice)}
                className="py-4 text-lg font-bold capitalize shadow-button"
              >
                {choice}
              </Button>
            ))}
          </div>
        )}

        {feedback === 'none' && q.skill === 'angle-name' && (
          <div className="grid grid-cols-3 gap-2">
            {ANGLE_CATEGORIES.map(c => (
              <Button
                key={c}
                onClick={() => submit(c)}
                className="py-4 text-lg font-bold capitalize shadow-button"
              >
                {c}
              </Button>
            ))}
          </div>
        )}

        {feedback === 'none' && q.skill !== 'name-2d' && q.skill !== 'angle-name' && (
          <form onSubmit={handleSubmit} className="space-y-2 md:space-y-[13px]">
            <Input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={typed}
              onChange={e => setTyped(e.target.value)}
              placeholder={
                q.skill === 'count-sides'
                  ? 'e.g. 4'
                  : `answer in ${q.units}`
              }
              className="h-12 md:h-[64px] text-center text-2xl md:text-4xl font-bold"
              autoFocus
            />
            <Button
              type="submit"
              className="w-full py-3 md:py-[19px] text-lg md:text-xl font-bold shadow-button"
              disabled={typed.trim() === ''}
            >
              Check
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
