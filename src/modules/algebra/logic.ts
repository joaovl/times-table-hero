// Algebra module — Y6.
//
// Skills cover the UK National Curriculum Year 6 "Algebra" strand:
//   - formula-eval         : plug values into a simple formula
//   - missing-number       : solve for the unknown in a one-step equation
//   - sequence-next        : continue a linear number sequence
//   - sequence-rule        : describe the rule of a linear sequence
//   - expression-evaluate  : evaluate an algebraic expression at a value
//
// PDF-safe glyphs only ('+', '-', '×', '÷', '=', parens). Variables are
// ASCII letters ('a', 'b', 'x', 'p', 'l', 'w', 'n', ...).

import { integerChoices } from '@/lib/game/choices';
import { t, type MessageKey } from '@/lib/i18n/i18n';

export type AlgebraSkill =
  | 'formula-eval'
  | 'missing-number'
  | 'sequence-next'
  | 'sequence-rule'
  | 'expression-evaluate';

export type Difficulty = 'easy' | 'medium' | 'hard';

// formula-eval: "If p = 2(l + w), and l=3 w=4, what is p?"
// We store the formula type as an enum so a renderer can lay it out and the
// answer is computed deterministically.
export type FormulaKind = 'perimeter' | 'area' | 'doubled-sum' | 'half-product';

export interface FormulaEvalQuestion {
  skill: 'formula-eval';
  formula: FormulaKind;
  /** Variables in stable order ('l', 'w', 'b', 'h', 's', ...). */
  inputs: Array<{ name: string; value: number }>;
  /** Result-variable name ('p', 'a', etc.). */
  resultName: string;
  /** Display string for the formula, e.g. "p = 2(l + w)". */
  formulaText: string;
  answer: number;
}

// missing-number: 3a + 4 = 10. Find a. → 2
// We pin the equation shape as a*x + b = c. answer = (c - b) / a.
export interface MissingNumberQuestion {
  skill: 'missing-number';
  varName: string; // 'a', 'x', 'n', etc.
  coeff: number;   // a (positive integer)
  constant: number; // b (non-negative integer)
  rhs: number;     // c
  answer: number;  // (c - b) / a, always a positive integer
}

// sequence-next: "2, 5, 8, 11, ?, ?" -> [14, 17]. Linear sequence with
// start, step, length 4, missing two trailing terms.
export interface SequenceNextQuestion {
  skill: 'sequence-next';
  sequence: number[];  // visible terms (length 4)
  step: number;        // common difference
  start: number;       // first term
  answer: [number, number]; // next two terms
}

// sequence-rule: "What is the rule for 3, 7, 11, 15?" -> "add 4"
// Online: presented as MC (3 distractors). PDF: blank slot with canonical
// "add N" or "subtract N" answer.
export interface SequenceRuleQuestion {
  skill: 'sequence-rule';
  sequence: number[];  // length 4
  step: number;        // can be negative
  answer: string;      // "add 4" or "subtract 3"
}

// expression-evaluate: "If x = 5, what is 3x - 2?" -> 13
// Stored as coeff*var + constant, evaluated at varValue.
export interface ExpressionEvaluateQuestion {
  skill: 'expression-evaluate';
  varName: string;     // 'x'
  varValue: number;    // value of x
  coeff: number;       // 3
  constant: number;    // -2 (can be negative)
  /** Display string, e.g. "3x - 2". */
  expression: string;
  answer: number;
}

export type AlgebraQuestion =
  | FormulaEvalQuestion
  | MissingNumberQuestion
  | SequenceNextQuestion
  | SequenceRuleQuestion
  | ExpressionEvaluateQuestion;

export interface AlgebraSettings {
  skills: AlgebraSkill[];
  difficulty: Difficulty;
  gameMode: 'questions' | 'time';
  questionCount: number;
  timeLimit: number;
}

export const ALL_SKILLS: AlgebraSkill[] = [
  'formula-eval',
  'missing-number',
  'sequence-next',
  'sequence-rule',
  'expression-evaluate',
];

