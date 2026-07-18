import { recordPractice } from '@/lib/practice/recordPractice';
import { getCurrentUser } from '@/lib/userStorage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type {
  FractionQuestion,
  FractionSettings,
  Frac,
  CmpSymbol,
  MixedNumber,
} from './logic';
import {
  generateFractionQuestions,
  simplifyFrac,
  fracEquals,
  gradeOpAnswer,
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
  isMixedAddSubQuestion,
  isDivFracWholeQuestion,
  mulAnswerAccepted,
  decimalAnswerAccepted,
} from './logic';
import { FractionDisplay } from './FractionDisplay';
import { E2EOracle } from '@/lib/e2e/oracle';
import { E2E_ENABLED, feedbackDelay } from '@/lib/e2e/env';
import { fractionOpOracle } from './oracle';
import { useT } from '@/lib/i18n/react';
import { formatNumber, parseAnswer } from '@/lib/i18n/number';

// Generic user-answer payload — different skills have different shapes.
// Stored in incorrectQuestions so the results screen can render whatever the
// kid typed alongside the correct answer.
export type FractionUserAnswer =
  | { kind: 'frac'; value: Frac }
  | { kind: 'cmp'; value: CmpSymbol }
  | { kind: 'eq'; value: number; missing: 'num' | 'den' }
  | { kind: 'mixed-improper'; value: Frac }
  | { kind: 'mixed-mixed'; value: MixedNumber }
  | { kind: 'mul-answer'; value: { whole: number; num: number; den: number } }
  | { kind: 'decimal'; value: number }
  | { kind: 'none' };

export interface FractionIncorrectEntry {
  question: FractionQuestion;
  userAnswer: FractionUserAnswer;
}

export interface FractionGameResult {
  score: number;
  total: number;
  bestStreak: number;
  incorrectQuestions: FractionIncorrectEntry[];
  settings: FractionSettings;
}

interface Props {
  settings: FractionSettings;
  onComplete: (r: FractionGameResult) => void;
  onQuit: () => void;
}

const opGlyph = (op: 'add' | 'sub') => (op === 'add' ? '+' : '−');

