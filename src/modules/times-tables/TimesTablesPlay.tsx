import { useState, useEffect, useCallback, useRef } from 'react';
import { Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { GameSettings, Question } from './logic';
import {
  generateQuestions,
  factChoices,
  getRandomPositiveMessage,
  factKey,
} from './logic';
import { NONE_OF_THESE, isChoiceCorrect } from '@/lib/game/choices';
import { recordAnswer } from './storage';
import { recordAttempt } from '@/lib/feedback/attemptLog';
import { recordPractice } from '@/lib/practice/recordPractice';
import { weightFor, recordFactAttempt, type FactStore } from '@/lib/practice/factModel';
import { loadFactStore, saveFactStore } from '@/lib/practice/factStore';
import { QuestionDisplay } from './QuestionDisplay';
import { FactArray } from './FactArray';
import { strategyFor } from './strategy';

interface TimesTablesPlayProps {
  settings: GameSettings;
  onComplete: (results: GameResults) => void;
  onQuit: () => void;
  userId?: string;
}

export type GameResultIncorrect =
  | {
      kind: 'binary';
      op: 'multiply' | 'divide';
      operand1: number;
      operand2: number;
      userAnswer: number | null;
      correctAnswer: number;
    }
  | {
      kind: 'unary';
      op: 'square' | 'sqrt';
      operand: number;
      userAnswer: number | null;
      correctAnswer: number;
    };

export interface GameResults {
  score: number;
  total: number;
  bestStreak: number;
  incorrectQuestions: GameResultIncorrect[];
  settings: GameSettings;
}

type FeedbackState = 'none' | 'correct' | 'incorrect';

export function TimesTablesPlay({ settings, onComplete, onQuit, userId }: TimesTablesPlayProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [incorrectQuestions, setIncorrectQuestions] = useState<GameResults['incorrectQuestions']>([]);
  const [feedback, setFeedback] = useState<FeedbackState>('none');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [options, setOptions] = useState<string[]>([]);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(settings.timeLimit);
  const [isComplete, setIsComplete] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef(Date.now());
  const loggedRef = useRef(false);
  // Adaptive engine: a per-fact store loaded once for this player, plus the
  // moment the current question appeared (for response-time tracking).
  const factStoreRef = useRef<FactStore>(loadFactStore(userId));
  const questionStartRef = useRef(Date.now());

  // Generate questions on mount, biased toward this player's weak/overdue facts.
  useEffect(() => {
    const count = settings.gameMode === 'questions' ? settings.questionCount : 100;
    const store = factStoreRef.current;
    const now = Date.now();
    const generated = generateQuestions(
      settings.tables,
      count,
      settings.operation,
      userId ? q => weightFor(store[factKey(q)], now) : undefined,
    );
    setQuestions(generated);
  }, [settings, userId]);

  // Generate options when question changes
  useEffect(() => {
    if (questions.length === 0 || currentIndex >= questions.length) return;

    const currentQuestion = questions[currentIndex];
    if (settings.difficulty !== 'hard') {
      // On medium, hide the answer ~1 in 4 so 'None of these' is the right pick.
      const hideCorrect = settings.difficulty === 'medium' && Math.random() < 0.25;
      setOptions(factChoices(currentQuestion.answer, settings.difficulty, hideCorrect));
    }
    setTypedAnswer('');
    questionStartRef.current = Date.now();

    // Focus input for hard mode
    if (settings.difficulty === 'hard' && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [currentIndex, questions, settings.difficulty]);

  // Timer for timed mode
  useEffect(() => {
    if (settings.gameMode !== 'time' || isComplete) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsComplete(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [settings.gameMode, isComplete]);

  // Complete game when finished
  useEffect(() => {
    if (isComplete) {
      onComplete({
        score,
        total: questionsAnswered,
        bestStreak,
        incorrectQuestions,
        settings,
      });
      // Log the session once, for a cloud-linked kid, so it feeds the dashboard.
      if (!loggedRef.current) {
        loggedRef.current = true;
        const end = new Date();
        recordPractice(userId, {
          module: 'times-tables',
          correct: score,
          total: questionsAnswered,
          durationSec: Math.max(1, Math.round((end.getTime() - startTimeRef.current) / 1000)),
          topics: settings.tables.map(t => `table-${t}`),
          startedAt: new Date(startTimeRef.current).toISOString(),
          endedAt: end.toISOString(),
        });
      }
    }
  }, [isComplete, score, questionsAnswered, bestStreak, incorrectQuestions, settings, onComplete, userId]);

  const submitAnswer = useCallback((isCorrect: boolean, userAnswer: number | null) => {
    const currentQuestion = questions[currentIndex];

    setQuestionsAnswered(prev => prev + 1);
    recordAnswer(currentQuestion, isCorrect, userId);

    // Adaptive engine: record this fact's outcome + response time on-device.
    if (userId) {
      const ms = Date.now() - questionStartRef.current;
      factStoreRef.current = recordFactAttempt(factStoreRef.current, factKey(currentQuestion), isCorrect, ms);
      saveFactStore(userId, factStoreRef.current);
    }

    const prompt = currentQuestion.kind === 'binary'
      ? `${currentQuestion.operand1} ${currentQuestion.op === 'multiply' ? '×' : '÷'} ${currentQuestion.operand2}`
      : currentQuestion.op === 'square' ? `${currentQuestion.operand}²` : `√${currentQuestion.operand}`;
    recordAttempt({
      module: 'times-tables',
      question: prompt,
      typed: userAnswer === null ? '' : String(userAnswer),
      correct: isCorrect,
      expected: String(currentQuestion.answer),
    });

    if (isCorrect) {
      setScore(prev => prev + 1);
      setStreak(prev => {
        const next = prev + 1;
        setBestStreak(b => Math.max(b, next));
        return next;
      });
      setFeedback('correct');
      setFeedbackMessage(getRandomPositiveMessage());
    } else {
      setStreak(0);
      setFeedback('incorrect');
      setFeedbackMessage('');
      if (currentQuestion.kind === 'binary') {
        setIncorrectQuestions(prev => [
          ...prev,
          {
            kind: 'binary',
            op: currentQuestion.op,
            operand1: currentQuestion.operand1,
            operand2: currentQuestion.operand2,
            userAnswer,
            correctAnswer: currentQuestion.answer,
          },
        ]);
      } else {
        setIncorrectQuestions(prev => [
          ...prev,
          {
            kind: 'unary',
            op: currentQuestion.op,
            operand: currentQuestion.operand,
            userAnswer,
            correctAnswer: currentQuestion.answer,
          },
        ]);
      }
    }

    const delay = isCorrect ? 800 : 1400;
    setTimeout(() => {
      setFeedback('none');
      const nextIndex = currentIndex + 1;

      if (settings.gameMode === 'questions' && nextIndex >= settings.questionCount) {
        setIsComplete(true);
      } else if (nextIndex >= questions.length) {
        setIsComplete(true);
      } else {
        setCurrentIndex(nextIndex);
      }
    }, delay);
  }, [currentIndex, questions, settings, userId]);

  const handleSubmitTyped = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(typedAnswer, 10);
    const userAnswer = isNaN(parsed) ? null : parsed;
    submitAnswer(userAnswer === questions[currentIndex].answer, userAnswer);
  };

  // A multiple-choice pick. 'None of these' is correct when the answer was
  // hidden (no shown option grades right); otherwise the numeric pick is graded.
  const handleChoose = (option: string) => {
    const answer = questions[currentIndex].answer;
    const isCorrect = isChoiceCorrect(option, options, c => Number(c) !== answer);
    const userAnswer = option === NONE_OF_THESE ? null : Number(option);
    submitAnswer(isCorrect, userAnswer);
  };

  if (questions.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-2xl font-bold text-primary">Loading...</div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = settings.gameMode === 'questions'
    ? (currentIndex / settings.questionCount) * 100
    : ((settings.timeLimit - timeLeft) / settings.timeLimit) * 100;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background py-2 px-3 md:py-[26px] md:px-8">
      <div className="mx-auto max-w-xl">
        {/* Header with progress */}
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
                <span className={cn(
                  'font-bold text-lg md:text-xl',
                  timeLeft <= 30 ? 'text-destructive' : 'text-foreground'
                )}>
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
            <div
              className="mt-2 flex justify-center"
              role="status"
              aria-live="polite"
            >
              <span
                key={streak}
                className="animate-bounce-in inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-3 py-1 text-sm font-bold text-white shadow-lg"
              >
                <Flame className="w-4 h-4" aria-hidden="true" />
                {streak} in a row!
              </span>
            </div>
          )}
        </div>

        {/* Question Card */}
        <Card className={cn(
          'mb-3 md:mb-[19px] py-4 md:py-[26px] px-4 md:px-8 text-center shadow-card transition-all',
          feedback === 'correct' && 'animate-pop bg-success/10',
          feedback === 'incorrect' && 'animate-shake bg-destructive/10'
        )}>
          {feedback === 'none' ? (
            <>
              <div className="mb-1 md:mb-2 text-5xl md:text-6xl lg:text-7xl font-extrabold text-foreground">
                <QuestionDisplay q={currentQuestion} />
              </div>
              <div className="text-2xl md:text-3xl font-bold text-muted-foreground">=  ?</div>
            </>
          ) : (
            <>
              <div className={cn(
                'mb-2 md:mb-4 text-2xl md:text-3xl font-extrabold animate-bounce-in',
                feedback === 'correct' ? 'text-success' : 'text-destructive'
              )}>
                {feedback === 'correct' ? feedbackMessage : 'Not quite!'}
              </div>
              <div className="text-3xl md:text-4xl font-bold text-foreground">
                <QuestionDisplay q={currentQuestion} /> = {currentQuestion.answer}
              </div>
              {feedback === 'incorrect' && (
                <>
                  <FactArray q={currentQuestion} />
                  <p className="mt-2 text-sm md:text-base font-medium text-muted-foreground">
                    {strategyFor(currentQuestion)}
                  </p>
                </>
              )}
            </>
          )}
        </Card>

        {/* Answer Options */}
        {feedback === 'none' && (
          <>
            {settings.difficulty === 'hard' ? (
              <form onSubmit={handleSubmitTyped} className="space-y-2 md:space-y-[13px]">
                <Input
                  ref={inputRef}
                  type="number"
                  inputMode="numeric"
                  value={typedAnswer}
                  onChange={(e) => setTypedAnswer(e.target.value)}
                  placeholder="Type your answer"
                  aria-label="Type the answer"
                  className="h-12 md:h-[64px] text-center text-2xl md:text-4xl font-bold"
                  autoFocus
                />
                <Button
                  type="submit"
                  className="w-full py-3 md:py-[19px] text-lg md:text-xl font-bold shadow-button"
                  disabled={typedAnswer === ''}
                >
                  Check
                </Button>
              </form>
            ) : (
              <div className="grid grid-cols-3 gap-x-2 md:gap-x-4 gap-y-2 md:gap-y-[13px]">
                {options.map((option, idx) => (
                  <Button
                    key={idx}
                    onClick={() => handleChoose(option)}
                    variant="outline"
                    className={cn(
                      'h-12 md:h-[64px] font-bold transition-all hover:scale-105 hover:bg-primary hover:text-primary-foreground active:scale-95',
                      option === NONE_OF_THESE
                        ? 'col-span-3 text-lg md:text-xl'
                        : 'text-2xl md:text-3xl',
                    )}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
