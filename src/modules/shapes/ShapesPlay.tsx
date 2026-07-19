import { AnswerChoices } from '@/components/game/AnswerChoices';
import { generateChoices } from './logic';
import { recordPractice } from '@/lib/practice/recordPractice';
import { getCurrentUser } from '@/lib/userStorage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VisualQuestion } from '@/components/VisualQuestion';
import { cn } from '@/lib/utils';
import type { ShapeQuestion, ShapeSettings } from './logic';
import {
  ANGLE_CATEGORIES,
  ANGLE_CATEGORIES_REFLEX,
  answerString,
  promptForScreen,
  generateShapeQuestions,
  isAnswerCorrect,
  pickNameDistractors,
  pickSolidDistractors,
  promptFor,
} from './logic';
import { ShapeFigure } from './ShapeFigure';
import { t } from '@/lib/i18n/i18n';
import type { ShapeFigureMode } from './ShapeFigure';
import { recordAttempt } from '@/lib/feedback/attemptLog';

export interface ShapesGameResult {
  score: number;
  total: number;
  bestStreak: number;
  incorrectQuestions: Array<{
    prompt: string;
    correctAnswer: string;
    userAnswer: string | null;
  }>;
  settings: ShapeSettings;
}

interface Props {
  settings: ShapeSettings;
  onComplete: (r: ShapesGameResult) => void;
  onQuit: () => void;
}