// Render a small SVG circle with N sectors and `shaded` of them filled. Used
// only for the `id` skill in online play.
function CircleFigure({ total, shaded, size = 120 }: { total: number; shaded: number; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;
  const sectors: React.ReactElement[] = [];
  for (let i = 0; i < total; i++) {
    const a0 = (i / total) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / total) * Math.PI * 2 - Math.PI / 2;
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const largeArc = (a1 - a0) > Math.PI ? 1 : 0;
    const path =
      total === 1
        ? `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`
        : `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${largeArc} 1 ${x1} ${y1} Z`;
    sectors.push(
      <path
        key={i}
        d={path}
        fill={i < shaded ? 'hsl(var(--primary))' : 'hsl(var(--muted))'}
        stroke="hsl(var(--foreground))"
        strokeWidth={1.2}
      />
    );
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${shaded} of ${total} sectors shaded`}>
      {sectors}
    </svg>
  );
}

// Render a small SVG grid of cells with the first `shaded` of them filled.
function RectFigure({
  total,
  shaded,
  rows,
  cols,
  size = 140,
}: {
  total: number;
  shaded: number;
  rows: number;
  cols: number;
  size?: number;
}) {
  const cellW = size / cols;
  const cellH = (size * (rows / Math.max(cols, 1))) / Math.max(rows, 1);
  // Cap rect proportions so 1x12 isn't a needle.
  const h = Math.max(cellH, size / 4);
  const cells: React.ReactElement[] = [];
  for (let i = 0; i < total; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    cells.push(
      <rect
        key={i}
        x={c * cellW}
        y={r * h}
        width={cellW}
        height={h}
        fill={i < shaded ? 'hsl(var(--primary))' : 'hsl(var(--muted))'}
        stroke="hsl(var(--foreground))"
        strokeWidth={1.2}
      />
    );
  }
  return (
    <svg width={cols * cellW} height={rows * h} role="img" aria-label={`${shaded} of ${total} cells shaded`}>
      {cells}
    </svg>
  );
}

// Render a mixed number inline: "2 1/3" with the fractional part stacked.
function MixedDisplay({ m, size = 'md' }: { m: MixedNumber; size?: 'sm' | 'md' }) {
  if (m.num === 0) {
    return <span className={cn(size === 'sm' ? 'text-xl md:text-2xl' : 'text-3xl md:text-4xl', 'font-extrabold')}>{m.whole}</span>;
  }
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn(size === 'sm' ? 'text-xl md:text-2xl' : 'text-3xl md:text-4xl', 'font-extrabold')}>
        {m.whole}
      </span>
      <FractionDisplay frac={{ num: m.num, den: m.den }} size={size === 'sm' ? 'sm' : 'md'} />
    </span>
  );
}

// Parse a typed answer for the `mixed` skill. Accepts:
//   "2 1/3"     -> mixed
//   "7/3"       -> improper
//   "5"         -> whole only (mixed with num=0)
// Returns null if the input doesn't parse.
function parseMixedAnswer(
  s: string
): { kind: 'mixed'; value: MixedNumber } | { kind: 'improper'; value: Frac } | null {
  const trimmed = s.trim();
  if (!trimmed) return null;
  // Mixed "w n/d"
  const mixedMatch = trimmed.match(/^(-?\d+)\s+(-?\d+)\s*\/\s*(-?\d+)$/);
  if (mixedMatch) {
    const w = parseInt(mixedMatch[1], 10);
    const n = parseInt(mixedMatch[2], 10);
    const d = parseInt(mixedMatch[3], 10);
    if (isNaN(w) || isNaN(n) || isNaN(d) || d === 0) return null;
    return { kind: 'mixed', value: { whole: w, num: n, den: d } };
  }
  // Improper "n/d"
  const fracMatch = trimmed.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
  if (fracMatch) {
    const n = parseInt(fracMatch[1], 10);
    const d = parseInt(fracMatch[2], 10);
    if (isNaN(n) || isNaN(d) || d === 0) return null;
    return { kind: 'improper', value: { num: n, den: d } };
  }
  // Whole number only
  const wholeMatch = trimmed.match(/^-?\d+$/);
  if (wholeMatch) {
    const w = parseInt(trimmed, 10);
    if (isNaN(w)) return null;
    return { kind: 'mixed', value: { whole: w, num: 0, den: 1 } };
  }
  return null;
}

export function FractionsPlay({ settings, onComplete, onQuit }: Props) {
  const { t } = useT();
  const [questions, setQuestions] = useState<FractionQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [incorrect, setIncorrect] = useState<FractionIncorrectEntry[]>([]);
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'incorrect'>('none');
  // Optional teaching note shown with a correct answer (e.g. the simplest form
  // when the child entered an equivalent-but-unsimplified fraction).
  const [feedbackNote, setFeedbackNote] = useState<string | null>(null);
  // Op-style inputs (also used by `id`, `mul-by-whole`, `mul-frac`, `from-decimal`).
  const [numInput, setNumInput] = useState('');
  const [denInput, setDenInput] = useState('');
  // Optional whole-part input for mul-by-whole / from-decimal (defaults to 0).
  const [wholeInput, setWholeInput] = useState('');
  // `eq` skill uses a single integer input for the missing field.
  const [eqInput, setEqInput] = useState('');
  // `mixed` skill uses a free-form text input.
  const [mixedInput, setMixedInput] = useState('');
  // `mixed-mul-whole` uses three inputs: whole, num, den.
  const [mmwWholeInput, setMmwWholeInput] = useState('');
  const [mmwNumInput, setMmwNumInput] = useState('');
  const [mmwDenInput, setMmwDenInput] = useState('');
  // `to-decimal` uses a single decimal input.
  const [decimalInput, setDecimalInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(settings.timeLimit);
  const [isComplete, setIsComplete] = useState(false);
  const startTimeRef = useRef(Date.now());
  const loggedRef = useRef(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const numRef = useRef<HTMLInputElement>(null);
  const eqRef = useRef<HTMLInputElement>(null);
  const mixedRef = useRef<HTMLInputElement>(null);
  const mmwRef = useRef<HTMLInputElement>(null);
  const decimalRef = useRef<HTMLInputElement>(null);
  const wholeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const count = settings.gameMode === 'questions' ? settings.questionCount : 200;
    setQuestions(generateFractionQuestions(settings, count));
  }, [settings]);

  useEffect(() => {
    setNumInput('');
    setDenInput('');
    setWholeInput('');
    setEqInput('');
    setMixedInput('');
    setMmwWholeInput('');
    setMmwNumInput('');
    setMmwDenInput('');
    setDecimalInput('');
    setTimeout(() => {
      const q = questions[currentIndex];
      if (!q) return;
      if (isEqQuestion(q)) eqRef.current?.focus();
      else if (isMixedQuestion(q)) mixedRef.current?.focus();
      else if (isMixedMulWholeQuestion(q) || isMixedAddSubQuestion(q))
        mmwRef.current?.focus();
      else if (isToDecimalQuestion(q)) decimalRef.current?.focus();
      else numRef.current?.focus();
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
          module: 'fractions',
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
    (isCorrect: boolean, note?: string) => {
      setQuestionsAnswered(p => p + 1);
      setFeedbackNote(note ?? null);
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
      }
      // Give a wrong answer longer on screen so the child can read the correct
      // one; a correct answer with a teaching note also lingers a little.
      const delay = feedbackDelay(isCorrect ? (note ? 1800 : 800) : 2600);
      setTimeout(() => {
        setFeedback('none');
        setFeedbackNote(null);
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
    [currentIndex, questions.length, settings]
  );

  const submitOp = useCallback(
    (value: Frac | null) => {
      if (questions.length === 0) return;
      const q = questions[currentIndex];
      if (!(isOpQuestion(q) || isIdQuestion(q))) return;

      const recordWrong = () =>
        setIncorrect(prev => [
          ...prev,
          {
            question: q,
            userAnswer: value ? { kind: 'frac', value } : { kind: 'none' },
          },
        ]);

      if (isOpQuestion(q)) {
        // Equivalent-but-unsimplified answers (e.g. 10/16 for 5/8) count as
        // correct with a gentle nudge toward simplest form, rather than wrong.
        const grade = gradeOpAnswer(value, q.answer, settings.simplify);
        if (grade === 'wrong') {
          recordWrong();
          advance(false);
        } else if (grade === 'equivalent') {
          advance(true, t('fractions.play.simplestForm', { frac: `${q.answer.num}/${q.answer.den}` }));
        } else {
          advance(true);
        }
        return;
      }

      // `id` accepts any equivalent form.
      const isCorrect = value !== null && value.den !== 0 && fracEquals(value, q.answer);
      if (!isCorrect) recordWrong();
      advance(isCorrect);
    },
    [currentIndex, questions, settings, advance]
  );

  // Submit for mul-by-whole and from-decimal — both use the optional-whole
  // + n/d form. mul-by-whole accepts any equivalent (improper or mixed);
  // from-decimal accepts any equivalent fraction (whole irrelevant since
  // we only generate decimals < 1).
  // mul-frac uses just n/d with whole defaulted to 0.
  const submitMulOrFrom = useCallback(
    (whole: number, frac: Frac | null) => {
      if (questions.length === 0) return;
      const q = questions[currentIndex];
      let isCorrect = false;
      let captured: FractionUserAnswer = { kind: 'none' };
      if (frac !== null && frac.den !== 0) {
        if (isMulByWholeQuestion(q)) {
          const mixedIn: MixedNumber = { whole, num: frac.num, den: frac.den };
          isCorrect = mulAnswerAccepted(q.answer, { kind: 'mixed', value: mixedIn });
          captured = { kind: 'mul-answer', value: { whole, num: frac.num, den: frac.den } };
        } else if (isMulFracQuestion(q)) {
          // Whole input ignored for mul-frac; treat as improper input.
          isCorrect = whole === 0 && fracEquals(frac, q.answer);
          captured = { kind: 'frac', value: frac };
        } else if (isFromDecimalQuestion(q)) {
          // Accept any equivalent fraction. Optional whole > 0 means the kid
          // typed something like "1 0/4" — treat whole + frac as one value.
          const userImp: Frac =
            whole > 0
              ? { num: whole * frac.den + frac.num, den: frac.den }
              : frac;
          const canonical: Frac = { num: q.num, den: q.den };
          isCorrect = fracEquals(userImp, canonical);
          captured =
            whole > 0
              ? { kind: 'mul-answer', value: { whole, num: frac.num, den: frac.den } }
              : { kind: 'frac', value: frac };
        }
      }
      if (!isCorrect) {
        setIncorrect(prev => [...prev, { question: q, userAnswer: captured }]);
      }
      advance(isCorrect);
    },
    [currentIndex, questions, advance]
  );

  const submitMixedMulWhole = useCallback(
    (whole: number, num: number, den: number) => {
      if (questions.length === 0) return;
      const q = questions[currentIndex];
      if (!isMixedMulWholeQuestion(q)) return;
      let isCorrect = false;
      if (den !== 0) {
        const mixedIn: MixedNumber = { whole, num, den };
        isCorrect = mulAnswerAccepted(q.answer, { kind: 'mixed', value: mixedIn });
      }
      if (!isCorrect) {
        setIncorrect(prev => [
          ...prev,
          {
            question: q,
            userAnswer:
              den === 0
                ? { kind: 'none' }
                : { kind: 'mul-answer', value: { whole, num, den } },
          },
        ]);
      }
      advance(isCorrect);
    },
    [currentIndex, questions, advance]
  );

  // add-mixed / sub-mixed: identical answer payload shape to mixed-mul-whole
  // (whole + num/den), so `mulAnswerAccepted` accepts any equivalent form.
  const submitMixedAddSub = useCallback(
    (whole: number, num: number, den: number) => {
      if (questions.length === 0) return;
      const q = questions[currentIndex];
      if (!isMixedAddSubQuestion(q)) return;
      let isCorrect = false;
      if (den !== 0) {
        const mixedIn: MixedNumber = { whole, num, den };
        isCorrect = mulAnswerAccepted(q.answer, { kind: 'mixed', value: mixedIn });
      }
      if (!isCorrect) {
        setIncorrect(prev => [
          ...prev,
          {
            question: q,
            userAnswer:
              den === 0
                ? { kind: 'none' }
                : { kind: 'mul-answer', value: { whole, num, den } },
          },
        ]);
      }
      advance(isCorrect);
    },
    [currentIndex, questions, advance]
  );

  // div-frac-whole: any equivalent fraction is accepted.
  const submitDivFracWhole = useCallback(
    (value: Frac | null) => {
      if (questions.length === 0) return;
      const q = questions[currentIndex];
      if (!isDivFracWholeQuestion(q)) return;
      const isCorrect =
        value !== null && value.den !== 0 && fracEquals(value, q.answer);
      if (!isCorrect) {
        setIncorrect(prev => [
          ...prev,
          {
            question: q,
            userAnswer: value ? { kind: 'frac', value } : { kind: 'none' },
          },
        ]);
      }
      advance(isCorrect);
    },
    [currentIndex, questions, advance]
  );

  const submitDecimal = useCallback(
    (value: number | null) => {
      if (questions.length === 0) return;
      const q = questions[currentIndex];
      if (!isToDecimalQuestion(q)) return;
      const isCorrect = value !== null && decimalAnswerAccepted(q.answer, value);
      if (!isCorrect) {
        setIncorrect(prev => [
          ...prev,
          {
            question: q,
            userAnswer: value !== null ? { kind: 'decimal', value } : { kind: 'none' },
          },
        ]);
      }
      advance(isCorrect);
    },
    [currentIndex, questions, advance]
  );

  const submitEq = useCallback(
    (value: number | null) => {
      if (questions.length === 0) return;
      const q = questions[currentIndex];
      if (!isEqQuestion(q)) return;
      const isCorrect = value !== null && value === q.answer;
      if (!isCorrect) {
        setIncorrect(prev => [
          ...prev,
          {
            question: q,
            userAnswer:
              value !== null ? { kind: 'eq', value, missing: q.missing } : { kind: 'none' },
          },
        ]);
      }
      advance(isCorrect);
    },
    [currentIndex, questions, advance]
  );

  const submitCmp = useCallback(
    (value: CmpSymbol) => {
      if (questions.length === 0) return;
      const q = questions[currentIndex];
      if (!isCmpQuestion(q)) return;
      const isCorrect = value === q.answer;
      if (!isCorrect) {
        setIncorrect(prev => [
          ...prev,
          { question: q, userAnswer: { kind: 'cmp', value } },
        ]);
      }
      advance(isCorrect);
    },
    [currentIndex, questions, advance]
  );

  const submitMixed = useCallback(() => {
    if (questions.length === 0) return;
    const q = questions[currentIndex];
    if (!isMixedQuestion(q)) return;
    const parsed = parseMixedAnswer(mixedInput);
    if (parsed === null) {
      setIncorrect(prev => [...prev, { question: q, userAnswer: { kind: 'none' } }]);
      advance(false);
      return;
    }
    let isCorrect = false;
    if (q.direction === 'to-mixed') {
      // Correct = mixed form matches q.mixed (whole, num, den all equal — but
      // accept any equivalent fractional part via cross-mult on the fraction
      // when whole matches; also accept improper form that equals q.improper).
      if (parsed.kind === 'mixed') {
        const m = parsed.value;
        const sameWhole = m.whole === q.mixed.whole;
        const sameFrac =
          (m.num === 0 && q.mixed.num === 0) ||
          (m.den !== 0 &&
            q.mixed.den !== 0 &&
            m.num * q.mixed.den === q.mixed.num * m.den);
        isCorrect = sameWhole && sameFrac;
      } else {
        // Improper form: only accepted if equivalent to the source improper.
        isCorrect =
          parsed.value.den !== 0 &&
          fracEquals(parsed.value, q.improper);
      }
    } else {
      // to-improper: prefer improper form, but accept mixed form too.
      if (parsed.kind === 'improper') {
        isCorrect = fracEquals(parsed.value, q.improper);
      } else {
        // Convert mixed to improper and compare.
        const asImp: Frac = {
          num: parsed.value.whole * parsed.value.den + parsed.value.num,
          den: parsed.value.den,
        };
        isCorrect = asImp.den !== 0 && fracEquals(asImp, q.improper);
      }
    }
    if (!isCorrect) {
      setIncorrect(prev => [
        ...prev,
        {
          question: q,
          userAnswer:
            parsed.kind === 'mixed'
              ? { kind: 'mixed-mixed', value: parsed.value }
              : { kind: 'mixed-improper', value: parsed.value },
        },
      ]);
    }
    advance(isCorrect);
  }, [currentIndex, questions, mixedInput, advance]);

  const handleOpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numP = parseInt(numInput, 10);
    const denP = parseInt(denInput, 10);
    if (isNaN(numP) || isNaN(denP) || denP === 0) {
      submitOp(null);
      return;
    }
    submitOp({ num: numP, den: denP });
  };

  const handleEqSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = parseInt(eqInput, 10);
    if (isNaN(v)) {
      submitEq(null);
      return;
    }
    submitEq(v);
  };

  const handleMixedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMixed();
  };

  // Combined handler for mul-by-whole / mul-frac / from-decimal — all use
  // optional-whole + n/d form. wholeInput defaults to 0 if blank.
  const handleMulFromSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numP = parseInt(numInput, 10);
    const denP = parseInt(denInput, 10);
    const wP = wholeInput.trim() === '' ? 0 : parseInt(wholeInput, 10);
    if (isNaN(numP) || isNaN(denP) || denP === 0 || isNaN(wP)) {
      submitMulOrFrom(0, null);
      return;
    }
    submitMulOrFrom(wP, { num: numP, den: denP });
  };

  const handleMmwSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const wP = parseInt(mmwWholeInput, 10);
    const nP = parseInt(mmwNumInput, 10);
    const dP = parseInt(mmwDenInput, 10);
    if (isNaN(wP) || isNaN(nP) || isNaN(dP)) {
      submitMixedMulWhole(0, 0, 0);
      return;
    }
    submitMixedMulWhole(wP, nP, dP);
  };

  // add-mixed / sub-mixed share the 3-field whole/num/den input layout.
  const handleMixedAddSubSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const wP = parseInt(mmwWholeInput, 10);
    const nP = parseInt(mmwNumInput, 10);
    const dP = parseInt(mmwDenInput, 10);
    if (isNaN(wP) || isNaN(nP) || isNaN(dP)) {
      submitMixedAddSub(0, 0, 0);
      return;
    }
    submitMixedAddSub(wP, nP, dP);
  };

  // div-frac-whole uses just the n/d input (reuse numInput/denInput).
  const handleDivFracWholeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numP = parseInt(numInput, 10);
    const denP = parseInt(denInput, 10);
    if (isNaN(numP) || isNaN(denP) || denP === 0) {
      submitDivFracWhole(null);
      return;
    }
    submitDivFracWhole({ num: numP, den: denP });
  };

  const handleDecimalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Locale-tolerant: accepts "0.25" and "0,25" alike.
    submitDecimal(parseAnswer(decimalInput));
  };

  // Build the correct-answer display string for the new skills.
  // Returns null if the current question isn't one of the new skills.
  const correctNewSkillAnswer = (q: FractionQuestion): string | null => {
    if (isMulByWholeQuestion(q) || isMixedMulWholeQuestion(q)) {
      const a = q.answer;
      if (a.whole !== undefined) {
        if (a.num === 0) return `${a.whole}`;
        return `${a.whole} ${a.num}/${a.den}`;
      }
      return `${a.num}/${a.den}`;
    }
    if (isMulFracQuestion(q)) return `${q.answer.num}/${q.answer.den}`;
    if (isToDecimalQuestion(q)) {
      // Up to 2 dp, trailing zeros dropped, locale decimal separator.
      return formatNumber(q.answer, { maximumFractionDigits: 2 });
    }
    if (isFromDecimalQuestion(q)) return `${q.num}/${q.den}`;
    if (isMixedAddSubQuestion(q)) {
      const a = q.answer;
      if (a.whole !== undefined) {
        if (a.num === 0) return `${a.whole}`;
        return `${a.whole} ${a.num}/${a.den}`;
      }
      return `${a.num}/${a.den}`;
    }
    if (isDivFracWholeQuestion(q)) return `${q.answer.num}/${q.answer.den}`;
    return null;
  };

  // Derived rendering helpers ---------------------------------------------

  const correctOpDisplay = useMemo(() => {
    if (questions.length === 0) return null;
    const q = questions[currentIndex];
    if (isOpQuestion(q)) return settings.simplify ? simplifyFrac(q.answer) : q.answer;
    if (isIdQuestion(q)) return q.answer;
    return null;
  }, [questions, currentIndex, settings.simplify]);

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

  return (
    <div className="min-h-screen bg-background py-2 px-3 md:py-[26px] md:px-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-3 md:mb-[19px]">
          <div className="mb-2 flex items-center justify-between">
            <Button variant="ghost" onClick={onQuit} className="text-muted-foreground h-11">
              {t('fractions.play.quit')}
            </Button>
            <div className="text-center">
              <span className="text-xl md:text-2xl font-bold text-primary">{score}</span>
              <span className="text-sm md:text-base text-muted-foreground">{t('fractions.play.correct')}</span>
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
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          {streak >= 3 && (
            <div className="mt-2 flex justify-center" role="status" aria-live="polite">
              <span
                key={streak}
                className="animate-bounce-in inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-3 py-1 text-sm font-bold text-white shadow-lg"
              >
                <Flame className="w-4 h-4" />
                {t('fractions.play.streak', { count: streak })}
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
          {isOpQuestion(q) && (
            <>
              <div className="flex items-center justify-center gap-3 text-foreground">
                <FractionDisplay frac={q.a} size="md" />
                <span className="text-4xl md:text-5xl font-extrabold">{opGlyph(skillOp(q.skill))}</span>
                <FractionDisplay frac={q.b} size="md" />
                <span className="text-4xl md:text-5xl font-extrabold">=</span>
              </div>
              {E2E_ENABLED && <E2EOracle data={fractionOpOracle(q)} />}
              {feedback === 'incorrect' && correctOpDisplay && (
                <div className="mt-3 flex items-center justify-center gap-2 text-destructive">
                  <span className="text-2xl md:text-3xl font-bold">=</span>
                  <FractionDisplay frac={correctOpDisplay} size="sm" />
                </div>
              )}
              {feedback === 'correct' && (
                <div className="mt-3 text-2xl md:text-3xl font-extrabold text-success">
                  {feedbackNote ? t('play.feedback.correct') : t('play.feedback.brilliant')}
                </div>
              )}
              {feedback === 'correct' && feedbackNote && (
                <p className="mt-1 text-sm md:text-base font-medium text-muted-foreground">{feedbackNote}</p>
              )}
            </>
          )}

          {isIdQuestion(q) && (
            <>
              <div className="flex flex-col items-center gap-3 text-foreground">
                <div className="text-base md:text-lg font-semibold text-muted-foreground">
                  {t('fractions.play.whatShaded')}
                </div>
                {q.figure === 'circle' ? (
                  <CircleFigure total={q.total} shaded={q.shaded} />
                ) : (
                  <RectFigure
                    total={q.total}
                    shaded={q.shaded}
                    rows={q.rows ?? 1}
                    cols={q.cols ?? q.total}
                  />
                )}
              </div>
              {feedback === 'incorrect' && correctOpDisplay && (
                <div className="mt-3 flex items-center justify-center gap-2 text-destructive">
                  <span className="text-2xl md:text-3xl font-bold">=</span>
                  <FractionDisplay frac={correctOpDisplay} size="sm" />
                </div>
              )}
              {feedback === 'correct' && (
                <div className="mt-3 text-2xl md:text-3xl font-extrabold text-success">{t('play.feedback.brilliant')}</div>
              )}
            </>
          )}

          {isEqQuestion(q) && (
            <>
              <div className="flex items-center justify-center gap-3 text-foreground">
                <FractionDisplay frac={q.source} size="md" />
                <span className="text-4xl md:text-5xl font-extrabold">=</span>
                {q.missing === 'num' ? (
                  <div className="inline-flex flex-col items-center font-extrabold leading-none px-1.5">
                    <span className="text-3xl md:text-4xl pb-1 text-primary">?</span>
                    <span className="border-t-[3px] border-current w-full" />
                    <span className="text-3xl md:text-4xl pt-1">{q.target.den}</span>
                  </div>
                ) : (
                  <div className="inline-flex flex-col items-center font-extrabold leading-none px-1.5">
                    <span className="text-3xl md:text-4xl pb-1">{q.target.num}</span>
                    <span className="border-t-[3px] border-current w-full" />
                    <span className="text-3xl md:text-4xl pt-1 text-primary">?</span>
                  </div>
                )}
              </div>
              {feedback === 'incorrect' && (
                <div className="mt-3 flex items-center justify-center gap-2 text-destructive">
                  <span className="text-2xl md:text-3xl font-bold">=</span>
                  <FractionDisplay frac={q.target} size="sm" />
                </div>
              )}
              {feedback === 'correct' && (
                <div className="mt-3 text-2xl md:text-3xl font-extrabold text-success">{t('play.feedback.brilliant')}</div>
              )}
            </>
          )}

          {isCmpQuestion(q) && (
            <>
              <div className="flex items-center justify-center gap-3 text-foreground">
                <FractionDisplay frac={q.a} size="md" />
                <span className="text-4xl md:text-5xl font-extrabold text-muted-foreground">?</span>
                <FractionDisplay frac={q.b} size="md" />
              </div>
              {feedback === 'incorrect' && (
                <div className="mt-3 text-destructive text-2xl md:text-3xl font-bold">
                  {t('fractions.play.answer', { value: q.answer })}
                </div>
              )}
              {feedback === 'correct' && (
                <div className="mt-3 text-2xl md:text-3xl font-extrabold text-success">{t('play.feedback.brilliant')}</div>
              )}
            </>
          )}

          {isMixedQuestion(q) && (
            <>
              <div className="flex items-center justify-center gap-3 text-foreground">
                {q.direction === 'to-mixed' ? (
                  <>
                    <FractionDisplay frac={q.improper} size="md" />
                    <span className="text-4xl md:text-5xl font-extrabold">=</span>
                    <span className="text-3xl md:text-4xl font-extrabold text-muted-foreground">?</span>
                  </>
                ) : (
                  <>
                    <MixedDisplay m={q.mixed} size="md" />
                    <span className="text-4xl md:text-5xl font-extrabold">=</span>
                    <span className="text-3xl md:text-4xl font-extrabold text-muted-foreground">?/{q.improper.den}</span>
                  </>
                )}
              </div>
              {feedback === 'incorrect' && (
                <div className="mt-3 flex items-center justify-center gap-2 text-destructive">
                  <span className="text-2xl md:text-3xl font-bold">=</span>
                  {q.direction === 'to-mixed' ? (
                    <MixedDisplay m={toMixed(q.improper)} size="sm" />
                  ) : (
                    <FractionDisplay frac={q.improper} size="sm" />
                  )}
                </div>
              )}
              {feedback === 'correct' && (
                <div className="mt-3 text-2xl md:text-3xl font-extrabold text-success">{t('play.feedback.brilliant')}</div>
              )}
            </>
          )}

          {isMulByWholeQuestion(q) && (
            <>
              <div className="flex items-center justify-center gap-3 text-foreground">
                <FractionDisplay frac={q.frac} size="md" />
                <span className="text-4xl md:text-5xl font-extrabold">×</span>
                <span className="text-3xl md:text-4xl font-extrabold">{q.whole}</span>
                <span className="text-4xl md:text-5xl font-extrabold">=</span>
              </div>
              {feedback === 'incorrect' && (
                <div className="mt-3 text-destructive text-2xl md:text-3xl font-bold">
                  = {correctNewSkillAnswer(q)}
                </div>
              )}
              {feedback === 'correct' && (
                <div className="mt-3 text-2xl md:text-3xl font-extrabold text-success">{t('play.feedback.brilliant')}</div>
              )}
            </>
          )}

          {isMixedMulWholeQuestion(q) && (
            <>
              <div className="flex items-center justify-center gap-3 text-foreground">
                <MixedDisplay m={q.mixed} size="md" />
                <span className="text-4xl md:text-5xl font-extrabold">×</span>
                <span className="text-3xl md:text-4xl font-extrabold">{q.whole}</span>
                <span className="text-4xl md:text-5xl font-extrabold">=</span>
              </div>
              {feedback === 'incorrect' && (
                <div className="mt-3 text-destructive text-2xl md:text-3xl font-bold">
                  = {correctNewSkillAnswer(q)}
                </div>
              )}
              {feedback === 'correct' && (
                <div className="mt-3 text-2xl md:text-3xl font-extrabold text-success">{t('play.feedback.brilliant')}</div>
              )}
            </>
          )}

          {isMulFracQuestion(q) && (
            <>
              <div className="flex items-center justify-center gap-3 text-foreground">
                <FractionDisplay frac={q.a} size="md" />
                <span className="text-4xl md:text-5xl font-extrabold">×</span>
                <FractionDisplay frac={q.b} size="md" />
                <span className="text-4xl md:text-5xl font-extrabold">=</span>
              </div>
              {feedback === 'incorrect' && (
                <div className="mt-3 flex items-center justify-center gap-2 text-destructive">
                  <span className="text-2xl md:text-3xl font-bold">=</span>
                  <FractionDisplay frac={q.answer} size="sm" />
                </div>
              )}
              {feedback === 'correct' && (
                <div className="mt-3 text-2xl md:text-3xl font-extrabold text-success">{t('play.feedback.brilliant')}</div>
              )}
            </>
          )}

          {isToDecimalQuestion(q) && (
            <>
              <div className="flex flex-col items-center gap-2 text-foreground">
                <div className="text-base md:text-lg font-semibold text-muted-foreground">
                  {t('fractions.play.writeAsDecimal')}
                </div>
                <FractionDisplay frac={{ num: q.num, den: q.den }} size="md" />
              </div>
              {feedback === 'incorrect' && (
                <div className="mt-3 text-destructive text-2xl md:text-3xl font-bold">
                  = {correctNewSkillAnswer(q)}
                </div>
              )}
              {feedback === 'correct' && (
                <div className="mt-3 text-2xl md:text-3xl font-extrabold text-success">{t('play.feedback.brilliant')}</div>
              )}
            </>
          )}

          {isFromDecimalQuestion(q) && (
            <>
              <div className="flex flex-col items-center gap-2 text-foreground">
                <div className="text-base md:text-lg font-semibold text-muted-foreground">
                  {t('fractions.play.writeAsFraction')}
                </div>
                <span className="text-4xl md:text-5xl font-extrabold">
                  {formatNumber(q.decimal, { maximumFractionDigits: 2 })}
                </span>
              </div>
              {feedback === 'incorrect' && (
                <div className="mt-3 flex items-center justify-center gap-2 text-destructive">
                  <span className="text-2xl md:text-3xl font-bold">=</span>
                  <FractionDisplay frac={{ num: q.num, den: q.den }} size="sm" />
                </div>
              )}
              {feedback === 'correct' && (
                <div className="mt-3 text-2xl md:text-3xl font-extrabold text-success">{t('play.feedback.brilliant')}</div>
              )}
            </>
          )}

          {isMixedAddSubQuestion(q) && (
            <>
              <div className="flex items-center justify-center gap-3 text-foreground flex-wrap">
                <MixedDisplay m={q.a} size="md" />
                <span className="text-4xl md:text-5xl font-extrabold">
                  {q.skill === 'add-mixed' ? '+' : '−'}
                </span>
                <MixedDisplay m={q.b} size="md" />
                <span className="text-4xl md:text-5xl font-extrabold">=</span>
              </div>
              {feedback === 'incorrect' && (
                <div className="mt-3 text-destructive text-2xl md:text-3xl font-bold">
                  = {correctNewSkillAnswer(q)}
                </div>
              )}
              {feedback === 'correct' && (
                <div className="mt-3 text-2xl md:text-3xl font-extrabold text-success">{t('play.feedback.brilliant')}</div>
              )}
            </>
          )}

          {isDivFracWholeQuestion(q) && (
            <>
              <div className="flex items-center justify-center gap-3 text-foreground">
                <FractionDisplay frac={q.frac} size="md" />
                <span className="text-4xl md:text-5xl font-extrabold">÷</span>
                <span className="text-3xl md:text-4xl font-extrabold">{q.whole}</span>
                <span className="text-4xl md:text-5xl font-extrabold">=</span>
              </div>
              {feedback === 'incorrect' && (
                <div className="mt-3 flex items-center justify-center gap-2 text-destructive">
                  <span className="text-2xl md:text-3xl font-bold">=</span>
                  <FractionDisplay frac={q.answer} size="sm" />
                </div>
              )}
              {feedback === 'correct' && (
                <div className="mt-3 text-2xl md:text-3xl font-extrabold text-success">{t('play.feedback.brilliant')}</div>
              )}
            </>
          )}
        </Card>

        {feedback === 'none' && (
          <>
            {/* Op + id share the two-field n/d form. */}
            {(isOpQuestion(q) || isIdQuestion(q)) && (
              <form onSubmit={handleOpSubmit} className="space-y-2 md:space-y-[13px]">
                <div className="flex items-center justify-center gap-2 md:gap-3">
                  <Input
                    ref={numRef}
                    type="number"
                    inputMode="numeric"
                    value={numInput}
                    onChange={e => setNumInput(e.target.value)}
                    placeholder={t('fractions.play.numPlaceholder')}
                    aria-label={t('fractions.play.numerator')}
                    className="h-12 md:h-[64px] w-24 md:w-28 text-center text-2xl md:text-3xl font-bold"
                    autoFocus
                  />
                  <span className="text-3xl md:text-4xl font-extrabold text-foreground">/</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={denInput}
                    onChange={e => setDenInput(e.target.value)}
                    placeholder={t('fractions.play.denPlaceholder')}
                    aria-label={t('fractions.play.denominator')}
                    className="h-12 md:h-[64px] w-24 md:w-28 text-center text-2xl md:text-3xl font-bold"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full py-3 md:py-[19px] text-lg md:text-xl font-bold shadow-button"
                  disabled={numInput === '' || denInput === ''}
                >
                  {t('fractions.play.check')}
                </Button>
              </form>
            )}

            {isEqQuestion(q) && (
              <form onSubmit={handleEqSubmit} className="space-y-2 md:space-y-[13px]">
                <div className="flex items-center justify-center gap-2 md:gap-3">
                  <Input
                    ref={eqRef}
                    type="number"
                    inputMode="numeric"
                    value={eqInput}
                    onChange={e => setEqInput(e.target.value)}
                    placeholder={q.missing === 'num' ? t('fractions.play.numeratorPlaceholder') : t('fractions.play.denominatorPlaceholder')}
                    aria-label={q.missing === 'num' ? t('fractions.play.missingNumerator') : t('fractions.play.missingDenominator')}
                    className="h-12 md:h-[64px] w-32 md:w-40 text-center text-2xl md:text-3xl font-bold"
                    autoFocus
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full py-3 md:py-[19px] text-lg md:text-xl font-bold shadow-button"
                  disabled={eqInput === ''}
                >
                  {t('fractions.play.check')}
                </Button>
              </form>
            )}

            {isCmpQuestion(q) && (
              <div className="grid grid-cols-3 gap-2 md:gap-3">
                {(['<', '=', '>'] as const).map(sym => (
                  <Button
                    key={sym}
                    onClick={() => submitCmp(sym)}
                    className="py-4 md:py-[19px] text-2xl md:text-3xl font-extrabold shadow-button"
                  >
                    {sym}
                  </Button>
                ))}
              </div>
            )}

            {isMixedQuestion(q) && (
              <form onSubmit={handleMixedSubmit} className="space-y-2 md:space-y-[13px]">
                <div className="flex items-center justify-center gap-2 md:gap-3">
                  <Input
                    ref={mixedRef}
                    type="text"
                    inputMode="text"
                    value={mixedInput}
                    onChange={e => setMixedInput(e.target.value)}
                    placeholder={q.direction === 'to-mixed' ? t('fractions.play.mixedPlaceholder') : t('fractions.play.improperPlaceholder')}
                    aria-label={t('fractions.play.answerAria')}
                    className="h-12 md:h-[64px] w-48 md:w-60 text-center text-2xl md:text-3xl font-bold"
                    autoFocus
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full py-3 md:py-[19px] text-lg md:text-xl font-bold shadow-button"
                  disabled={mixedInput.trim() === ''}
                >
                  {t('fractions.play.check')}
                </Button>
              </form>
            )}

            {/* mul-by-whole, mul-frac, from-decimal: optional whole + n/d. */}
            {(isMulByWholeQuestion(q) || isMulFracQuestion(q) || isFromDecimalQuestion(q)) && (
              <form onSubmit={handleMulFromSubmit} className="space-y-2 md:space-y-[13px]">
                <div className="flex items-center justify-center gap-2 md:gap-3">
                  <Input
                    ref={wholeRef}
                    type="number"
                    inputMode="numeric"
                    value={wholeInput}
                    onChange={e => setWholeInput(e.target.value)}
                    placeholder={t('fractions.play.wholePlaceholder')}
                    aria-label={t('fractions.play.wholePartOptional')}
                    className="h-12 md:h-[64px] w-20 md:w-24 text-center text-2xl md:text-3xl font-bold"
                  />
                  <Input
                    ref={numRef}
                    type="number"
                    inputMode="numeric"
                    value={numInput}
                    onChange={e => setNumInput(e.target.value)}
                    placeholder={t('fractions.play.numPlaceholder')}
                    aria-label={t('fractions.play.numerator')}
                    className="h-12 md:h-[64px] w-24 md:w-28 text-center text-2xl md:text-3xl font-bold"
                    autoFocus
                  />
                  <span className="text-3xl md:text-4xl font-extrabold text-foreground">/</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={denInput}
                    onChange={e => setDenInput(e.target.value)}
                    placeholder={t('fractions.play.denPlaceholder')}
                    aria-label={t('fractions.play.denominator')}
                    className="h-12 md:h-[64px] w-24 md:w-28 text-center text-2xl md:text-3xl font-bold"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full py-3 md:py-[19px] text-lg md:text-xl font-bold shadow-button"
                  disabled={numInput === '' || denInput === ''}
                >
                  {t('fractions.play.check')}
                </Button>
              </form>
            )}

            {/* mixed-mul-whole: three fields — whole, num, den. */}
            {isMixedMulWholeQuestion(q) && (
              <form onSubmit={handleMmwSubmit} className="space-y-2 md:space-y-[13px]">
                <div className="flex items-center justify-center gap-2 md:gap-3">
                  <Input
                    ref={mmwRef}
                    type="number"
                    inputMode="numeric"
                    value={mmwWholeInput}
                    onChange={e => setMmwWholeInput(e.target.value)}
                    placeholder={t('fractions.play.wholePlaceholder')}
                    aria-label={t('fractions.play.wholePart')}
                    className="h-12 md:h-[64px] w-20 md:w-24 text-center text-2xl md:text-3xl font-bold"
                    autoFocus
                  />
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={mmwNumInput}
                    onChange={e => setMmwNumInput(e.target.value)}
                    placeholder={t('fractions.play.numPlaceholder')}
                    aria-label={t('fractions.play.numerator')}
                    className="h-12 md:h-[64px] w-24 md:w-28 text-center text-2xl md:text-3xl font-bold"
                  />
                  <span className="text-3xl md:text-4xl font-extrabold text-foreground">/</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={mmwDenInput}
                    onChange={e => setMmwDenInput(e.target.value)}
                    placeholder={t('fractions.play.denPlaceholder')}
                    aria-label={t('fractions.play.denominator')}
                    className="h-12 md:h-[64px] w-24 md:w-28 text-center text-2xl md:text-3xl font-bold"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full py-3 md:py-[19px] text-lg md:text-xl font-bold shadow-button"
                  disabled={
                    mmwWholeInput === '' || mmwNumInput === '' || mmwDenInput === ''
                  }
                >
                  {t('fractions.play.check')}
                </Button>
              </form>
            )}

            {/* add-mixed / sub-mixed: three fields — whole, num, den. */}
            {isMixedAddSubQuestion(q) && (
              <form onSubmit={handleMixedAddSubSubmit} className="space-y-2 md:space-y-[13px]">
                <div className="flex items-center justify-center gap-2 md:gap-3">
                  <Input
                    ref={mmwRef}
                    type="number"
                    inputMode="numeric"
                    value={mmwWholeInput}
                    onChange={e => setMmwWholeInput(e.target.value)}
                    placeholder={t('fractions.play.wholePlaceholder')}
                    aria-label={t('fractions.play.wholePart')}
                    className="h-12 md:h-[64px] w-20 md:w-24 text-center text-2xl md:text-3xl font-bold"
                    autoFocus
                  />
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={mmwNumInput}
                    onChange={e => setMmwNumInput(e.target.value)}
                    placeholder={t('fractions.play.numPlaceholder')}
                    aria-label={t('fractions.play.numerator')}
                    className="h-12 md:h-[64px] w-24 md:w-28 text-center text-2xl md:text-3xl font-bold"
                  />
                  <span className="text-3xl md:text-4xl font-extrabold text-foreground">/</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={mmwDenInput}
                    onChange={e => setMmwDenInput(e.target.value)}
                    placeholder={t('fractions.play.denPlaceholder')}
                    aria-label={t('fractions.play.denominator')}
                    className="h-12 md:h-[64px] w-24 md:w-28 text-center text-2xl md:text-3xl font-bold"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full py-3 md:py-[19px] text-lg md:text-xl font-bold shadow-button"
                  disabled={
                    mmwWholeInput === '' || mmwNumInput === '' || mmwDenInput === ''
                  }
                >
                  {t('fractions.play.check')}
                </Button>
              </form>
            )}

            {/* div-frac-whole: two fields — num / den. */}
            {isDivFracWholeQuestion(q) && (
              <form onSubmit={handleDivFracWholeSubmit} className="space-y-2 md:space-y-[13px]">
                <div className="flex items-center justify-center gap-2 md:gap-3">
                  <Input
                    ref={numRef}
                    type="number"
                    inputMode="numeric"
                    value={numInput}
                    onChange={e => setNumInput(e.target.value)}
                    placeholder={t('fractions.play.numPlaceholder')}
                    aria-label={t('fractions.play.numerator')}
                    className="h-12 md:h-[64px] w-24 md:w-28 text-center text-2xl md:text-3xl font-bold"
                    autoFocus
                  />
                  <span className="text-3xl md:text-4xl font-extrabold text-foreground">/</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={denInput}
                    onChange={e => setDenInput(e.target.value)}
                    placeholder={t('fractions.play.denPlaceholder')}
                    aria-label={t('fractions.play.denominator')}
                    className="h-12 md:h-[64px] w-24 md:w-28 text-center text-2xl md:text-3xl font-bold"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full py-3 md:py-[19px] text-lg md:text-xl font-bold shadow-button"
                  disabled={numInput === '' || denInput === ''}
                >
                  {t('fractions.play.check')}
                </Button>
              </form>
            )}

            {/* to-decimal: single decimal input. */}
            {isToDecimalQuestion(q) && (
              <form onSubmit={handleDecimalSubmit} className="space-y-2 md:space-y-[13px]">
                <div className="flex items-center justify-center gap-2 md:gap-3">
                  <Input
                    ref={decimalRef}
                    type="text"
                    inputMode="decimal"
                    value={decimalInput}
                    onChange={e => setDecimalInput(e.target.value)}
                    placeholder={t('fractions.play.decimalPlaceholder')}
                    aria-label={t('fractions.play.decimalAnswer')}
                    className="h-12 md:h-[64px] w-40 md:w-48 text-center text-2xl md:text-3xl font-bold"
                    autoFocus
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full py-3 md:py-[19px] text-lg md:text-xl font-bold shadow-button"
                  disabled={decimalInput.trim() === ''}
                >
                  {t('fractions.play.check')}
                </Button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
