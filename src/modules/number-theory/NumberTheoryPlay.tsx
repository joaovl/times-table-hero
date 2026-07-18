import { recordPractice } from '@/lib/practice/recordPractice';
import { getCurrentUser } from '@/lib/userStorage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VisualQuestion } from '@/components/VisualQuestion';
import { cn } from '@/lib/utils';
import type { NumberTheoryQuestion, NumberTheorySettings } from './logic';
import {
  BOOL_SKILLS,
  LIST_SKILLS,
  NUMBER_SKILLS,
  answerString,
  generateNumberTheoryQuestions,
  isAnswerCorrect,
  promptFor,
} from './logic';
import { useT } from '@/lib/i18n/react';
import { t } from '@/lib/i18n/i18n';

export interface NumberTheoryGameResult {
  score: number;
  total: number;
  bestStreak: number;
  incorrectQuestions: Array<{
    prompt: string;
    correctAnswer: string;
    userAnswer: string | null;
  }>;
  settings: NumberTheorySettings;
}

interface Props {
  settings: NumberTheorySettings;
  onComplete: (r: NumberTheoryGameResult) => void;
  onQuit: () => void;
}

/**
 * Render a question prompt in a presentation-friendly form. For skills where
 * the prompt benefits from showing the math notation distinctly (square /
 * cube / square-root) we render the operand large with the operator next
 * to it; everything else is the bare prompt text.
 */
function PromptDisplay({ q }: { q: NumberTheoryQuestion }) {
  if (q.skill === 'square') {
    return (
      <div className="font-mono text-5xl md:text-6xl font-extrabold text-foreground tracking-wider inline-block">
        {q.base}
        <sup className="text-3xl md:text-4xl align-super">2</sup>
        {' = ?'}
      </div>
    );
  }
  if (q.skill === 'cube') {
    return (
      <div className="font-mono text-5xl md:text-6xl font-extrabold text-foreground tracking-wider inline-block">
        {q.base}
        <sup className="text-3xl md:text-4xl align-super">3</sup>
        {' = ?'}
      </div>
    );
  }
  if (q.skill === 'square-root') {
    // Use the U+221A glyph for online display only — the browser font
    // renders it just fine. The PDF path never sees this glyph.
    return (
      <div className="font-mono text-5xl md:text-6xl font-extrabold text-foreground tracking-wider inline-block">
        √{q.base} = ?
      </div>
    );
  }
  return (
    <div className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
      {promptFor(q)}
    </div>
  );
}

export function NumberTheoryPlay({ settings, onComplete, onQuit }: Props) {
  const { t: tt } = useT();
  const [questions, setQuestions] = useState<NumberTheoryQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [incorrect, setIncorrect] = useState<NumberTheoryGameResult['incorrectQuestions']>([]);
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'incorrect'>('none');
  const [typed, setTyped] = useState('');
  const [timeLeft, setTimeLeft] = useState(settings.timeLimit);
  const [isComplete, setIsComplete] = useState(false);
  const startTimeRef = useRef(Date.now());
  const loggedRef = useRef(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const count = settings.gameMode === 'questions' ? settings.questionCount : 200;
    setQuestions(generateNumberTheoryQuestions(settings, count));
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
      if (!loggedRef.current) {
        loggedRef.current = true;
        const end = new Date();
        recordPractice(getCurrentUser()?.id, {
          module: 'number-theory',
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
    (typedValue: string, boolValue: boolean | null) => {
      if (questions.length === 0) return;
      const q = questions[currentIndex];
      const correct = isAnswerCorrect(q, typedValue, boolValue);
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
        const userDisplay =
          boolValue !== null
            ? boolValue
              ? t('numberTheory.play.yes')
              : t('numberTheory.play.no')
            : typedValue.trim() || null;
        setIncorrect(prev => [
          ...prev,
          {
            prompt: promptFor(q),
            correctAnswer: answerString(q),
            userAnswer: userDisplay,
          },
        ]);
      }

      const delay = correct ? 800 : 1500;
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
    submit(typed, null);
  };

  if (questions.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-2xl font-bold text-primary">{tt('common.loading')}</div>
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

  const isList = (LIST_SKILLS as readonly string[]).includes(q.skill);
  const isBool = (BOOL_SKILLS as readonly string[]).includes(q.skill);
  const isNumber = (NUMBER_SKILLS as readonly string[]).includes(q.skill);

  const placeholder = isList
    ? tt('numberTheory.play.listPlaceholder')
    : isNumber
      ? tt('numberTheory.play.typeTheAnswer')
      : '';

  return (
    <div className="min-h-screen bg-background py-2 px-3 md:py-[26px] md:px-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-3 md:mb-[19px]">
          <div className="mb-2 flex items-center justify-between">
            <Button variant="ghost" onClick={onQuit} className="text-muted-foreground h-11">
              {tt('numberTheory.play.quit')}
            </Button>
            <div className="text-center">
              <span className="text-xl md:text-2xl font-bold text-primary">{score}</span>
              <span className="text-sm md:text-base text-muted-foreground">{tt('numberTheory.play.correct')}</span>
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
                {tt('numberTheory.play.streak', { count: streak })}
              </span>
            </div>
          )}
        </div>

        <VisualQuestion
          feedback={feedback}
          promptText={<PromptDisplay q={q} />}
          correctAnswerHint={answerString(q)}
        >
          {feedback === 'none' && isBool && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => submit('', true)}
                className="py-6 text-xl font-bold shadow-button"
              >
                {tt('numberTheory.play.yesButton')}
              </Button>
              <Button
                onClick={() => submit('', false)}
                variant="outline"
                className="py-6 text-xl font-bold"
              >
                {tt('numberTheory.play.noButton')}
              </Button>
            </div>
          )}

          {feedback === 'none' && !isBool && (
            <form onSubmit={handleSubmit} className="space-y-2 md:space-y-[13px]">
              <Input
                ref={inputRef}
                type="text"
                inputMode={isList ? 'text' : 'numeric'}
                value={typed}
                onChange={e => setTyped(e.target.value)}
                placeholder={placeholder}
                aria-label={tt('numberTheory.play.typeTheAnswer')}
                className="h-12 md:h-[64px] text-center text-2xl md:text-4xl font-bold"
                autoFocus
              />
              <Button
                type="submit"
                className="w-full py-3 md:py-[19px] text-lg md:text-xl font-bold shadow-button"
                disabled={typed.trim() === ''}
              >
                {tt('numberTheory.play.check')}
              </Button>
            </form>
          )}
        </VisualQuestion>
      </div>
    </div>
  );
}