// Shuffle helper for MC choices. Returns a new array.
function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function ShapesPlay({ settings, onComplete, onQuit }: Props) {
  const [questions, setQuestions] = useState<ShapeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [incorrect, setIncorrect] = useState<ShapesGameResult['incorrectQuestions']>([]);
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
    setQuestions(generateShapeQuestions(settings, count));
  }, [settings]);

  useEffect(() => {
    setTyped('');
    if (questions.length > 0) {
      setChoices(settings.difficulty !== 'hard'
        ? generateChoices(questions[currentIndex], settings.difficulty)
        : []);
    }
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
          module: 'shapes',
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

  // Pre-compute multiple-choice options for the current name-2d question so
  // re-renders don't reshuffle. Keyed on currentIndex.
  const mcChoices = useMemo<string[] | null>(() => {
    if (questions.length === 0) return null;
    const q = questions[currentIndex];
    if (q.skill === 'name-2d' && q.shape) {
      const distractors = pickNameDistractors(q.shape, 3);
      return shuffle<string>([q.shape, ...distractors]);
    }
    if (q.skill === 'name-3d' && q.solid) {
      const distractors = pickSolidDistractors(q.solid, 3);
      return shuffle<string>([q.solid, ...distractors]);
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, questions]);

  const submit = useCallback(
    (value: string) => {
      if (questions.length === 0) return;
      const q = questions[currentIndex];
      const correct = isAnswerCorrect(q, value);

      setQuestionsAnswered(p => p + 1);
      recordAttempt({
        module: 'shapes',
        skill: q.skill,
        question: promptFor(q),
        typed: value,
        correct,
        expected: answerString(q),
      });

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
            prompt: promptForScreen(q),
            correctAnswer: answerString(q),
            userAnswer: value || null,
          },
        ]);
      }

      const delay = correct ? 800 : 1400;
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
    submit(typed.trim());
  };

  if (questions.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-2xl font-bold text-primary">{t('common.loading')}</div>
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

  // Visual mode for the figure component. Each skill maps to a distinct
  // figure layout — ShapeFigure consults `question.skill` first, so the
  // mode here is a hint for the shape-only paths (name-2d / count-sides).
  let figureMode: ShapeFigureMode;
  if (q.skill === 'perimeter-rect' || q.skill === 'area-rect') {
    figureMode = 'rect-with-dims';
  } else if (q.skill === 'area-tri') {
    figureMode = 'right-triangle';
  } else if (q.skill === 'area-circle' || q.skill === 'circumference') {
    figureMode = 'circle-with-radius';
  } else if (q.skill === 'angle-name') {
    figureMode = 'angle';
  } else if (q.skill === 'angle-measure' || q.skill === 'angle-name-reflex') {
    figureMode = 'angle-with-degrees';
  } else if (
    q.skill === 'name-3d' ||
    q.skill === 'count-faces' ||
    q.skill === 'count-edges' ||
    q.skill === 'count-vertices'
  ) {
    figureMode = 'solid';
  } else if (q.skill === 'lines-of-symmetry') {
    figureMode = 'symmetry-shape';
  } else if (q.skill === 'coord-read' || q.skill === 'coord-plot' || q.skill === 'translation') {
    figureMode = 'coord-grid';
  } else if (q.skill === 'coord-four-quadrants') {
    figureMode = 'coord-grid-quadrants';
  } else if (q.skill === 'angle-at-point') {
    figureMode = 'angle-at-point';
  } else if (q.skill === 'angle-on-line') {
    figureMode = 'angle-on-line';
  } else if (q.skill === 'angle-vertical') {
    figureMode = 'angle-vertical';
  } else {
    figureMode = q.shape ?? 'circle';
  }

  // Skill bucketing for the input UI block at the bottom of the page.
  const isMcShapeName = q.skill === 'name-2d' || q.skill === 'name-3d';
  const isAngleMcSimple = q.skill === 'angle-name';
  const isAngleMcReflex = q.skill === 'angle-name-reflex';
  const isPlotPicker = q.skill === 'coord-plot';
  const usesTypedInput = !isMcShapeName && !isAngleMcSimple && !isAngleMcReflex && !isPlotPicker;

  return (
    <div className="min-h-screen bg-background py-2 px-3 md:py-[26px] md:px-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-3 md:mb-[19px]">
          <div className="mb-2 flex items-center justify-between">
            <Button variant="ghost" onClick={onQuit} className="text-muted-foreground h-11">{t('shapes.play.quit')}</Button>
            <div className="text-center">
              <span className="text-xl md:text-2xl font-bold text-primary">{score}</span>
              <span className="text-sm md:text-base text-muted-foreground">{t('shapes.play.correct')}</span>
            </div>
            <div className="text-right">
              {settings.gameMode === 'questions' ? (
                <span className="text-sm md:text-base font-bold">
                  {currentIndex + 1} / {settings.questionCount}
                </span>
              ) : (
                <span className={cn('font-bold text-lg md:text-xl', timeLeft <= 30 ? 'text-destructive' : 'text-foreground')}>
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
                {t('shapes.play.streak', { count: streak })}
              </span>
            </div>
          )}
        </div>

        <VisualQuestion
          feedback={feedback}
          cardClassName="py-4 md:py-6"
          figure={<ShapeFigure shape={figureMode} question={q} size={220} />}
          promptText={
            <p className="text-sm md:text-base text-muted-foreground">{promptForScreen(q)}</p>
          }
          correctAnswerHint={answerString(q)}
        >
          {feedback === 'none' && isMcShapeName && mcChoices && (
            <div className="grid grid-cols-2 gap-2">
              {mcChoices.map(choice => (
                <Button
                  key={choice}
                  onClick={() => submit(choice)}
                  className="py-4 text-lg font-bold capitalize shadow-button"
                >
                  {choice}
                </Button>
              ))}
            </div>
          )}

          {feedback === 'none' && isAngleMcSimple && (
            <div className="grid grid-cols-3 gap-2">
              {ANGLE_CATEGORIES.map(c => (
                <Button
                  key={c}
                  onClick={() => submit(c)}
                  className="py-4 text-lg font-bold capitalize shadow-button"
                >
                  {c}
                </Button>
              ))}
            </div>
          )}

          {feedback === 'none' && isAngleMcReflex && (
            <div className="grid grid-cols-2 gap-2">
              {ANGLE_CATEGORIES_REFLEX.map(c => (
                <Button
                  key={c}
                  onClick={() => submit(c)}
                  className="py-4 text-lg font-bold capitalize shadow-button"
                >
                  {c}
                </Button>
              ))}
            </div>
          )}

          {feedback === 'none' && isPlotPicker && q.point && (
            <PlotPicker
              target={q.point}
              gridMax={q.gridMax ?? 5}
              onPick={(x, y) => submit(`${x},${y}`)}
            />
          )}

          {feedback === 'none' && usesTypedInput && (
            settings.difficulty !== 'hard' && choices.length > 0 ? (
              <AnswerChoices options={choices} onChoose={submit} />
            ) : (
            <form onSubmit={handleSubmit} className="space-y-2 md:space-y-[13px]">
              <Input
                ref={inputRef}
                type="text"
                inputMode={
                  q.skill === 'coord-read' ||
                  q.skill === 'translation' ||
                  q.skill === 'coord-four-quadrants'
                    ? 'text'
                    : 'decimal'
                }
                value={typed}
                onChange={e => setTyped(e.target.value)}
                placeholder={inputPlaceholder(q)}
                aria-label={t('shapes.play.typeTheAnswer')}
                className="h-12 md:h-[64px] text-center text-2xl md:text-4xl font-bold"
                autoFocus
              />
              <Button
                type="submit"
                className="w-full py-3 md:py-[19px] text-lg md:text-xl font-bold shadow-button"
                disabled={typed.trim() === ''}
              >
                {t('shapes.play.check')}
              </Button>
            </form>
            )
          )}
        </VisualQuestion>
      </div>
    </div>
  );
}

