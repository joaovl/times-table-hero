import { recordPractice } from '@/lib/practice/recordPractice';
import { getCurrentUser } from '@/lib/userStorage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type {
  ComparePricesQuestion,
  MoneyQuestion,
  MoneySettings,
} from './logic';
import {
  checkCompareAnswer,
  checkMoneyAnswer,
  formatMoney,
  generateMoneyQuestions,
  itemLabel,
  parseMoney,
} from './logic';
import { t } from '@/lib/i18n/i18n';
import { currencyForLocale, type CurrencyConfig } from '@/lib/i18n/currency';

export interface MoneyGameResult {
  score: number;
  total: number;
  bestStreak: number;
  incorrectQuestions: Array<{
    question: MoneyQuestion;
    userAnswer: string | null;
  }>;
  settings: MoneySettings;
}

interface Props {
  settings: MoneySettings;
  onComplete: (r: MoneyGameResult) => void;
  onQuit: () => void;
}

// One-line presentation of the question for the play screen. Uses real
// glyphs (− for subtract) since this is HTML, not the PDF. Amounts render in
// the device's currency (£/€/$/R$ per locale).
function QuestionDisplay({ q, cfg }: { q: MoneyQuestion; cfg: CurrencyConfig }) {
  switch (q.skill) {
    case 'add-money':
      return (
        <div className="font-mono text-3xl md:text-5xl font-extrabold text-foreground tracking-wider">
          {formatMoney(q.aPence, cfg)} + {formatMoney(q.bPence, cfg)} =
        </div>
      );
    case 'subtract-money':
      return (
        <div className="font-mono text-3xl md:text-5xl font-extrabold text-foreground tracking-wider">
          {formatMoney(q.aPence, cfg)} − {formatMoney(q.bPence, cfg)} =
        </div>
      );
    case 'multiply-money':
      return (
        <div className="text-2xl md:text-3xl font-bold text-foreground leading-snug">
          {q.bPence} {itemLabel(q.itemName, q.bPence)} at{' '}
          <span className="font-mono">{formatMoney(q.aPence, cfg)}</span> {t('money.play.each')}
          <br />
          {t('money.play.total')}
        </div>
      );
    case 'change':
      return (
        <div className="text-xl md:text-2xl font-bold text-foreground leading-snug">
          {t('money.play.buyA', { item: itemLabel(q.itemName, 1) })}{' '}
          <span className="font-mono">{formatMoney(q.pricePence, cfg)}</span>{t('money.play.payWith')}{' '}
          <span className="font-mono">{formatMoney(q.paidPence, cfg)}</span>.
          <br />
          {t('money.play.howMuchChange')}
        </div>
      );
    case 'multi-item':
      return (
        <div className="text-xl md:text-2xl font-bold text-foreground leading-snug text-left max-w-md mx-auto">
          <div className="mb-2">{t('money.play.totalCostOf')}</div>
          <ul className="list-disc list-inside font-mono text-lg md:text-xl">
            {q.items.map((it, i) => (
              <li key={i}>
                {itemLabel(it.name, 1)}: {formatMoney(it.pricePence, cfg)}
              </li>
            ))}
          </ul>
        </div>
      );
    case 'compare-prices':
      return (
        <div className="text-xl md:text-2xl font-bold text-foreground leading-snug">
          {t('money.play.whichIsCheaper')}
          <div className="mt-3 grid grid-cols-2 gap-3 text-left">
            <div>
              <div className="text-sm text-muted-foreground">A</div>
              <div className="font-mono text-2xl">{itemLabel(q.itemAName, 1)}</div>
              <div className="font-mono text-2xl">{formatMoney(q.aPence, cfg)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">B</div>
              <div className="font-mono text-2xl">{itemLabel(q.itemBName, 1)}</div>
              <div className="font-mono text-2xl">{formatMoney(q.bPence, cfg)}</div>
            </div>
          </div>
        </div>
      );
  }
}

function expectedDisplay(q: MoneyQuestion, cfg: CurrencyConfig): string {
  if (q.skill === 'compare-prices') {
    if (q.answer === 'equal') return t('money.play.equal');
    return q.answer === 'A' ? 'A' : 'B';
  }
  return formatMoney(q.answerPence, cfg);
}

export function MoneyPlay({ settings, onComplete, onQuit }: Props) {
  const cfg = currencyForLocale();
  const [questions, setQuestions] = useState<MoneyQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [incorrect, setIncorrect] = useState<MoneyGameResult['incorrectQuestions']>([]);
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
    setQuestions(generateMoneyQuestions(settings, count));
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
          module: 'money',
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

  const advance = useCallback(
    (isCorrect: boolean, userDisplay: string | null) => {
      const q = questions[currentIndex];
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
        setIncorrect(prev => [...prev, { question: q, userAnswer: userDisplay }]);
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

  const submitTyped = useCallback(() => {
    if (questions.length === 0) return;
    const q = questions[currentIndex];
    if (q.skill === 'compare-prices') return; // handled separately
    const userPence = parseMoney(typed, cfg);
    const ok = checkMoneyAnswer(q, userPence);
    advance(ok, typed);
  }, [questions, currentIndex, typed, advance, cfg]);

  const submitCompare = useCallback(
    (pick: 'A' | 'B' | 'equal') => {
      if (questions.length === 0) return;
      const q = questions[currentIndex] as ComparePricesQuestion;
      const ok = checkCompareAnswer(q, pick);
      advance(ok, pick === 'equal' ? t('money.play.equal') : pick);
    },
    [questions, currentIndex, advance]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitTyped();
  };

  if (questions.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-2xl font-bold text-primary">{t('common.loading')}</div>
      </div>
    );
  }

  const q = questions[currentIndex];
  const isCompare = q.skill === 'compare-prices';
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
            <Button
              variant="ghost"
              onClick={onQuit}
              className="text-muted-foreground h-11"
            >
              {t('money.play.quit')}
            </Button>
            <div className="text-center">
              <span className="text-xl md:text-2xl font-bold text-primary">{score}</span>
              <span className="text-sm md:text-base text-muted-foreground">{t('money.play.correct')}</span>
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
                {t('money.play.streak', { count: streak })}
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
          <QuestionDisplay q={q} cfg={cfg} />
          {feedback === 'incorrect' && (
            <div className="mt-3 text-2xl md:text-3xl font-bold text-destructive">
              = {expectedDisplay(q, cfg)}
            </div>
          )}
          {feedback === 'correct' && (
            <div className="mt-3 text-2xl md:text-3xl font-extrabold text-success">
              {t('play.feedback.brilliant')}
            </div>
          )}
        </Card>

        {feedback === 'none' && (
          <>
            {isCompare ? (
              <div className="grid grid-cols-3 gap-2 md:gap-3">
                <Button
                  onClick={() => submitCompare('A')}
                  className="py-4 text-lg font-bold shadow-button"
                >
                  A
                </Button>
                <Button
                  onClick={() => submitCompare('equal')}
                  variant="outline"
                  className="py-4 text-lg font-bold"
                >
                  {t('money.play.equal')}
                </Button>
                <Button
                  onClick={() => submitCompare('B')}
                  className="py-4 text-lg font-bold shadow-button"
                >
                  B
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-2 md:space-y-[13px]">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-2xl md:text-3xl font-bold text-muted-foreground pointer-events-none select-none">
                    {cfg.symbol}
                  </span>
                  <Input
                    ref={inputRef}
                    type="text"
                    inputMode="decimal"
                    value={typed}
                    onChange={e => setTyped(e.target.value)}
                    placeholder={t('money.play.amountPlaceholder')}
                    aria-label={t('money.play.moneyAnswer')}
                    className="h-12 md:h-[64px] pl-9 md:pl-12 text-center text-2xl md:text-4xl font-bold"
                    autoFocus
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full py-3 md:py-[19px] text-lg md:text-xl font-bold shadow-button"
                  disabled={typed.trim() === ''}
                >
                  {t('money.play.check')}
                </Button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
