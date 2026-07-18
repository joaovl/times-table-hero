import { useEffect } from 'react';
import { Star, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import type { FractionGameResult, FractionIncorrectEntry, FractionUserAnswer } from './FractionsPlay';
import { saveFractionSession } from './storage';
import {
  skillOp,
  toMixed,
  isOpQuestion,
  isIdQuestion,
  isEqQuestion,
  isCmpQuestion,
  isMixedQuestion,
  isMulByWholeQuestion,
  isMixedMulWholeQuestion,
  isMulFracQuestion,
  isToDecimalQuestion,
  isFromDecimalQuestion,
} from './logic';
import { FractionDisplay } from './FractionDisplay';
import { useT } from '@/lib/i18n/react';
import { t as tGlobal } from '@/lib/i18n/i18n';
import { formatNumber } from '@/lib/i18n/number';

interface Props {
  result: FractionGameResult;
  onPlayAgain: () => void;
  onNewGame: () => void;
  userId?: string;
}

const opGlyph = (op: 'add' | 'sub') => (op === 'add' ? '+' : '−');

function formatUserAnswer(a: FractionUserAnswer): string | null {
  switch (a.kind) {
    case 'none':
      return null;
    case 'frac':
      return `${a.value.num}/${a.value.den}`;
    case 'cmp':
      return a.value;
    case 'eq':
      return String(a.value);
    case 'mixed-improper':
      return `${a.value.num}/${a.value.den}`;
    case 'mixed-mixed':
      return a.value.num === 0
        ? `${a.value.whole}`
        : `${a.value.whole} ${a.value.num}/${a.value.den}`;
    case 'mul-answer':
      return a.value.whole === 0
        ? `${a.value.num}/${a.value.den}`
        : `${a.value.whole} ${a.value.num}/${a.value.den}`;
    case 'decimal':
      // Trim trailing zeros for compact display.
      return String(a.value);
  }
}

function IncorrectRow({ entry }: { entry: FractionIncorrectEntry }) {
  const { question: q, userAnswer } = entry;
  const youSaid = formatUserAnswer(userAnswer);

  if (isOpQuestion(q)) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-4 py-2">
        <div className="flex items-center gap-2 text-foreground">
          <FractionDisplay frac={q.a} size="sm" />
          <span className="font-bold text-base">{opGlyph(skillOp(q.skill))}</span>
          <FractionDisplay frac={q.b} size="sm" />
          <span className="font-bold text-base">=</span>
          <FractionDisplay frac={q.answer} size="sm" />
        </div>
        {youSaid && (
          <span className="text-sm text-destructive whitespace-nowrap">{tGlobal('fractions.results.youSaid', { answer: youSaid })}</span>
        )}
      </div>
    );
  }

  if (isIdQuestion(q)) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-4 py-2">
        <div className="flex items-center gap-2 text-foreground">
          <span className="font-semibold text-sm">
            {tGlobal(q.figure === 'circle' ? 'fractions.results.sectorsShaded' : 'fractions.results.cellsShaded', { shaded: q.shaded, total: q.total })}
          </span>
          <span className="font-bold text-base">=</span>
          <FractionDisplay frac={q.answer} size="sm" />
        </div>
        {youSaid && (
          <span className="text-sm text-destructive whitespace-nowrap">{tGlobal('fractions.results.youSaid', { answer: youSaid })}</span>
        )}
      </div>
    );
  }

  if (isEqQuestion(q)) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-4 py-2">
        <div className="flex items-center gap-2 text-foreground">
          <FractionDisplay frac={q.source} size="sm" />
          <span className="font-bold text-base">=</span>
          <FractionDisplay frac={q.target} size="sm" />
        </div>
        {youSaid && (
          <span className="text-sm text-destructive whitespace-nowrap">{tGlobal('fractions.results.youSaid', { answer: youSaid })}</span>
        )}
      </div>
    );
  }

  if (isCmpQuestion(q)) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-4 py-2">
        <div className="flex items-center gap-2 text-foreground">
          <FractionDisplay frac={q.a} size="sm" />
          <span className="font-bold text-base">{q.answer}</span>
          <FractionDisplay frac={q.b} size="sm" />
        </div>
        {youSaid && (
          <span className="text-sm text-destructive whitespace-nowrap">{tGlobal('fractions.results.youSaid', { answer: youSaid })}</span>
        )}
      </div>
    );
  }

  if (isMulByWholeQuestion(q)) {
    const a = q.answer;
    const canonical =
      a.whole !== undefined
        ? a.num === 0
          ? `${a.whole}`
          : `${a.whole} ${a.num}/${a.den}`
        : `${a.num}/${a.den}`;
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-4 py-2">
        <div className="flex items-center gap-2 text-foreground">
          <FractionDisplay frac={q.frac} size="sm" />
          <span className="font-bold text-base">×</span>
          <span className="font-bold text-base">{q.whole}</span>
          <span className="font-bold text-base">=</span>
          <span className="font-bold text-sm">{canonical}</span>
        </div>
        {youSaid && (
          <span className="text-sm text-destructive whitespace-nowrap">{tGlobal('fractions.results.youSaid', { answer: youSaid })}</span>
        )}
      </div>
    );
  }

  if (isMixedMulWholeQuestion(q)) {
    const a = q.answer;
    const canonical =
      a.whole !== undefined
        ? a.num === 0
          ? `${a.whole}`
          : `${a.whole} ${a.num}/${a.den}`
        : `${a.num}/${a.den}`;
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-4 py-2">
        <div className="flex items-center gap-2 text-foreground text-sm font-semibold">
          <span>
            {q.mixed.whole}
            {q.mixed.num !== 0 ? <> </> : null}
          </span>
          {q.mixed.num !== 0 && (
            <FractionDisplay frac={{ num: q.mixed.num, den: q.mixed.den }} size="sm" />
          )}
          <span className="font-bold text-base">×</span>
          <span className="font-bold text-base">{q.whole}</span>
          <span className="font-bold text-base">=</span>
          <span className="font-bold">{canonical}</span>
        </div>
        {youSaid && (
          <span className="text-sm text-destructive whitespace-nowrap">{tGlobal('fractions.results.youSaid', { answer: youSaid })}</span>
        )}
      </div>
    );
  }

  if (isMulFracQuestion(q)) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-4 py-2">
        <div className="flex items-center gap-2 text-foreground">
          <FractionDisplay frac={q.a} size="sm" />
          <span className="font-bold text-base">×</span>
          <FractionDisplay frac={q.b} size="sm" />
          <span className="font-bold text-base">=</span>
          <FractionDisplay frac={q.answer} size="sm" />
        </div>
        {youSaid && (
          <span className="text-sm text-destructive whitespace-nowrap">{tGlobal('fractions.results.youSaid', { answer: youSaid })}</span>
        )}
      </div>
    );
  }

  if (isToDecimalQuestion(q)) {
    const decStr = formatNumber(q.answer, { maximumFractionDigits: 2 });
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-4 py-2">
        <div className="flex items-center gap-2 text-foreground">
          <FractionDisplay frac={{ num: q.num, den: q.den }} size="sm" />
          <span className="font-bold text-base">=</span>
          <span className="font-bold text-base">{decStr}</span>
        </div>
        {youSaid && (
          <span className="text-sm text-destructive whitespace-nowrap">{tGlobal('fractions.results.youSaid', { answer: youSaid })}</span>
        )}
      </div>
    );
  }

  if (isFromDecimalQuestion(q)) {
    const decStr = formatNumber(q.decimal, { maximumFractionDigits: 2 });
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-4 py-2">
        <div className="flex items-center gap-2 text-foreground">
          <span className="font-bold text-base">{decStr}</span>
          <span className="font-bold text-base">=</span>
          <FractionDisplay frac={{ num: q.num, den: q.den }} size="sm" />
        </div>
        {youSaid && (
          <span className="text-sm text-destructive whitespace-nowrap">{tGlobal('fractions.results.youSaid', { answer: youSaid })}</span>
        )}
      </div>
    );
  }

  if (isMixedQuestion(q)) {
    const m = toMixed(q.improper);
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-4 py-2">
        <div className="flex items-center gap-2 text-foreground text-sm font-semibold">
          {q.direction === 'to-mixed' ? (
            <>
              <FractionDisplay frac={q.improper} size="sm" />
              <span>=</span>
              <span>
                {m.whole}
                {m.num !== 0 ? (
                  <> </>
                ) : null}
              </span>
              {m.num !== 0 && <FractionDisplay frac={{ num: m.num, den: m.den }} size="sm" />}
            </>
          ) : (
            <>
              <span>
                {q.mixed.whole}
                {q.mixed.num !== 0 ? <> </> : null}
              </span>
              {q.mixed.num !== 0 && (
                <FractionDisplay frac={{ num: q.mixed.num, den: q.mixed.den }} size="sm" />
              )}
              <span>=</span>
              <FractionDisplay frac={q.improper} size="sm" />
            </>
          )}
        </div>
        {youSaid && (
          <span className="text-sm text-destructive whitespace-nowrap">{tGlobal('fractions.results.youSaid', { answer: youSaid })}</span>
        )}
      </div>
    );
  }

  return null;
}

