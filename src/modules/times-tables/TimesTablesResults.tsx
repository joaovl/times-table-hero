import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { GameResults as GameResultsType } from './TimesTablesPlay';
import { getProgress, getQuestionKey, saveSession } from './storage';
import type { Question } from './logic';
import { QuestionDisplay } from './QuestionDisplay';
import { useEffect, useState } from 'react';
import { Star, Flame } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useT } from '@/lib/i18n/react';

interface TimesTablesResultsProps {
  results: GameResultsType;
  onPlayAgain: () => void;
  onNewGame: () => void;
  userId?: string;
}

export function TimesTablesResults({ results, onPlayAgain, onNewGame, userId }: TimesTablesResultsProps) {
  const { t } = useT();
  const [improved, setImproved] = useState<string[]>([]);
  const [stillChallenging, setStillChallenging] = useState<string[]>([]);

  const percentage = results.total > 0 ? Math.round((results.score / results.total) * 100) : 0;
  const stars = percentage === 100 ? 5
    : percentage >= 90 ? 4
    : percentage >= 75 ? 3
    : percentage >= 50 ? 2
    : percentage >= 25 ? 1
    : 0;

  const getScoreMessage = () => {
    if (percentage === 100) return t('timesTables.results.perfectScore');
    if (percentage >= 80) return t('timesTables.results.brilliantWork');
    if (percentage >= 60) return t('timesTables.results.goodEffort');
    if (percentage >= 40) return t('timesTables.results.niceTry');
    return t('timesTables.results.keepPractising');
  };

  // Celebration confetti for high scores
  useEffect(() => {
    const reduced = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || percentage < 80) return;
    const fire = (opts: confetti.Options) =>
      confetti({ origin: { y: 0.7 }, ...opts });
    if (percentage === 100) {
      fire({ spread: 90, particleCount: 120, startVelocity: 45 });
      setTimeout(() => fire({ spread: 60, particleCount: 80, angle: 60 }), 200);
      setTimeout(() => fire({ spread: 60, particleCount: 80, angle: 120 }), 400);
    } else {
      fire({ spread: 70, particleCount: 80 });
    }
  }, [percentage]);

  useEffect(() => {
    saveSession({
      date: new Date().toISOString(),
      score: results.score,
      total: results.total,
      difficulty: results.settings.difficulty,
      tables: results.settings.tables,
      incorrectQuestions: results.incorrectQuestions.map(q => {
        if (q.kind === 'binary') {
          return {
            multiplier: q.operand1,
            multiplicand: q.operand2,
            userAnswer: q.userAnswer,
            correctAnswer: q.correctAnswer,
          };
        }
        return {
          multiplier: q.operand,
          multiplicand: q.correctAnswer,
          userAnswer: q.userAnswer,
          correctAnswer: q.correctAnswer,
        };
      }),
    }, userId);

    const progress = getProgress(userId);
    const improvedList: string[] = [];
    const challengingList: string[] = [];

    results.incorrectQuestions.forEach(q => {
      if (q.kind !== 'binary' || q.op !== 'multiply') return;
      const key = getQuestionKey({
        kind: 'binary',
        op: 'multiply',
        operand1: q.operand1,
        operand2: q.operand2,
        answer: q.correctAnswer,
      });
      const record = progress[key];
      if (record && record.timesWrong > 1) {
        challengingList.push(`${q.operand1} × ${q.operand2}`);
      }
    });

    Object.values(progress).forEach(record => {
      if (record.op && record.op !== 'multiply') return;
      if (record.timesWrong > 0 && record.timesCorrect > 0) {
        const wasWrongThisSession = results.incorrectQuestions.some(
          q =>
            q.kind === 'binary' &&
            q.op === 'multiply' &&
            q.operand1 === record.multiplier &&
            q.operand2 === record.multiplicand
        );
        if (!wasWrongThisSession && results.settings.tables.includes(record.multiplier)) {
          improvedList.push(`${record.multiplier} × ${record.multiplicand}`);
        }
      }
    });

    setImproved(improvedList.slice(0, 5));
    setStillChallenging(challengingList);
  }, [results, userId]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-xl">
        {/* Score Header */}
        <div className="mb-8 text-center">
          {/* Stars */}
          <div className="mb-3 flex justify-center gap-1" aria-label={t('timesTables.results.starsAriaLabel', { stars })}>
            {[1, 2, 3, 4, 5].map(n => (
              <Star
                key={n}
                className={cn(
                  'w-10 h-10 md:w-14 md:h-14 transition-all',
                  n <= stars ? 'fill-yellow-400 text-yellow-500' : 'fill-muted text-muted-foreground/40'
                )}
                aria-hidden="true"
              />
            ))}
          </div>
          <div className={cn(
            'mb-4 inline-block rounded-full px-6 py-3',
            percentage >= 80 ? 'bg-success/20' : percentage >= 50 ? 'bg-secondary' : 'bg-accent/20'
          )}>
            <div className="text-5xl font-extrabold text-foreground md:text-6xl">
              {results.score}/{results.total}
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{getScoreMessage()}</p>
          <p className="mt-2 text-muted-foreground">
            {t('timesTables.results.percentCorrect', { percent: percentage })}
          </p>
          {results.bestStreak >= 3 && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-3 py-1 text-sm font-bold text-white shadow-lg">
              <Flame className="w-4 h-4" aria-hidden="true" />
              {t('timesTables.results.bestStreak', { count: results.bestStreak })}
            </div>
          )}
        </div>

        {/* Improvements */}
        {improved.length > 0 && (
          <Card className="mb-4 border-success/30 bg-success/10 p-4">
            <h3 className="mb-2 font-bold text-success">{t('timesTables.results.youveImproved')}</h3>
            <p className="text-sm text-foreground">
              {t('timesTables.results.trickyBefore')}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {improved.map(q => (
                <span key={q} className="rounded-lg bg-success/20 px-3 py-1 text-sm font-medium">
                  {q}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* Incorrect Questions */}
        {results.incorrectQuestions.length > 0 && (
          <Card className="mb-4 p-4">
            <h3 className="mb-3 font-bold text-foreground">{t('timesTables.results.questionsToPractise')}</h3>
            <div className="space-y-2">
              {results.incorrectQuestions.map((q, idx) => {
                const asQuestion: Question =
                  q.kind === 'binary'
                    ? { kind: 'binary', op: q.op, operand1: q.operand1, operand2: q.operand2, answer: q.correctAnswer }
                    : { kind: 'unary', op: q.op, operand: q.operand, answer: q.correctAnswer };
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg bg-muted px-4 py-2"
                  >
                    <span className="font-medium">
                      <QuestionDisplay q={asQuestion} /> = {q.correctAnswer}
                    </span>
                    {q.userAnswer !== null && (
                      <span className="text-sm text-destructive">
                        {t('timesTables.results.youSaid', { answer: q.userAnswer })}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Still Challenging */}
        {stillChallenging.length > 0 && (
          <Card className="mb-6 border-accent/30 bg-accent/10 p-4">
            <h3 className="mb-2 font-bold text-accent">{t('timesTables.results.keepWorkingOn')}</h3>
            <div className="flex flex-wrap gap-2">
              {stillChallenging.map(q => (
                <span key={q} className="rounded-lg bg-accent/20 px-3 py-1 text-sm font-medium">
                  {q}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={onPlayAgain}
            className="w-full py-6 text-xl font-bold shadow-button"
          >
            {t('timesTables.results.playAgain')}
          </Button>
          <Button
            onClick={onNewGame}
            variant="outline"
            className="w-full py-4 font-bold"
          >
            {t('timesTables.results.changeSettings')}
          </Button>
        </div>
      </div>
    </div>
  );
}
