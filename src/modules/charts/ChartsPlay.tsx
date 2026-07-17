import { recordPractice } from '@/lib/practice/recordPractice';
import { getCurrentUser } from '@/lib/userStorage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { AnswerChoices } from '@/components/game/AnswerChoices';
import { NONE_OF_THESE, isChoiceCorrect } from '@/lib/game/choices';
import type { ChartQuestion, ChartSettings } from './logic';
import {
  chartHighlightIndices,
  generateChartChoices,
  generateChartQuestions,
  isAnswerCorrect,
  isLineSkill,
  isPieSkill,
  isTimetableSkill,
} from './logic';
import { BarChart } from './BarChart';
import { LineChart } from './LineChart';
import { PieChart } from './PieChart';
import { E2EOracle } from '@/lib/e2e/oracle';
import { E2E_ENABLED, feedbackDelay } from '@/lib/e2e/env';
import { chartOracle } from './oracle';

export interface ChartsGameResult {
  score: number;
  total: number;
  bestStreak: number;
  incorrectQuestions: Array<{
    prompt: string;
    userAnswer: string | null;
    correctAnswer: string;
  }>;
  settings: ChartSettings;
}

interface Props {
  settings: ChartSettings;
  onComplete: (r: ChartsGameResult) => void;
  onQuit: () => void;
}

function formatCorrectAnswer(q: ChartQuestion): string {
  const kind = q.expectedKind ?? 'number';
  if (kind === 'label') return q.expectedLabel ?? String(q.answer);
  if (kind === 'fraction' && q.expectedFraction) {
    return `${q.expectedFraction.num}/${q.expectedFraction.den}`;
  }
  if (kind === 'trend' && q.expectedTrend) return q.expectedTrend;
  if (kind === 'time' && q.expectedTime) return q.expectedTime;
  return String(q.answer);
}

const TREND_CHOICES: Array<'rising' | 'falling' | 'flat'> = ['rising', 'falling', 'flat'];

/**
 * Deterministically pick `count` labels from `categories` that always include
 * `expectedLabel`. Preserves x-axis ordering so the buttons read naturally.
 */
function pickLabelChoices(
  categories: Array<{ label: string; value: number }>,
  expectedLabel: string,
  count: number,
): string[] {
  const labels = categories.map(c => c.label);
  if (labels.length <= count) return labels;
  // Include the expected label, plus the next labels in order. Wrap around
  // if the expected label is near the end so we always emit `count` items.
  const expectedIdx = Math.max(0, labels.indexOf(expectedLabel));
  const out: string[] = [];
  // Start a few before expected so it isn't always first.
  const start = Math.max(0, Math.min(labels.length - count, expectedIdx - 1));
  for (let i = 0; i < count; i++) out.push(labels[start + i]);
  return out;
}