export function FractionsResults({ result, onPlayAgain, onNewGame, userId }: Props) {
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
    saveFractionSession(
      {
        date: new Date().toISOString(),
        score: result.score,
        total: result.total,
        skills: result.settings.skills,
        denominators: result.settings.denominators,
        simplify: result.settings.simplify,
      },
      userId
    );

    const reduced =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || percentage < 80) return;
    if (percentage === 100) {
      confetti({ origin: { y: 0.7 }, spread: 90, particleCount: 120, startVelocity: 45 });
    } else {
      confetti({ origin: { y: 0.7 }, spread: 70, particleCount: 80 });
    }
  }, [result, userId, percentage]);

  const message =
    percentage === 100 ? t('fractions.results.perfectScore')
      : percentage >= 80 ? t('fractions.results.brilliantWork')
      : percentage >= 60 ? t('fractions.results.goodEffort')
      : percentage >= 40 ? t('fractions.results.niceTry')
      : t('fractions.results.keepPractising');

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 text-center">
          <div className="mb-3 flex justify-center gap-1" aria-label={t('fractions.results.starsAriaLabel', { stars })}>
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
          <p className="mt-2 text-muted-foreground">{t('fractions.results.percentCorrect', { percent: percentage })}</p>
          {result.bestStreak >= 3 && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-3 py-1 text-sm font-bold text-white shadow-lg">
              <Flame className="w-4 h-4" />
              {t('fractions.results.bestStreak', { count: result.bestStreak })}
            </div>
          )}
        </div>

        {result.incorrectQuestions.length > 0 && (
          <Card className="mb-4 p-4">
            <h3 className="mb-3 font-bold text-foreground">{t('fractions.results.questionsToPractise')}</h3>
            <div className="space-y-2">
              {result.incorrectQuestions.map((entry, idx) => (
                <IncorrectRow key={idx} entry={entry} />
              ))}
            </div>
          </Card>
        )}

        <div className="space-y-3">
          <Button onClick={onPlayAgain} className="w-full py-6 text-xl font-bold shadow-button">
            {t('fractions.results.playAgain')}
          </Button>
          <Button onClick={onNewGame} variant="outline" className="w-full py-4 font-bold">
            {t('fractions.results.changeSettings')}
          </Button>
        </div>
      </div>
    </div>
  );
}
