import { useEffect } from 'react';
import { Star, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import type { ArithGameResult } from './ArithmeticPlay';
import { saveArithSession } from './storage';
import { useT } from '@/lib/i18n/react';

interface Props {
  result: ArithGameResult;
  onPlayAgain: () => void;
  onNewGame: () => void;
  userId?: string;
}

const symbol = (op: 'add' | 'subtract' | 'multiply' | 'divide') =>
  op === 'add' ? '+' : op === 'subtract' ? '−' : op === 'multiply' ? '×' : '÷';

export function ArithmeticResults({ result, onPlayAgain, onNewGame, userId }: Props) {
  const { t } = useT();
  const percentage = result.total > 0 ? Math.round((result.score / result.total) * 100) : 0;
  const stars =
    percentage === 100 ? 5
      : percentage >= 90 ? 4
      : percentage >= 75 ? 3
      : percentage >= 50 ? 2
      : percentage >= 25 ? 1
      : 0;

  useEffect(() => {
    saveArithSession(
      {
        date: new Date().toISOString(),
        score: result.score,
        total: result.total,
        operation: result.settings.operation,
        difficulty: result.settings.difficulty,
        addSubFirstDigits: result.settings.addSubFirstDigits,
        addSubSecondDigits: result.settings.addSubSecondDigits,
      },
      userId
    );

    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || percentage < 80) return;
    if (percentage === 100) {
      confetti({ origin: { y: 0.7 }, spread: 90, particleCount: 120, startVelocity: 45 });
    } else {
      confetti({ origin: { y: 0.7 }, spread: 70, particleCount: 80 });
    }
  }, [result, userId, percentage]);

  const message =
    percentage === 100 ? t('arithmetic.results.perfectScore')
      : percentage >= 80 ? t('arithmetic.results.brilliantWork')
      : percentage >= 60 ? t('arithmetic.results.goodEffort')
      : percentage >= 40 ? t('arithmetic.results.niceTry')
      : t('arithmetic.results.keepPractising');

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 text-center">
          <div className="mb-3 flex justify-center gap-1" aria-label={t('arithmetic.results.starsAriaLabel', { stars })}>
            {[1, 2, 3, 4, 5].map(n => (
              <Star
                key={n}
                className={cn(
                  'w-10 h-10 md:w-14 md:h-14 transition-all',
                  n <= stars ? 'fill-yellow-400 text-yellow-500' : 'fill-muted text-muted-foreground/40'
                )}
              />
            ))}
          </div>
          <div
            className={cn(
              'mb-4 inline-block rounded-full px-6 py-3',
              percentage >= 80 ? 'bg-success/20' : percentage >= 50 ? 'bg-secondary' : 'bg-accent/20'
            )}
          >
            <div className="text-5xl font-extrabold text-foreground md:text-6xl">
              {result.score}/{result.total}
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{message}</p>
          <p className="mt-2 text-muted-foreground">{t('arithmetic.results.percentCorrect', { percent: percentage })}</p>
          {result.bestStreak >= 3 && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-3 py-1 text-sm font-bold text-white shadow-lg">
              <Flame className="w-4 h-4" />
              {t('arithmetic.results.bestStreak', { count: result.bestStreak })}
            </div>
          )}
        </div>

        {result.incorrectQuestions.length > 0 && (
          <Card className="mb-4 p-4">
            <h3 className="mb-3 font-bold text-foreground">{t('arithmetic.results.questionsToPractise')}</h3>
            <div className="space-y-2">
              {result.incorrectQuestions.map((q, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-lg bg-muted px-4 py-2">
                  <span className="font-medium">
                    {q.operand1} {symbol(q.op)} {q.operand2} = {q.correctAnswer}
                  </span>
                  {q.userAnswer !== null && (
                    <span className="text-sm text-destructive">{t('arithmetic.results.youSaid', { answer: q.userAnswer })}</span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="space-y-3">
          <Button onClick={onPlayAgain} className="w-full py-6 text-xl font-bold shadow-button">{t('arithmetic.results.playAgain')}</Button>
          <Button onClick={onNewGame} variant="outline" className="w-full py-4 font-bold">{t('arithmetic.results.changeSettings')}</Button>
        </div>
      </div>
    </div>
  );
}