// Kept English-only: consumed by printConfig.ts/pdf.ts for the printed
// worksheet, which is out of scope for this extraction pass.
export const SKILL_LABELS: Record<AlgebraSkill, string> = {
  'formula-eval': 'Use a formula',
  'missing-number': 'Missing number',
  'sequence-next': 'Next in sequence',
  'sequence-rule': 'Sequence rule',
  'expression-evaluate': 'Evaluate expression',
};

const SKILL_KEY: Record<AlgebraSkill, MessageKey> = {
  'formula-eval': 'algebra.skills.formulaEval',
  'missing-number': 'algebra.skills.missingNumber',
  'sequence-next': 'algebra.skills.sequenceNext',
  'sequence-rule': 'algebra.skills.sequenceRule',
  'expression-evaluate': 'algebra.skills.expressionEvaluate',
};

export function skillLabel(s: AlgebraSkill): string {
  return t(SKILL_KEY[s]);
}

export const CURRICULUM_TAGS: Record<
  AlgebraSkill,
  { year: 6; objective: string }[]
> = {
  'formula-eval': [
    {
      year: 6,
      objective: 'Use simple formulae (e.g. perimeter = 2(l+w))',
    },
  ],
  'missing-number': [
    {
      year: 6,
      objective: 'Express missing-number problems algebraically (e.g. 3a + 4 = 10)',
    },
  ],
  'sequence-next': [
    {
      year: 6,
      objective: 'Generate and describe linear number sequences',
    },
  ],
  'sequence-rule': [
    {
      year: 6,
      objective: 'Describe linear number sequences (find the term-to-term rule)',
    },
  ],
  'expression-evaluate': [
    {
      year: 6,
      objective: 'Substitute values into expressions',
    },
  ],
};

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pickFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---------- formula-eval ----------

function buildFormulaEval(difficulty: Difficulty): FormulaEvalQuestion {
  const formulas: FormulaKind[] = ['perimeter', 'area', 'doubled-sum', 'half-product'];
  const formula = pickFrom(formulas);
  const max = difficulty === 'easy' ? 10 : difficulty === 'medium' ? 20 : 50;
  if (formula === 'perimeter') {
    const l = randInt(1, max);
    const w = randInt(1, max);
    return {
      skill: 'formula-eval',
      formula,
      inputs: [{ name: 'l', value: l }, { name: 'w', value: w }],
      resultName: 'p',
      formulaText: 'p = 2(l + w)',
      answer: 2 * (l + w),
    };
  }
  if (formula === 'area') {
    const l = randInt(2, max);
    const w = randInt(2, max);
    return {
      skill: 'formula-eval',
      formula,
      inputs: [{ name: 'l', value: l }, { name: 'w', value: w }],
      resultName: 'a',
      formulaText: 'a = l × w',
      answer: l * w,
    };
  }
  if (formula === 'doubled-sum') {
    const a = randInt(1, max);
    const b = randInt(1, max);
    return {
      skill: 'formula-eval',
      formula,
      inputs: [{ name: 'a', value: a }, { name: 'b', value: b }],
      resultName: 'y',
      formulaText: 'y = 2a + b',
      answer: 2 * a + b,
    };
  }
  // half-product: keep even product so the answer stays integer.
  const a = randInt(1, max);
  let b = randInt(1, max);
  if ((a * b) % 2 !== 0) b += 1; // bump b so product is even
  return {
    skill: 'formula-eval',
    formula,
    inputs: [{ name: 'a', value: a }, { name: 'b', value: b }],
    resultName: 'h',
    formulaText: 'h = (a × b) ÷ 2',
    answer: (a * b) / 2,
  };
}

// ---------- missing-number ----------

const VAR_NAMES = ['a', 'b', 'n', 'x', 'y', 'p'] as const;

function buildMissingNumber(difficulty: Difficulty): MissingNumberQuestion {
  const varName = pickFrom(VAR_NAMES);
  // Pick a so coeff*answer + b = c with all positive integers.
  const maxCoeff = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 8 : 12;
  const coeff = randInt(2, maxCoeff);
  const maxConst = difficulty === 'easy' ? 10 : difficulty === 'medium' ? 30 : 50;
  const constant = randInt(0, maxConst);
  const maxAnswer = difficulty === 'easy' ? 9 : difficulty === 'medium' ? 12 : 20;
  const answer = randInt(1, maxAnswer);
  const rhs = coeff * answer + constant;
  return { skill: 'missing-number', varName, coeff, constant, rhs, answer };
}

