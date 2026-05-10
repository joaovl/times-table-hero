import { useCallback, useEffect, useRef, useState } from 'react';
import { Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { TimeQuestion, TimeSettings } from './logic';
import {
  expectedAnswerString,
  formatArithEquation,
  generateTimeQuestions,
  isAnswerCorrect,
} from './logic';
import { ClockDisplay } from './ClockDisplay';

export interface TimeIncorrect {
  skill: 'read' | 'arith';
  /** Plain-text prompt shown in the "times to practise" list. For
   *  read-clock this is e.g. "Clock shows 3:45"; for arith it's the
   *  equation, e.g. "3:45 + 20 minutes". */
  prompt: string;
  format: '12h' | '24h';
  userAnswer: string | null;
  correctAnswer: string;
}

export interface TimeGameResult {
  score: number;
  total: number;
  bestStreak: number;
  incorrectQuestions: TimeIncorrect[];
  settings: TimeSettings;
}

interface Props {
  settings: TimeSettings;
  onComplete: (r: TimeGameResult) => void;
  onQuit: () => void;
}

function promptString(q: TimeQuestion): string {
  if (q.skill === 'arith') return formatArithEquation(q).replace(/\s*=\s*$/, '');
  const t = q.format === '24h' ? q.answer24h : q.answer12h;
  return `Clock shows ${t}`;
}

export function TimePlay({ settings, onComplete, onQuit }: Props) {
  const [questions, setQuestions] = useState<TimeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [incorrect, setIncorrect] = useState<TimeIncorrect[]>([]);
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'incorrect'>('none');
  const [typed, setTyped] = useState('');
  const [timeLeft, setTimeLeft] = useState(settings.timeLimit);
  const [isComplete, setIsComplete] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const count = settings.gameMode === 'questions' ? settings.questionCount : 200;
    setQuestions(generateTimeQuestions(settings, count));
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

  const submit = useCallback((value: string) => {
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
          skill: q.skill,
          prompt: promptString(q),
          format: q.format,
          userAnswer: value || null,
          correctAnswer: expectedAnswerString(q),
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
  }, [currentIndex, questions, settings]);

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

  // Placeholder hint for the input. 12h-arith answers include AM/PM so the
  // hint sample also includes it.
  const placeholder =
    q.skill === 'arith'
      ? q.format === '24h' ? 'e.g. 14:05' : 'e.g. 4:05 PM'
      : q.format === '24h' ? 'e.g. 14:30' : 'e.g. 3:45';

  const typeHint =
    q.skill === 'arith'
      ? q.format === '24h'
        ? 'Type the time (24-hour)'
        : 'Type the time with AM or PM'
      : q.format === '24h'
        ? 'Type the time (24-hour)'
        : 'Type the time (12-hour)';

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
          {q.skill === 'arith' ? (
            <div className="flex flex-col items-center text-foreground">
              <div className="text-3xl md:text-5xl font-extrabold tracking-tight">
                {formatArithEquation(q)}
              </div>
            </div>
          ) : (
            <div className="flex justify-center text-foreground">
              <ClockDisplay hours={q.hours} minutes={q.minutes} size={240} />
            </div>
          )}
          <p className="mt-3 text-sm md:text-base text-muted-foreground">{typeHint}</p>
          {feedback === 'incorrect' && (
            <div className="mt-3 text-2xl md:text-3xl font-bold text-destructive">
              {expectedAnswerString(q)}
            </div>
          )}
          {feedback === 'correct' && (
            <div className="mt-3 text-2xl md:text-3xl font-extrabold text-success">Brilliant!</div>
          )}
        </Card>

        {feedback === 'none' && (
          <form onSubmit={handleSubmit} className="space-y-2 md:space-y-[13px]">
            <Input
              ref={inputRef}
              type="text"
              // 12h-arith answers include AM/PM letters — keep the input
              // text-based rather than numeric so the on-screen keyboard
              // shows letters by default.
              inputMode={q.skill === 'arith' && q.format === '12h' ? 'text' : 'numeric'}
              value={typed}
              onChange={e => setTyped(e.target.value)}
              placeholder={placeholder}
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
