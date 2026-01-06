import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { GameSettings, Question } from '@/lib/gameLogic';
import {
  generateQuestions,
  generateWrongAnswers,
  shuffleOptions,
  getRandomPositiveMessage,
} from '@/lib/gameLogic';
import { recordAnswer } from '@/lib/gameStorage';

interface GamePlayProps {
  settings: GameSettings;
  onComplete: (results: GameResults) => void;
  onQuit: () => void;
}

export interface GameResults {
  score: number;
  total: number;
  incorrectQuestions: Array<{
    multiplier: number;
    multiplicand: number;
    userAnswer: number | null;
    correctAnswer: number;
  }>;
  settings: GameSettings;
}

type FeedbackState = 'none' | 'correct' | 'incorrect';

export function GamePlay({ settings, onComplete, onQuit }: GamePlayProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [incorrectQuestions, setIncorrectQuestions] = useState<GameResults['incorrectQuestions']>([]);
  const [feedback, setFeedback] = useState<FeedbackState>('none');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [options, setOptions] = useState<number[]>([]);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(settings.timeLimit);
  const [isComplete, setIsComplete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate questions on mount
  useEffect(() => {
    const count = settings.gameMode === 'questions' ? settings.questionCount : 100;
    const generated = generateQuestions(settings.tables, count);
    setQuestions(generated);
  }, [settings]);

  // Generate options when question changes
  useEffect(() => {
    if (questions.length === 0 || currentIndex >= questions.length) return;
    
    const currentQuestion = questions[currentIndex];
    if (settings.difficulty !== 'hard') {
      const wrong = generateWrongAnswers(currentQuestion.answer, settings.difficulty);
      setOptions(shuffleOptions(currentQuestion.answer, wrong));
    }
    setTypedAnswer('');
    
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
        incorrectQuestions,
        settings,
      });
    }
  }, [isComplete, score, questionsAnswered, incorrectQuestions, settings, onComplete]);

  const handleAnswer = useCallback((userAnswer: number | null) => {
    const currentQuestion = questions[currentIndex];
    const isCorrect = userAnswer === currentQuestion.answer;

    // Track answered questions
    setQuestionsAnswered(prev => prev + 1);

    // Record progress
    recordAnswer(currentQuestion.multiplier, currentQuestion.multiplicand, isCorrect);

    if (isCorrect) {
      setScore(prev => prev + 1);
      setFeedback('correct');
      setFeedbackMessage(getRandomPositiveMessage());
    } else {
      setFeedback('incorrect');
      setFeedbackMessage(`${currentQuestion.multiplier} × ${currentQuestion.multiplicand} = ${currentQuestion.answer}`);
      setIncorrectQuestions(prev => [
        ...prev,
        {
          multiplier: currentQuestion.multiplier,
          multiplicand: currentQuestion.multiplicand,
          userAnswer,
          correctAnswer: currentQuestion.answer,
        },
      ]);
    }

    // Move to next question after delay
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
    }, 1200);
  }, [currentIndex, questions, settings]);

  const handleSubmitTyped = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(typedAnswer, 10);
    handleAnswer(isNaN(parsed) ? null : parsed);
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
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-xl">
        {/* Header with progress */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <Button variant="ghost" onClick={onQuit} className="text-muted-foreground">
              ← Quit
            </Button>
            <div className="text-center">
              <span className="text-2xl font-bold text-primary">{score}</span>
              <span className="text-muted-foreground"> correct</span>
            </div>
            <div className="text-right">
              {settings.gameMode === 'questions' ? (
                <span className="font-bold">
                  {currentIndex + 1} / {settings.questionCount}
                </span>
              ) : (
                <span className={cn(
                  'font-bold text-xl',
                  timeLeft <= 30 ? 'text-destructive' : 'text-foreground'
                )}>
                  {formatTime(timeLeft)}
                </span>
              )}
            </div>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <Card className={cn(
          'mb-6 p-8 text-center shadow-card transition-all',
          feedback === 'correct' && 'animate-pop bg-success/10',
          feedback === 'incorrect' && 'animate-shake bg-destructive/10'
        )}>
          {feedback === 'none' ? (
            <>
              <div className="mb-2 text-6xl font-extrabold text-foreground md:text-7xl">
                {currentQuestion.multiplier} × {currentQuestion.multiplicand}
              </div>
              <div className="text-3xl font-bold text-muted-foreground">=  ?</div>
            </>
          ) : (
            <>
              <div className={cn(
                'mb-4 text-3xl font-extrabold animate-bounce-in',
                feedback === 'correct' ? 'text-success' : 'text-destructive'
              )}>
                {feedback === 'correct' ? feedbackMessage : 'Not quite!'}
              </div>
              <div className="text-4xl font-bold text-foreground">
                {currentQuestion.multiplier} × {currentQuestion.multiplicand} = {currentQuestion.answer}
              </div>
            </>
          )}
        </Card>

        {/* Answer Options */}
        {feedback === 'none' && (
          <>
            {settings.difficulty === 'hard' ? (
              <form onSubmit={handleSubmitTyped} className="space-y-4">
                <Input
                  ref={inputRef}
                  type="number"
                  inputMode="numeric"
                  value={typedAnswer}
                  onChange={(e) => setTypedAnswer(e.target.value)}
                  placeholder="Type your answer"
                  className="h-20 text-center text-4xl font-bold"
                  autoFocus
                />
                <Button
                  type="submit"
                  className="w-full py-6 text-xl font-bold shadow-button"
                  disabled={typedAnswer === ''}
                >
                  Check
                </Button>
              </form>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {options.map((option, idx) => (
                  <Button
                    key={idx}
                    onClick={() => handleAnswer(option)}
                    variant="outline"
                    className="h-20 text-3xl font-bold transition-all hover:scale-105 hover:bg-primary hover:text-primary-foreground active:scale-95"
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