// ---------- sequence-next ----------

function buildSequenceNext(difficulty: Difficulty): SequenceNextQuestion {
  // Step can be positive or negative (sample.includes(0) ruled out).
  const stepMag = difficulty === 'easy' ? randInt(2, 5) : difficulty === 'medium' ? randInt(2, 9) : randInt(3, 12);
  const stepSign = difficulty === 'hard' && Math.random() < 0.3 ? -1 : 1;
  const step = stepMag * stepSign;
  const maxStart = difficulty === 'easy' ? 10 : difficulty === 'medium' ? 30 : 80;
  // Start so the visible terms stay non-negative.
  const start = step > 0 ? randInt(1, maxStart) : randInt(stepMag * 5, stepMag * 8);
  const sequence = [start, start + step, start + 2 * step, start + 3 * step];
  const answer: [number, number] = [start + 4 * step, start + 5 * step];
  return { skill: 'sequence-next', sequence, step, start, answer };
}

// ---------- sequence-rule ----------

function buildSequenceRule(difficulty: Difficulty): SequenceRuleQuestion {
  const stepMag = difficulty === 'easy' ? randInt(2, 5) : difficulty === 'medium' ? randInt(2, 9) : randInt(3, 12);
  const stepSign = difficulty === 'hard' && Math.random() < 0.3 ? -1 : 1;
  const step = stepMag * stepSign;
  const maxStart = difficulty === 'easy' ? 10 : difficulty === 'medium' ? 30 : 80;
  const start = step > 0 ? randInt(1, maxStart) : randInt(stepMag * 5, stepMag * 8);
  const sequence = [start, start + step, start + 2 * step, start + 3 * step];
  const answer = step >= 0 ? `add ${stepMag}` : `subtract ${stepMag}`;
  return { skill: 'sequence-rule', sequence, step, answer };
}

// ---------- expression-evaluate ----------

function buildExpressionEvaluate(difficulty: Difficulty): ExpressionEvaluateQuestion {
  const varName = 'x';
  const maxCoeff = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 9 : 12;
  const maxConst = difficulty === 'easy' ? 9 : difficulty === 'medium' ? 20 : 30;
  const maxVal = difficulty === 'easy' ? 6 : difficulty === 'medium' ? 10 : 15;
  const coeff = randInt(2, maxCoeff);
  // Constant may be positive or negative; render as "+ k" or "- k".
  const sign = Math.random() < 0.5 ? -1 : 1;
  const constant = sign * randInt(1, maxConst);
  const varValue = randInt(1, maxVal);
  const answer = coeff * varValue + constant;
  const constSym = constant >= 0 ? `+ ${constant}` : `- ${Math.abs(constant)}`;
  const expression = `${coeff}${varName} ${constSym}`;
  return { skill: 'expression-evaluate', varName, varValue, coeff, constant, expression, answer };
}

// ---------- Top-level ----------

function sampleOne(skill: AlgebraSkill, difficulty: Difficulty): AlgebraQuestion {
  switch (skill) {
    case 'formula-eval':
      return buildFormulaEval(difficulty);
    case 'missing-number':
      return buildMissingNumber(difficulty);
    case 'sequence-next':
      return buildSequenceNext(difficulty);
    case 'sequence-rule':
      return buildSequenceRule(difficulty);
    case 'expression-evaluate':
      return buildExpressionEvaluate(difficulty);
  }
}

export function generateAlgebraQuestions(
  settings: AlgebraSettings,
  count: number
): AlgebraQuestion[] {
  const skills = settings.skills.length > 0 ? settings.skills : (['missing-number'] as AlgebraSkill[]);
  const out: AlgebraQuestion[] = [];
  for (let i = 0; i < count; i++) {
    out.push(sampleOne(pickFrom(skills), settings.difficulty));
  }
  return out;
}

// ---------- Prompt + answer formatting ----------

