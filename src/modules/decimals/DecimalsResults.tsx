import { useEffect } from 'react';
import { Star, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import type {
  DecimalsGameResult,
  DecimalsIncorrectEntry,
  DecimalsUserAnswer,
} from './DecimalsPlay';
import { saveDecimalsSession } from './storage';
import {
  formatDecimal,
  fractionGlyph,
  isAddSubQuestion,
  isCompareQuestion,
  isFractionDecimalQuestion,
  isIdentifyQuestion,
  isPercentQuestion,
  isRoundQuestion,
} from './logic';

interface Props {
  result: DecimalsGameResult;
  onPlayAgain: () => void;
  onNewGame: () => void;
  userId?: string;
}

function naturalDp(n: number): number {
  if (Number.isInteger(n)) return 0;
  const s = n.toString();
  const dot = s.indexOf('.');
  if (dot === -1) return 0;
  return Math.min(3, s.length - dot - 1);
}

function questionSummary(q: DecimalsIncorrectEntry['question']): string {
  if (isIdentifyQuestion(q)) {
    const dp =
      q.skill === 'identify-tenths' ? 1 : q.skill === 'identify-hundredths' ? 2 : 3;
    return `${formatDecimal(q.decimal, dp)} = ${q.answerNum}/${q.answerDen}`;
  }
  if (isRoundQuestion(q)) {
    const sourceDp = q.skill === 'round-1dp' ? 1 : 2;
    const targetLabel = q.precision === 0 ? 'whole' : '1dp';
    return `Round ${formatDecimal(q.decimal, sourceDp)} (${targetLabel}) = ${formatDecimal(
      q.answer,
      q.precision
    )}`;
  }
  if (isCompareQuestion(q)) {
    return `${q.decimals.map(d => formatDecimal(d, naturalDp(d))).join(', ')} → ${q.answer
      .map(d => formatDecimal(d, naturalDp(d)))
      .join(', ')}`;
  }
  if (isFractionDecimalQuestion(q)) {
    const glyph = fractionGlyph(q.num, q.den) ?? `${q.num}/${q.den}`;
    if (q.skill === 'fraction-to-decimal') {
      return `${glyph} = ${formatDecimal(q.decimal, naturalDp(q.decimal))}`;
    }
    return `${formatDecimal(q.decimal, naturalDp(q.decimal))} = ${glyph}`;
  }
  if (isPercentQuestion(q)) {
    const glyph = fractionGlyph(q.num, q.den) ?? `${q.num}/${q.den}`;
    if (q.skill === 'percent-fraction') return `${q.percent}% = ${glyph}`;
    if (q.skill === 'percent-decimal')
      return `${q.percent}% = ${formatDecimal(q.decimal, naturalDp(q.decimal))}`;
    return `${formatDecimal(q.decimal, naturalDp(q.decimal))} = ${q.percent}%`;
  }
  if (isAddSubQuestion(q)) {
    const dp = Math.max(naturalDp(q.a), naturalDp(q.b));
    const sign = q.sign === '+' ? '+' : '−';
    return `${formatDecimal(q.a, dp)} ${sign} ${formatDecimal(q.b, dp)} = ${formatDecimal(
      q.answer,
      dp
    )}`;
  }
  return '';
}

function formatUserAnswer(a: DecimalsUserAnswer): string | null {
  switch (a.kind) {
    case 'none':
      return null;
    case 'number':
      return a.value === null ? null : String(a.value);
    case 'fraction':
      if (a.num === null || a.den === null) return null;
      return `${a.num}/${a.den}`;
    case 'order':
      if (a.values.length === 0) return null;
      return a.values.map(v => formatDecimal(v, naturalDp(v))).join(', ');
  }
}

function IncorrectRow({ entry }: { entry: DecimalsIncorrectEntry }) {
  const youSaid = formatUserAnswer(entry.userAnswer);
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-4 py-2">
      <span className="font-medium text-sm md:text-base">{questionSummary(entry.question)}</span>
      {youSaid && (
        <span className="text-sm text-destructive whitespace-nowrap">You said: {youSaid}</span>
      )}
    </div>
  );
}

export function DecimalsResults({ result, onPlayAgain, onNewGame, userId }: Props) {
  const percentage = result.total > 0 ? Math.round((result.score / result.total) * 100) : 0;
  const stars =
    percentage === 100 ? 5
      : percentage >= 90 ? 4
      : percentage >= 75 ? 3
      : percentage >= 50 ? 2
      : percentage >= 25 ? 1
      : 0;

  useEffect(() => {
    saveDecimalsSession(
      {
        date: new Date().toISOString(),
        score: result.score,
        total: result.total,
        skills: result.settings.skills,
      },
      userId
    );

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || percentage < 80) return;
    if (percentage === 100) {
      confetti({ origin: { y: 0.7 }, spread: 90, particleCount: 120, startVelocity: 45 });
    } else {
      confetti({ origin: { y: 0.7 }, spread: 70, particleCount: 80 });
    }
  }, [result, userId, percentage]);

  const message =
    percentage === 100 ? "Perfect score! You're a maths superstar!"
      : percentage >= 80 ? 'Brilliant work! Keep it up!'
      : percentage >= 60 ? 'Good effort! Practice makes perfect!'
      : percentage >= 40 ? "Nice try! You'll get better!"
      : "Keep practising, you've got this!";

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 text-center">
          <div className="mb-3 flex justify-center gap-1" aria-label={`${stars} out of 5 stars`}>
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
          <p className="mt-2 text-muted-foreground">{percentage}% correct</p>
          {result.bestStreak >= 3 && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-3 py-1 text-sm font-bold text-white shadow-lg">
              <Flame className="w-4 h-4" />
              Best streak: {result.bestStreak}
            </div>
          )}
        </div>

        {result.incorrectQuestions.length > 0 && (
          <Card className="mb-4 p-4">
            <h3 className="mb-3 font-bold text-foreground">Questions to practise:</h3>
            <div className="space-y-2">
              {result.incorrectQuestions.map((entry, idx) => (
                <IncorrectRow key={idx} entry={entry} />
              ))}
            </div>
          </Card>
        )}

        <div className="space-y-3">
          <Button onClick={onPlayAgain} className="w-full py-6 text-xl font-bold shadow-button">
            Play Again
          </Button>
          <Button onClick={onNewGame} variant="outline" className="w-full py-4 font-bold">
            Change Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
