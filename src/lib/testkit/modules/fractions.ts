import type { PlayableModule } from '../moduleContract';
import { fractionSettings } from '../settings';
import { parseAnswer } from '@/lib/i18n/number';
import {
  ALL_SKILLS,
  generateFractionQuestions,
  gradeOpAnswer,
  fracEquals,
  mulAnswerAccepted,
  decimalAnswerAccepted,
  answerToImproper,
  type Frac,
  type FractionQuestion,
  type FractionSettings,
} from '@/modules/fractions/logic';

// Fractions grades per skill via several exported helpers (mirrors
// FractionsPlay). Each branch below maps a skill group to its grader and to a
// canonical answer string that grader accepts.
const OP = new Set(['add-same', 'sub-same', 'add-diff', 'sub-diff']);
const FRAC_EQ = new Set(['id', 'mul-frac', 'div-frac-whole']);
const MUL_PAYLOAD = new Set(['mul-by-whole', 'mixed-mul-whole', 'add-mixed', 'sub-mixed']);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Q = any;

function parseFracStr(a: string): Frac | null {
  const m = a.trim().match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
  if (!m) return null;
  return { num: parseInt(m[1], 10), den: parseInt(m[2], 10) };
}

function correctAnswer(q: FractionQuestion): string {
  const s = q.skill;
  const qq = q as Q;
  if (OP.has(s) || FRAC_EQ.has(s)) return `${qq.answer.num}/${qq.answer.den}`;
  if (s === 'from-decimal') return `${qq.num}/${qq.den}`;
  if (s === 'mixed') return `${qq.improper.num}/${qq.improper.den}`;
  if (s === 'eq') return String(qq.answer);
  if (s === 'cmp') return String(qq.answer);
  if (s === 'to-decimal') return String(qq.answer);
  // mul payload: express the canonical {whole?,num,den} as an improper fraction,
  // which mulAnswerAccepted accepts and which round-trips through parseFracStr.
  const imp = answerToImproper(qq.answer);
  return `${imp.num}/${imp.den}`;
}

function isCorrect(q: FractionQuestion, a: string): boolean {
  const s = q.skill;
  const qq = q as Q;
  if (OP.has(s)) {
    const f = parseFracStr(a);
    return f !== null && f.den !== 0 && gradeOpAnswer(f, qq.answer, false) !== 'wrong';
  }
  if (FRAC_EQ.has(s)) {
    const f = parseFracStr(a);
    return f !== null && f.den !== 0 && fracEquals(f, qq.answer);
  }
  if (s === 'from-decimal') {
    const f = parseFracStr(a);
    return f !== null && f.den !== 0 && fracEquals(f, { num: qq.num, den: qq.den });
  }
  if (s === 'mixed') {
    const f = parseFracStr(a);
    return f !== null && f.den !== 0 && fracEquals(f, qq.improper);
  }
  if (s === 'eq') return Number(a) === qq.answer;
  if (s === 'cmp') return a.trim() === qq.answer;
  if (s === 'to-decimal') {
    const v = parseAnswer(a);
    return v !== null && decimalAnswerAccepted(qq.answer, v);
  }
  // mul payload
  const f = parseFracStr(a);
  return f !== null && f.den !== 0 && mulAnswerAccepted(qq.answer, { kind: 'improper', value: f });
}

export const fractionsModule: PlayableModule<FractionSettings, FractionQuestion> = {
  slug: 'fractions',
  skills: [...ALL_SKILLS],
  settingsFor: fractionSettings,
  generate: (s, n) => generateFractionQuestions(s, n),
  correctAnswer,
  isCorrect,
  choices: (q) => (q.skill === 'cmp' ? ['<', '=', '>'] : []),
};