export function questionPromptText(q: AlgebraQuestion): string {
  if (q.skill === 'formula-eval') {
    const givens = q.inputs.map(i => `${i.name} = ${i.value}`).join(', ');
    return t('algebra.play.formulaEval', { formula: q.formulaText, givens, result: q.resultName });
  }
  if (q.skill === 'missing-number') {
    // Render coeff*var as "3a" (no explicit ×).
    const constPart = q.constant === 0 ? '' : ` + ${q.constant}`;
    return t('algebra.play.missingNumber', {
      expr: `${q.coeff}${q.varName}${constPart}`,
      rhs: q.rhs,
      varName: q.varName,
    });
  }
  if (q.skill === 'sequence-next') {
    return `${q.sequence.join(', ')}, ?, ?`;
  }
  if (q.skill === 'sequence-rule') {
    return t('algebra.play.whatIsTheRule', { sequence: q.sequence.join(', ') });
  }
  // expression-evaluate
  return t('algebra.play.evaluateExpression', { varName: q.varName, varValue: q.varValue, expression: q.expression });
}

export function answerText(q: AlgebraQuestion): string {
  if (q.skill === 'sequence-next') return `${q.answer[0]}, ${q.answer[1]}`;
  if (q.skill === 'sequence-rule') return q.answer;
  // numeric skills
  return String((q as { answer: number }).answer);
}

// Parse a "x, y" or "x y" pair of integers; null on failure.
export function parsePair(input: string): [number, number] | null {
  if (typeof input !== 'string') return null;
  const tokens = input.trim().split(/[,\s]+/).filter(Boolean);
  if (tokens.length !== 2) return null;
  const a = Number(tokens[0]);
  const b = Number(tokens[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (!Number.isInteger(a) || !Number.isInteger(b)) return null;
  return [a, b];
}

// Normalise a sequence-rule textual answer:
//   "add 4", "+4", "+ 4" → "add 4"
//   "subtract 3", "-3", "- 3", "minus 3" → "subtract 3"
export function normaliseRule(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;
  let m = trimmed.match(/^(?:add|plus|\+)\s*(\d+)$/);
  if (m) return `add ${m[1]}`;
  m = trimmed.match(/^(?:subtract|sub|minus|-)\s*(\d+)$/);
  if (m) return `subtract ${m[1]}`;
  return null;
}

export function checkAlgebraAnswer(q: AlgebraQuestion, input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  if (q.skill === 'sequence-next') {
    const parsed = parsePair(trimmed);
    if (!parsed) return false;
    return parsed[0] === q.answer[0] && parsed[1] === q.answer[1];
  }
  if (q.skill === 'sequence-rule') {
    const norm = normaliseRule(trimmed);
    return norm === q.answer;
  }
  if (!/^-?\d+$/.test(trimmed)) return false;
  const n = parseInt(trimmed, 10);
  return n === (q as { answer: number }).answer;
}

// Discriminators
export function isFormulaEvalQuestion(q: AlgebraQuestion): q is FormulaEvalQuestion {
  return q.skill === 'formula-eval';
}
export function isMissingNumberQuestion(q: AlgebraQuestion): q is MissingNumberQuestion {
  return q.skill === 'missing-number';
}
export function isSequenceNextQuestion(q: AlgebraQuestion): q is SequenceNextQuestion {
  return q.skill === 'sequence-next';
}
export function isSequenceRuleQuestion(q: AlgebraQuestion): q is SequenceRuleQuestion {
  return q.skill === 'sequence-rule';
}
export function isExpressionEvaluateQuestion(
  q: AlgebraQuestion
): q is ExpressionEvaluateQuestion {
  return q.skill === 'expression-evaluate';
}

// Multiple-choice options for easy/medium. When the canonical answer is a lone
// integer we offer value buttons; otherwise we return [] and the caller falls
// back to a typed input (lists, decimals, units, coords, names, times, etc.).
// Distractors are filtered through the module grader so exactly one is correct.
export function generateChoices(q: AlgebraQuestion, difficulty: Difficulty): string[] {
  const s = answerText(q).trim();
  if (!/^-?\d+$/.test(s)) return [];
  return integerChoices(parseInt(s, 10), difficulty, c => !checkAlgebraAnswer(q, c));
}
