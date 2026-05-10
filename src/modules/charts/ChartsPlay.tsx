import { useCallback, useEffect, useRef, useState } from 'react';
import { Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ChartQuestion, ChartSettings } from './logic';
import { generateChartQuestions, isAnswerCorrect, isPieSkill } from './logic';
import { BarChart } from './BarChart';
import { PieChart } from './PieChart';

export interface ChartsGameResult {
  score: number;
  total: number;
  bestStreak: number;
  incorrectQuestions: Array<{
    prompt: string;
    userAnswer: string | null;
    correctAnswer: string;
  }>;
  settings: ChartSettings;
}

interface Props {
  settings: ChartSettings;
  onComplete: (r: ChartsGameResult) => void;
  onQuit: () => void;
}

function formatCorrectAnswer(q: ChartQuestion): string {
  const kind = q.expectedKind ?? 'number';
  if (kind === 'label') return q.expectedLabel ?? String(q.answer);
  if (kind === 'fraction' && q.expectedFraction) {
    return `${q.expectedFraction.num}/${q.expectedFraction.den}`;
  }
  return String(q.answer);
}

export function ChartsPlay({ settings, onComplete, onQuit }: Props) {
  const [questions, setQuestions] = useState<ChartQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [incorrect, setIncorrect] = useState<ChartsGameResult['incorrectQuestions']>([]);
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'incorrect'>('none');
  const [typed, setTyped] = useState('');
  const [fracNum, setFracNum] = useState('');
  const [fracDen, setFracDen] = useState('');
  const [timeLeft, setTimeLeft] = useState(settings.timeLimit);
  const [isComplete, setIsComplete] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const numRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const count = settings.gameMode === 'questions' ? settings.questionCount : 200;
    setQuestions(generateChartQuestions(settings, count));
  }, [settings]);

  useEffect(() => {
    setTyped('');
    setFracNum('');
    setFracDen('');
    const q = questions[currentIndex];
    const kind = q?.expectedKind ?? 'number';
    setTimeout(() => {
      if (kind === 'fraction') numRef.current?.focus();
      else inputRef.current?.focus();
    }, 50);
  }, [currentIndex, questions]);

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
    (value: string, displayValue?: string) => {
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
        const shown = displayValue ?? value;
        setIncorrect(prev => [
          ...prev,
          {
            prompt: q.prompt,
            userAnswer: shown || null,
            correctAnswer: formatCorrectAnswer(q),
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

  const handleFractionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = fracNum.trim();
    const den = fracDen.trim();
    if (!num || !den) return;
    const combined = `${num}/${den}`;
    submit(combined, combined);
  };

  const handleLabelChoice = (label: string) => {
    if (feedback !== 'none') return;
    submit(label, label);
  };

  if (questions.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-2xl font-bold text-primary">Loading...</div>
      </div>
    );
  }

  const q = questions[currentIndex];
  const kind = q.expectedKind ?? 'number';
  const isPie = isPieSkill(q.skill);
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
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
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
            {isPie ? (
              <PieChart
                categories={q.categories}
                highlightIndices={q.skill === 'pie-fraction' ? q.targets : []}
                width={320}
                height={260}
              />
            ) : (
              <BarChart
                categories={q.categories}
                highlightIndices={q.targets}
                width={360}
                height={260}
                unit={q.unit}
              />
            )}
          </div>
          <p className="mt-3 text-base md:text-lg font-medium text-foreground">{q.prompt}</p>
          {feedback === 'incorrect' && (
            <div className="mt-3 text-2xl md:text-3xl font-bold text-destructive">
              {formatCorrectAnswer(q)}
            </div>
          )}
          {feedback === 'correct' && (
            <div className="mt-3 text-2xl md:text-3xl font-extrabold text-success">Brilliant!</div>
          )}
        </Card>

        {feedback === 'none' && kind === 'label' && (
          <div className="grid grid-cols-2 gap-2 md:gap-3">
            {q.categories.map((c, i) => (
              <Button
                key={`mc-${i}-${c.label}`}
                type="button"
                onClick={() => handleLabelChoice(c.label)}
                className="py-4 md:py-5 text-lg md:text-xl font-bold shadow-button bg-gradient-to-b from-primary via-primary/85 to-primary/65"
              >
                {c.label}
              </Button>
            ))}
          </div>
        )}

        {feedback === 'none' && kind === 'fraction' && (
          <form onSubmit={handleFractionSubmit} className="space-y-2 md:space-y-[13px]">
            <div className="flex items-center justify-center gap-2 md:gap-3">
              <Input
                ref={numRef}
                type="text"
                inputMode="numeric"
                value={fracNum}
                onChange={e => setFracNum(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="n"
                className="h-12 md:h-[64px] w-20 md:w-24 text-center text-2xl md:text-4xl font-bold"
                aria-label="numerator"
                autoFocus
              />
              <div className="text-3xl md:text-5xl font-bold text-muted-foreground">/</div>
              <Input
                type="text"
                inputMode="numeric"
                value={fracDen}
                onChange={e => setFracDen(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="d"
                className="h-12 md:h-[64px] w-20 md:w-24 text-center text-2xl md:text-4xl font-bold"
                aria-label="denominator"
              />
            </div>
            <Button
              type="submit"
              className="w-full py-3 md:py-[19px] text-lg md:text-xl font-bold shadow-button"
              disabled={!fracNum.trim() || !fracDen.trim()}
            >
              Check
            </Button>
          </form>
        )}

        {feedback === 'none' && kind === 'number' && (
          <form onSubmit={handleSubmit} className="space-y-2 md:space-y-[13px]">
            <Input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              value={typed}
              onChange={e => setTyped(e.target.value)}
              placeholder="Type your answer"
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