/** Placeholder text for the free-form input field per skill. */
function inputPlaceholder(q: ShapeQuestion): string {
  switch (q.skill) {
    case 'count-sides':
    case 'count-faces':
    case 'count-edges':
    case 'count-vertices':
    case 'lines-of-symmetry':
      return 'e.g. 4';
    case 'angle-measure':
      return 'e.g. 45';
    case 'coord-read':
    case 'translation':
      return 'e.g. 3,4';
    case 'coord-four-quadrants':
      return 'e.g. -2,3';
    case 'angle-at-point':
    case 'angle-on-line':
    case 'angle-vertical':
      return 'degrees, e.g. 45';
    default:
      return `answer in ${q.units}`;
  }
}

/**
 * Button grid for the coord-plot skill. Renders a (gridMax+1) × (gridMax+1)
 * tappable grid (origin at the bottom-left). Each button is at least
 * 44×44 px so it meets the kid-friendly tap-target floor at gridMax ≤ 5;
 * for larger grids the buttons shrink but stay legible.
 */
interface PlotPickerProps {
  target: { x: number; y: number };
  gridMax: number;
  onPick: (x: number, y: number) => void;
}

function PlotPicker({ target, gridMax, onPick }: PlotPickerProps) {
  const size = gridMax + 1; // count of buttons per axis
  // Lay out rows top-to-bottom but with y descending so (0,0) sits at
  // the bottom-left visually.
  const rows: Array<Array<{ x: number; y: number }>> = [];
  for (let y = gridMax; y >= 0; y--) {
    const row: Array<{ x: number; y: number }> = [];
    for (let x = 0; x <= gridMax; x++) row.push({ x, y });
    rows.push(row);
  }
  // Use inline grid template so we can keep buttons square at any grid
  // size without depending on a Tailwind grid-cols-N class for large N.
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
    gap: '4px',
  };
  return (
    <div style={gridStyle}>
      {rows.map(row =>
        row.map(({ x, y }) => {
          const isTarget = x === target.x && y === target.y;
          return (
            <button
              key={`${x}-${y}`}
              type="button"
              aria-label={`Plot at ${x}, ${y}`}
              onClick={() => onPick(x, y)}
              className={cn(
                'aspect-square min-w-[44px] min-h-[44px] rounded-md border border-card-border',
                'bg-secondary text-muted-foreground font-bold transition-all',
                'hover:bg-primary/30 active:scale-95',
                isTarget && 'ring-2 ring-primary'
              )}
            >
              {x},{y}
            </button>
          );
        })
      )}
    </div>
  );
}