export function ChartsPlay({ settings, onComplete, onQuit }: Props) {
  const [questions, setQuestions] = useState<ChartQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [incorrect, setIncorrect] = useState<ChartsGameResult['incorrectQuestions']>([]);
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'incorrect'>('none');
  const [typed, setTyped] = useState('');
  const [fracNum, setFracNum] = useState('');
  const [fracDen, setFracDen] = useState('');
  const [numberChoices, setNumberChoices] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(settings.timeLimit);
  const [isComplete, setIsComplete] = useState(false);
  const startTimeRef = useRef(Date.now());
  const loggedRef = useRef(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const numRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const count = settings.gameMode === 'questions' ? settings.questionCount : 200;
    setQuestions(generateChartQuestions(settings, count));
  }, [settings]);

  useEffect(() => {
    setTyped('');
    setFracNum('');
    setFracDen('');
    const q = questions[currentIndex];
    const kind = q?.expectedKind ?? 'number';
    // Numeric-answer skills get multiple-choice buttons (obvious distractors),
    // matching how label/trend skills already present buttons. Charts has no
    // easy/medium/hard toggle, so we use the easy spread uniformly.
    setNumberChoices(q && kind === 'number' ? generateChartChoices(q, 'easy') : []);
    setTimeout(() => {
      if (kind === 'fraction') numRef.current?.focus();
      else inputRef.current?.focus();
    }, 50);
  }, [currentIndex, questions]);

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
          module: 'charts',
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

  const finalize = useCallback(
    (correct: boolean, shown: string | null) => {
      if (questions.length === 0) return;
      const q = questions[currentIndex];

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
            prompt: q.prompt,
            userAnswer: shown || null,
            correctAnswer: formatCorrectAnswer(q),
          },
        ]);
      }

      const delay = feedbackDelay(correct ? 800 : 1400);
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

  // Grade a typed/fraction/label answer through the module's own matcher.
  const submit = useCallback(
    (value: string, displayValue?: string) => {
      if (questions.length === 0) return;
      const q = questions[currentIndex];
      finalize(isAnswerCorrect(q, value), (displayValue ?? value) || null);
    },
    [currentIndex, questions, finalize]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit(typed.trim());
  };

  const handleFractionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = fracNum.trim();
    const den = fracDen.trim();
    if (!num || !den) return;
    const combined = `${num}/${den}`;
    submit(combined, combined);
  };

  const handleLabelChoice = (label: string) => {
    if (feedback !== 'none') return;
    submit(label, label);
  };

  // A numeric multiple-choice pick, graded so 'None of these' wins when no shown
  // option matches (defensive — charts uses the easy spread, which shows it).
  const handleNumberChoice = (option: string) => {
    if (feedback !== 'none' || questions.length === 0) return;
    const q = questions[currentIndex];
    const correct = isChoiceCorrect(option, numberChoices, c => !isAnswerCorrect(q, c));
    finalize(correct, option);
  };

  if (questions.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-2xl font-bold text-primary">Loading...</div>
      </div>
    );
  }

  const q = questions[currentIndex];
  const kind = q.expectedKind ?? 'number';
  const isPie = isPieSkill(q.skill);
  const isLine = isLineSkill(q.skill);
  const isTimetable = isTimetableSkill(q.skill);
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
          {E2E_ENABLED && <E2EOracle data={chartOracle(q, numberChoices)} />}
          <div className="flex justify-center text-foreground">
            {isPie ? (
              <PieChart
                categories={q.categories}
                highlightIndices={chartHighlightIndices(q)}
                width={320}
                height={260}
              />
            ) : isLine ? (
              <LineChart
                categories={q.categories}
                highlightIndices={chartHighlightIndices(q)}
                width={360}
                height={260}
                unit={q.unit}
              />
            ) : isTimetable ? (
              <div className="w-full overflow-x-auto">
                <table className="mx-auto border-collapse text-sm md:text-base">
                  <thead>
                    <tr>
                      <th className="border border-foreground/40 px-2 py-1 bg-muted font-bold">Station</th>
                      {q.times && q.times[0] && q.times[0].map((_, idx) => (
                        <th
                          key={`th-${idx}`}
                          className="border border-foreground/40 px-2 py-1 bg-muted font-bold"
                        >
                          Train {idx + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(q.stations ?? []).map((station, sIdx) => (
                      <tr key={`tr-${sIdx}`}>
                        <td className="border border-foreground/40 px-2 py-1 font-medium">{station}</td>
                        {(q.times?.[sIdx] ?? []).map((t, tIdx) => (
                          <td
                            key={`td-${sIdx}-${tIdx}`}
                            className="border border-foreground/40 px-2 py-1 font-mono text-center"
                          >
                            {t}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <BarChart
                categories={q.categories}
                highlightIndices={chartHighlightIndices(q)}
                width={360}
                height={260}
                unit={q.unit}
              />
            )}
          </div>
          <p className="mt-3 text-base md:text-lg font-medium text-foreground">{q.prompt}</p>
          {feedback === 'incorrect' && (
            <div className="mt-3 text-2xl md:text-3xl font-bold text-destructive">
              {formatCorrectAnswer(q)}
            </div>
          )}
          {feedback === 'correct' && (
            <div className="mt-3 text-2xl md:text-3xl font-extrabold text-success">Brilliant!</div>
          )}
        </Card>

        {feedback === 'none' && kind === 'label' && (
          <div className="grid grid-cols-2 gap-2 md:gap-3">
            {(q.skill === 'line-max'
              ? pickLabelChoices(q.categories, q.expectedLabel ?? '', 4)
              : q.categories.map(c => c.label)
            ).map((label, i) => (
              <Button
                key={`mc-${i}-${label}`}
                type="button"
                onClick={() => handleLabelChoice(label)}
                className="py-4 md:py-5 text-lg md:text-xl font-bold shadow-button bg-gradient-to-b from-primary via-primary/85 to-primary/65"
              >
                {label}
              </Button>
            ))}
          </div>
        )}

        {feedback === 'none' && kind === 'trend' && (
          <div className="grid grid-cols-3 gap-2 md:gap-3">
            {TREND_CHOICES.map(t => (
              <Button
                key={`trend-${t}`}
                type="button"
                onClick={() => handleLabelChoice(t)}
                className="py-4 md:py-5 text-lg md:text-xl font-bold shadow-button bg-gradient-to-b from-primary via-primary/85 to-primary/65"
              >
                {t}
              </Button>
            ))}
          </div>
        )}

        {feedback === 'none' && kind === 'time' && (
          <form onSubmit={handleSubmit} className="space-y-2 md:space-y-[13px]">
            <Input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              value={typed}
              onChange={e => setTyped(e.target.value)}
              placeholder="HH:MM"
              aria-label="Time answer in HH:MM format"
              className="h-12 md:h-[64px] text-center text-2xl md:text-4xl font-bold tracking-wider"
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

        {feedback === 'none' && kind === 'fraction' && (
          <form onSubmit={handleFractionSubmit} className="space-y-2 md:space-y-[13px]">
            <div className="flex items-center justify-center gap-2 md:gap-3">
              <Input
                ref={numRef}
                type="text"
                inputMode="numeric"
                value={fracNum}
                onChange={e => setFracNum(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="n"
                className="h-12 md:h-[64px] w-20 md:w-24 text-center text-2xl md:text-4xl font-bold"
                aria-label="numerator"
                autoFocus
              />
              <div className="text-3xl md:text-5xl font-bold text-muted-foreground">/</div>
              <Input
                type="text"
                inputMode="numeric"
                value={fracDen}
                onChange={e => setFracDen(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="d"
                className="h-12 md:h-[64px] w-20 md:w-24 text-center text-2xl md:text-4xl font-bold"
                aria-label="denominator"
              />
            </div>
            <Button
              type="submit"
              className="w-full py-3 md:py-[19px] text-lg md:text-xl font-bold shadow-button"
              disabled={!fracNum.trim() || !fracDen.trim()}
            >
              Check
            </Button>
          </form>
        )}

        {feedback === 'none' && kind === 'number' && numberChoices.length > 0 && (
          <AnswerChoices options={numberChoices} onChoose={handleNumberChoice} />
        )}

        {feedback === 'none' && kind === 'number' && numberChoices.length === 0 && (
          <form onSubmit={handleSubmit} className="space-y-2 md:space-y-[13px]">
            <Input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              value={typed}
              onChange={e => setTyped(e.target.value)}
              placeholder="Type your answer"
              aria-label="Type the answer"
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
