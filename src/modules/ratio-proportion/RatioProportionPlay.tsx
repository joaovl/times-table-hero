import { recordPractice } from '@/lib/practice/recordPractice';
import { getCurrentUser } from '@/lib/userStorage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AnswerChoices } from '@/components/game/AnswerChoices';
import { cn } from '@/lib/utils';
import type { RatioQuestion, RatioSettings } from './logic';
import {
  generateRatioQuestions,
  generateRatioChoices,
  checkRatioAnswer,
  answerText,
  questionPromptText,
  isRatioShareQuestion,
  isRatioSimplifyQuestion,
} from './logic';

export interface RatioIncorrectEntry {
  question: RatioQuestion;
  userAnswer: string;
}

export interface RatioGameResult {
  score: number;
  total: number;
  bestStreak: number;
  incorrectQuestions: RatioIncorrectEntry[];
  settings: RatioSettings;
}

interface Props {
  settings: RatioSettings;
  onComplete: (r: RatioGameResult) => void;
  onQuit: () => void;
}

export function RatioProportionPlay({ settings, onComplete, onQuit }: Props) {
  const [questions, setQuestions] = useState<RatioQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [incorrect, setIncorrect] = useState<RatioIncorrectEntry[]>([]);
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
    setQuestions(generateRatioQuestions(settings, count));
  }, [settings]);

  useEffect(() => {
    setTyped('');
    if (questions.length > 0 && settings.difficulty !== 'hard') {
      setChoices(generateRatioChoices(questions[currentIndex], settings.difficulty));
    }
    if (settings.difficulty === 'hard') setTimeout(() => inputRef.current?.focus(), 50);
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
          module: 'ratio-proportion',
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
      const isCorrect = checkRatioAnswer(q, input);
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

  // Pick placeholder based on shape.
  let placeholder = 'Type the answer';
  const inputType: 'number' | 'text' = isRatioShareQuestion(q) || isRatioSimplifyQuestion(q) ? 'text' : 'number';
  const inputMode: 'numeric' | 'text' = inputType === 'number' ? 'numeric' : 'text';
  if (isRatioShareQuestion(q)) placeholder = 'e.g. 15 and 25';
  else if (isRatioSimplifyQuestion(q)) placeholder = 'e.g. 2:3';

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
          <p className="text-sm md:text-base font-semibold text-muted-foreground mb-3">
            Work it out
          </p>
          <div className="font-mono text-3xl md:text-4xl font-extrabold text-foreground">
            {questionPromptText(q)}
          </div>
          {feedback === 'incorrect' && (
            <div className="mt-4 text-xl md:text-2xl font-bold text-destructive break-words">
              Answer: {answerText(q)}
            </div>
          )}
          {feedback === 'correct' && (
            <div className="mt-3 text-2xl md:text-3xl font-extrabold text-success">Brilliant!</div>
          )}
        </Card>

        {feedback === 'none' && (
          settings.difficulty === 'hard' ? (
            <form onSubmit={handleSubmit} className="space-y-2 md:space-y-[13px]">
              <Input
                ref={inputRef}
                type={inputType}
                inputMode={inputMode}
                value={typed}
                onChange={e => setTyped(e.target.value)}
                placeholder={placeholder}
                aria-label="Type the answer"
                className="h-12 md:h-[64px] text-center text-xl md:text-3xl font-bold"
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
          ) : (
            <AnswerChoices options={choices} onChoose={submit} />
          )
        )}
      </div>
    </div>
  );
}
