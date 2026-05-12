// Word-problems module — UK National Curriculum Years 3-5, one- and
// two-step problems across arithmetic, money, time, measurement, and
// fractions.
//
// Each skill maintains a small list of TEMPLATES. A template owns the
// prompt text (with placeholders), the variable picker, and the answer
// formula. The generator picks a random template that matches the
// requested skill + difficulty, then picks variables and computes the
// answer + (for two-step problems) the intermediate workings string.
//
// Encoding safety: prompts only use ASCII + a small whitelist of WinAnsi
// glyphs (£, °, ², ³). Subtraction uses ASCII hyphen-minus, never U+2212.
// "approximately" is spelled out (no ≈), "less than" / "more than"
// preferred over ≤/≥.

export type WordProblemSkill =
  | 'arith-1step'
  | 'arith-2step'
  | 'money-1step'
  | 'money-2step'
  | 'time-1step'
  | 'measure-1step'
  | 'measure-2step'
  | 'fractions-1step';

export type WordDifficulty = 'easy' | 'medium' | 'hard';

export const WORD_SKILL_OPTIONS: ReadonlyArray<WordProblemSkill> = [
  'arith-1step',
  'arith-2step',
  'money-1step',
  'money-2step',
  'time-1step',
  'measure-1step',
  'measure-2step',
  'fractions-1step',
];

export const WORD_SKILL_LABEL: Record<WordProblemSkill, string> = {
  'arith-1step': 'Arithmetic — one step',
  'arith-2step': 'Arithmetic — two steps',
  'money-1step': 'Money — one step',
  'money-2step': 'Money — two steps',
  'time-1step': 'Time — one step',
  'measure-1step': 'Measurement — one step',
  'measure-2step': 'Measurement — two steps',
  'fractions-1step': 'Fractions — one step',
};

// Short labels for compact chips.
export const WORD_SKILL_SHORT: Record<WordProblemSkill, string> = {
  'arith-1step': 'Arith 1-step',
  'arith-2step': 'Arith 2-step',
  'money-1step': 'Money 1-step',
  'money-2step': 'Money 2-step',
  'time-1step': 'Time',
  'measure-1step': 'Measure 1-step',
  'measure-2step': 'Measure 2-step',
  'fractions-1step': 'Fractions',
};

// UK National Curriculum tags per skill. Exported so the orchestrator
// (hub / lessons screen) can show year-group hints.
export const CURRICULUM_TAGS: Record<WordProblemSkill, ReadonlyArray<string>> = {
  'arith-1step': ['Y3'],
  'arith-2step': ['Y4', 'Y5'],
  'money-1step': ['Y3', 'Y4', 'Y5'],
  'money-2step': ['Y4', 'Y5'],
  'time-1step': ['Y4', 'Y5'],
  'measure-1step': ['Y3', 'Y4'],
  'measure-2step': ['Y5'],
  'fractions-1step': ['Y3', 'Y4'],
};

export interface WordQuestion {
  skill: WordProblemSkill;
  /** Already-filled prompt text — never contains unresolved placeholders. */
  prompt: string;
  /** Canonical answer. Number for plain arithmetic / measurements; string
   *  for money (e.g. "£5.50") and fractions ("5/8"). */
  answer: number | string;
  /** Optional unit string, e.g. "cm", "minutes". For money/fraction answers
   *  the unit is encoded in the answer string itself and `unit` is omitted. */
  unit?: string;
  /** For two-step questions — short hint shown on the feedback panel. */
  workings?: string;
}

export interface WordSettings {
  /** Active skill set. Non-empty. */
  skills: WordProblemSkill[];
  difficulty: WordDifficulty;
  gameMode: 'questions' | 'time';
  questionCount: number;
  timeLimit: number;
}

// Names: mix of cultural backgrounds, gender-balanced.
const NAMES = [
  'Sam', 'Lily', 'Tom', 'Maya', 'Ben', 'Aisha',
  'Noah', 'Zara', 'Alex', 'Mia', 'Ethan', 'Priya',
];

const ARITH_ITEMS = ['apples', 'pencils', 'books', 'marbles', 'stickers'];
// Items chosen so "buys a {item}" reads naturally in English. Avoid mass /
// plural nouns ("sweets", "fruit") here — they appear in the prompt body
// after the indefinite article.
const MONEY_ITEMS = ['book', 'pencil case', 'lunchbox', 'water bottle'];
const MEASURE_ITEMS = ['rope', 'ribbon', 'wood', 'fabric'];
const FRACTION_ITEMS = ['pizza', 'cake', 'chocolate bar', 'sandwich'];

// Plural for fraction items when counting slices/pieces.
const FRACTION_PIECE: Record<string, string> = {
  pizza: 'slices',
  cake: 'pieces',
  'chocolate bar': 'pieces',
  sandwich: 'pieces',
};

// -------------------------------------------------------------- random utils

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick<T>(arr: ReadonlyArray<T>): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Format an integer pence value as "£X.YY" (always two decimals). Negative
// values are clamped to 0 because the templates never produce negatives.
export function formatPounds(pence: number): string {
  const p = Math.max(0, Math.round(pence));
  const pounds = Math.floor(p / 100);
  const remainder = p % 100;
  return `£${pounds}.${remainder.toString().padStart(2, '0')}`;
}

// Parse a user-typed money answer to a pence integer. Accepts:
//   "£3.50", "3.50", "£3", "3", "350p", "50p"
// Returns null when the input cannot be parsed.
export function parseMoneyToPence(raw: string): number | null {
  const s = raw.trim();
  if (s === '') return null;
  // Strip leading currency sign (£ in any form) and whitespace.
  const noCurrency = s.replace(/^\s*[£]\s*/, '').trim();
  // "Np" — bare pence.
  const penceMatch = noCurrency.match(/^(\d+)\s*p$/i);
  if (penceMatch) return parseInt(penceMatch[1], 10);
  // "£X.YY" or "X.YY" — pounds (and optional decimal pence).
  const poundsMatch = noCurrency.match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (poundsMatch) {
    const pounds = parseInt(poundsMatch[1], 10);
    const decimals = poundsMatch[2] ?? '';
    const padded = (decimals + '00').slice(0, 2);
    return pounds * 100 + parseInt(padded || '0', 10);
  }
  return null;
}

// Parse a fraction answer like "3/8". Returns { num, den } or null.
export function parseFraction(raw: string): { num: number; den: number } | null {
  const m = raw.trim().match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!m) return null;
  const num = parseInt(m[1], 10);
  const den = parseInt(m[2], 10);
  if (den === 0) return null;
  return { num, den };
}

// Strip a known unit suffix from a typed answer. Accepts "12 cm", "12cm",
// "12 minutes", etc. Returns the numeric part or null on failure.
function parseNumberWithUnit(raw: string, unit?: string): number | null {
  let s = raw.trim();
  if (s === '') return null;
  if (unit) {
    // Try the unit suffix (case-insensitive), then a few common synonyms.
    const synonyms = [unit];
    if (unit === 'cm') synonyms.push('centimetres', 'centimeters');
    if (unit === 'm') synonyms.push('metres', 'meters');
    if (unit === 'mm') synonyms.push('millimetres', 'millimeters');
    if (unit === 'kg') synonyms.push('kilograms');
    if (unit === 'g') synonyms.push('grams');
    if (unit === 'minutes') synonyms.push('min', 'mins', 'minute');
    if (unit === 'hours') synonyms.push('hr', 'hrs', 'hour');
    for (const syn of synonyms) {
      const re = new RegExp(`\\s*${syn}\\s*$`, 'i');
      if (re.test(s)) {
        s = s.replace(re, '').trim();
        break;
      }
    }
  }
  // Strip a stray trailing alpha tail (defensive: e.g. "12 things")
  s = s.replace(/[a-zA-Z]+$/, '').trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Validate a kid's typed answer against the canonical answer for a question.
 *
 *  - Numeric answers (with optional `unit`): accept "12", "12cm", "12 cm",
 *    matching within ±0.01.
 *  - Money answers (`answer` is a string starting with £): accept "£3.50",
 *    "3.50", "350p" — all compared in pence.
 *  - Fraction answers (e.g. "3/8"): accept "3/8" exactly (matches the
 *    template-generated form; we don't auto-simplify).
 */
export function checkWordAnswer(q: WordQuestion, raw: string): boolean {
  if (raw == null) return false;
  const text = String(raw).trim();
  if (text === '') return false;

  if (typeof q.answer === 'string') {
    // Money.
    if (q.answer.startsWith('£')) {
      const expected = parseMoneyToPence(q.answer);
      const got = parseMoneyToPence(text);
      if (expected === null || got === null) return false;
      return expected === got;
    }
    // Fraction.
    if (q.answer.includes('/')) {
      const expected = parseFraction(q.answer);
      const got = parseFraction(text);
      if (!expected || !got) return false;
      return expected.num === got.num && expected.den === got.den;
    }
    // Plain string fallback.
    return text.toLowerCase() === q.answer.toLowerCase();
  }

  const expected = q.answer;
  const got = parseNumberWithUnit(text, q.unit);
  if (got === null) return false;
  return Math.abs(got - expected) < 0.01;
}

// -------------------------------------------------------------- templates

interface Template {
  skill: WordProblemSkill;
  difficulty: WordDifficulty;
  /** Build a fully-resolved question (no placeholders) from random vars. */
  build: () => WordQuestion;
}

// Arithmetic — one step. Subtraction & addition, small numbers.
const ARITH_1STEP: Template[] = [
  // easy: 1 step, single-digit subtraction
  {
    skill: 'arith-1step',
    difficulty: 'easy',
    build: () => {
      const name = pick(NAMES);
      const item = pick(ARITH_ITEMS);
      const n1 = randInt(8, 19);
      const n2 = randInt(2, Math.min(n1 - 1, 9));
      return {
        skill: 'arith-1step',
        prompt: `${name} has ${n1} ${item}. ${pronounSubject(name)} gives ${n2} away. How many ${item} are left?`,
        answer: n1 - n2,
      };
    },
  },
  // easy: addition of small numbers
  {
    skill: 'arith-1step',
    difficulty: 'easy',
    build: () => {
      const name = pick(NAMES);
      const item = pick(ARITH_ITEMS);
      const n1 = randInt(5, 15);
      const n2 = randInt(2, 10);
      return {
        skill: 'arith-1step',
        prompt: `${name} has ${n1} ${item}. ${pronounSubject(name)} gets ${n2} more. How many ${item} does ${pronounSubject(name).toLowerCase()} have now?`,
        answer: n1 + n2,
      };
    },
  },
  // medium: two-digit subtraction
  {
    skill: 'arith-1step',
    difficulty: 'medium',
    build: () => {
      const name = pick(NAMES);
      const item = pick(ARITH_ITEMS);
      const n1 = randInt(30, 80);
      const n2 = randInt(8, n1 - 5);
      return {
        skill: 'arith-1step',
        prompt: `${name} collected ${n1} ${item}. ${pronounSubject(name)} gave ${n2} to a friend. How many ${item} does ${pronounSubject(name).toLowerCase()} have left?`,
        answer: n1 - n2,
      };
    },
  },
  // medium: two-digit addition
  {
    skill: 'arith-1step',
    difficulty: 'medium',
    build: () => {
      const name = pick(NAMES);
      const item = pick(ARITH_ITEMS);
      const n1 = randInt(20, 60);
      const n2 = randInt(15, 40);
      return {
        skill: 'arith-1step',
        prompt: `${name} had ${n1} ${item} and then found ${n2} more. How many ${item} are there in total?`,
        answer: n1 + n2,
      };
    },
  },
  // hard: larger two-digit (still 1 step)
  {
    skill: 'arith-1step',
    difficulty: 'hard',
    build: () => {
      const name = pick(NAMES);
      const item = pick(ARITH_ITEMS);
      const n1 = randInt(120, 350);
      const n2 = randInt(40, n1 - 20);
      return {
        skill: 'arith-1step',
        prompt: `${name} counted ${n1} ${item} in a box. ${pronounSubject(name)} took out ${n2}. How many ${item} are still in the box?`,
        answer: n1 - n2,
      };
    },
  },
];

// Arithmetic — two steps (multiply + subtract / add).
const ARITH_2STEP: Template[] = [
  // easy: 3 packs of 4, give 2 away
  {
    skill: 'arith-2step',
    difficulty: 'easy',
    build: () => {
      const name = pick(NAMES);
      const packs = randInt(2, 4);
      const perPack = randInt(3, 6);
      const give = randInt(2, perPack);
      const subtotal = packs * perPack;
      return {
        skill: 'arith-2step',
        prompt: `${name} buys ${packs} packs of ${perPack} pens. ${pronounSubject(name)} gives ${give} away. How many pens does ${pronounSubject(name).toLowerCase()} have left?`,
        answer: subtotal - give,
        workings: `${packs} x ${perPack} = ${subtotal}, then ${subtotal} - ${give} = ${subtotal - give}`,
      };
    },
  },
  // medium: 4 boxes of 8 stickers, share with 2 friends (subtract)
  {
    skill: 'arith-2step',
    difficulty: 'medium',
    build: () => {
      const name = pick(NAMES);
      const boxes = randInt(3, 6);
      const perBox = randInt(6, 10);
      const give = randInt(5, 15);
      const subtotal = boxes * perBox;
      if (give >= subtotal) {
        // Fall back: smaller give value to keep answer positive.
        return {
          skill: 'arith-2step',
          prompt: `${name} has ${boxes} boxes of ${perBox} stickers. ${pronounSubject(name)} gives 3 away. How many stickers are left?`,
          answer: subtotal - 3,
          workings: `${boxes} x ${perBox} = ${subtotal}, then ${subtotal} - 3 = ${subtotal - 3}`,
        };
      }
      return {
        skill: 'arith-2step',
        prompt: `${name} has ${boxes} boxes of ${perBox} stickers. ${pronounSubject(name)} gives ${give} stickers away. How many stickers are left?`,
        answer: subtotal - give,
        workings: `${boxes} x ${perBox} = ${subtotal}, then ${subtotal} - ${give} = ${subtotal - give}`,
      };
    },
  },
  // hard: bigger numbers, multiply then add
  {
    skill: 'arith-2step',
    difficulty: 'hard',
    build: () => {
      const name = pick(NAMES);
      const crates = randInt(5, 9);
      const perCrate = randInt(8, 15);
      const extra = randInt(10, 30);
      const subtotal = crates * perCrate;
      return {
        skill: 'arith-2step',
        prompt: `${name} packs ${crates} crates with ${perCrate} apples in each. ${pronounSubject(name)} finds ${extra} more apples on the floor. How many apples are there altogether?`,
        answer: subtotal + extra,
        workings: `${crates} x ${perCrate} = ${subtotal}, then ${subtotal} + ${extra} = ${subtotal + extra}`,
      };
    },
  },
];

// Money — one step. Change from a payment.
const MONEY_1STEP: Template[] = [
  // easy: simple change from £5 or £10 with no decimals
  {
    skill: 'money-1step',
    difficulty: 'easy',
    build: () => {
      const name = pick(NAMES);
      const item = pick(MONEY_ITEMS);
      const cost = randInt(2, 4); // whole pounds
      const paid = pick([5, 10]);
      const changePence = (paid - cost) * 100;
      return {
        skill: 'money-1step',
        prompt: `${name} buys a ${item} for ${formatPounds(cost * 100)}. ${pronounSubject(name)} pays with ${formatPounds(paid * 100)}. How much change does ${pronounSubject(name).toLowerCase()} get?`,
        answer: formatPounds(changePence),
      };
    },
  },
  // medium: change with 50p / 25p decimals
  {
    skill: 'money-1step',
    difficulty: 'medium',
    build: () => {
      const name = pick(NAMES);
      const item = pick(MONEY_ITEMS);
      const costPence = randInt(2, 8) * 100 + pick([0, 25, 50, 75]);
      const paid = pick([10, 20]);
      const paidPence = paid * 100;
      if (paidPence <= costPence) {
        return {
          skill: 'money-1step',
          prompt: `${name} buys a ${item} for ${formatPounds(450)}. ${pronounSubject(name)} pays with ${formatPounds(1000)}. How much change?`,
          answer: formatPounds(550),
        };
      }
      return {
        skill: 'money-1step',
        prompt: `${name} buys a ${item} for ${formatPounds(costPence)}. ${pronounSubject(name)} pays with ${formatPounds(paidPence)}. How much change does ${pronounSubject(name).toLowerCase()} get?`,
        answer: formatPounds(paidPence - costPence),
      };
    },
  },
  // hard: change with any pence
  {
    skill: 'money-1step',
    difficulty: 'hard',
    build: () => {
      const name = pick(NAMES);
      const item = pick(MONEY_ITEMS);
      // Build cost as an integer pence value between 125 and 875 (so change
      // from £10 / £20 is non-trivial). Snap to 5p so the answer is a tidy
      // multiple of 5p — sane for a hard primary problem.
      const costPence = randInt(25, 175) * 5;
      const paid = pick([10, 20]);
      const paidPence = paid * 100;
      return {
        skill: 'money-1step',
        prompt: `${name} buys a ${item} for ${formatPounds(costPence)}. ${pronounSubject(name)} pays with ${formatPounds(paidPence)}. How much change does ${pronounSubject(name).toLowerCase()} get?`,
        answer: formatPounds(paidPence - costPence),
      };
    },
  },
];

// Money — two steps (qty × price, then change).
const MONEY_2STEP: Template[] = [
  // easy: 5 apples at 30p, change from £2
  {
    skill: 'money-2step',
    difficulty: 'easy',
    build: () => {
      const name = pick(NAMES);
      const qty = randInt(3, 5);
      const pricePence = pick([20, 25, 30, 40, 50]);
      const totalPence = qty * pricePence;
      const paid = pick([2, 5]);
      const paidPence = paid * 100;
      if (paidPence <= totalPence) {
        // Fall back to a guaranteed-positive change scenario.
        return {
          skill: 'money-2step',
          prompt: `${name} buys 3 apples at 20p each. ${pronounSubject(name)} pays with ${formatPounds(200)}. How much change?`,
          answer: formatPounds(200 - 60),
          workings: `3 x 20p = 60p, then £2.00 - 60p = £1.40`,
        };
      }
      return {
        skill: 'money-2step',
        prompt: `${name} buys ${qty} apples at ${pricePence}p each. ${pronounSubject(name)} pays with ${formatPounds(paidPence)}. How much change?`,
        answer: formatPounds(paidPence - totalPence),
        workings: `${qty} x ${pricePence}p = ${totalPence}p, then ${formatPounds(paidPence)} - ${totalPence}p = ${formatPounds(paidPence - totalPence)}`,
      };
    },
  },
  // medium: 4 items at 75p, change from £5
  {
    skill: 'money-2step',
    difficulty: 'medium',
    build: () => {
      const name = pick(NAMES);
      const qty = randInt(3, 6);
      const pricePence = pick([60, 75, 80, 95]);
      const totalPence = qty * pricePence;
      const paid = pick([5, 10]);
      const paidPence = paid * 100;
      if (paidPence <= totalPence) {
        return {
          skill: 'money-2step',
          prompt: `${name} buys 4 pencils at 60p each. ${pronounSubject(name)} pays with ${formatPounds(500)}. How much change?`,
          answer: formatPounds(500 - 240),
          workings: `4 x 60p = 240p, then £5.00 - £2.40 = £2.60`,
        };
      }
      return {
        skill: 'money-2step',
        prompt: `${name} buys ${qty} pencils at ${pricePence}p each. ${pronounSubject(name)} pays with ${formatPounds(paidPence)}. How much change?`,
        answer: formatPounds(paidPence - totalPence),
        workings: `${qty} x ${pricePence}p = ${totalPence}p, then ${formatPounds(paidPence)} - ${formatPounds(totalPence)} = ${formatPounds(paidPence - totalPence)}`,
      };
    },
  },
  // hard: 6 items at £1.25 each, change from £20
  {
    skill: 'money-2step',
    difficulty: 'hard',
    build: () => {
      const name = pick(NAMES);
      const qty = randInt(4, 8);
      const pricePence = pick([110, 125, 150, 175, 220, 250]);
      const totalPence = qty * pricePence;
      const paidPence = totalPence < 1000 ? 1000 : totalPence < 2000 ? 2000 : 5000;
      return {
        skill: 'money-2step',
        prompt: `${name} buys ${qty} notebooks at ${formatPounds(pricePence)} each. ${pronounSubject(name)} pays with ${formatPounds(paidPence)}. How much change does ${pronounSubject(name).toLowerCase()} get?`,
        answer: formatPounds(paidPence - totalPence),
        workings: `${qty} x ${formatPounds(pricePence)} = ${formatPounds(totalPence)}, then ${formatPounds(paidPence)} - ${formatPounds(totalPence)} = ${formatPounds(paidPence - totalPence)}`,
      };
    },
  },
];

// Time — one step. "Film starts at 3:30, lasts 90 min. Ends at?"
const TIME_1STEP: Template[] = [
  // easy: add minutes that don't cross the hour
  {
    skill: 'time-1step',
    difficulty: 'easy',
    build: () => {
      const startH = randInt(1, 10);
      const startM = pick([0, 15, 30]);
      // Choose deltaMin so we don't cross the hour.
      const slack = 59 - startM;
      const deltaMin = slack >= 30 ? pick([10, 15, 20, 30]) : 10;
      const total = startH * 60 + startM + deltaMin;
      const endH = Math.floor(total / 60);
      const endM = total % 60;
      return {
        skill: 'time-1step',
        prompt: `A film starts at ${formatTime(startH, startM)} and lasts ${deltaMin} minutes. What time does it end?`,
        answer: formatTime(endH, endM),
      };
    },
  },
  // medium: add 60-120 minutes
  {
    skill: 'time-1step',
    difficulty: 'medium',
    build: () => {
      const startH = randInt(1, 8);
      const startM = pick([0, 15, 30, 45]);
      const deltaMin = pick([45, 60, 75, 90, 105]);
      const total = startH * 60 + startM + deltaMin;
      const endH = Math.floor(total / 60);
      const endM = total % 60;
      return {
        skill: 'time-1step',
        prompt: `A film starts at ${formatTime(startH, startM)} and lasts ${deltaMin} minutes. What time does it end?`,
        answer: formatTime(endH, endM),
      };
    },
  },
  // hard: large durations, awkward minutes
  {
    skill: 'time-1step',
    difficulty: 'hard',
    build: () => {
      const startH = randInt(8, 11);
      const startM = pick([10, 25, 40, 50]);
      const deltaMin = pick([55, 70, 95, 130, 145, 170]);
      const total = startH * 60 + startM + deltaMin;
      const endH = Math.floor(total / 60);
      const endM = total % 60;
      return {
        skill: 'time-1step',
        prompt: `A coach journey starts at ${formatTime(startH, startM)} and takes ${deltaMin} minutes. What time does it arrive?`,
        answer: formatTime(endH, endM),
      };
    },
  },
];

// Measurement — one step.
const MEASURE_1STEP: Template[] = [
  // easy: cm comparison
  {
    skill: 'measure-1step',
    difficulty: 'easy',
    build: () => {
      const shortLen = randInt(8, 15);
      const longLen = shortLen + randInt(8, 20);
      return {
        skill: 'measure-1step',
        prompt: `A pencil is ${shortLen} cm long. A ruler is ${longLen} cm long. How much longer is the ruler than the pencil?`,
        answer: longLen - shortLen,
        unit: 'cm',
      };
    },
  },
  // medium: kg / g totals
  {
    skill: 'measure-1step',
    difficulty: 'medium',
    build: () => {
      const a = randInt(150, 450);
      const b = randInt(150, 450);
      return {
        skill: 'measure-1step',
        prompt: `One bag of flour weighs ${a} g. Another weighs ${b} g. What is the total weight?`,
        answer: a + b,
        unit: 'g',
      };
    },
  },
  // medium: ribbon subtraction in cm
  {
    skill: 'measure-1step',
    difficulty: 'medium',
    build: () => {
      const item = pick(MEASURE_ITEMS);
      const total = randInt(80, 200);
      const used = randInt(20, total - 10);
      return {
        skill: 'measure-1step',
        prompt: `A piece of ${item} is ${total} cm long. ${randInt(0, 1) === 0 ? 'A piece of' : ''} ${used} cm is cut off. How much ${item} is left?`.replace(/\s+/g, ' ').trim(),
        answer: total - used,
        unit: 'cm',
      };
    },
  },
  // hard: bigger numbers
  {
    skill: 'measure-1step',
    difficulty: 'hard',
    build: () => {
      const item = pick(MEASURE_ITEMS);
      const total = randInt(500, 950);
      const used = randInt(100, total - 50);
      return {
        skill: 'measure-1step',
        prompt: `A roll of ${item} is ${total} cm long. ${used} cm is used. How much ${item} is left?`,
        answer: total - used,
        unit: 'cm',
      };
    },
  },
];

// Measurement — two steps. Unit conversion + arithmetic.
const MEASURE_2STEP: Template[] = [
  // easy: 1 m rope, cut 30 cm off, in cm
  {
    skill: 'measure-2step',
    difficulty: 'easy',
    build: () => {
      const item = pick(MEASURE_ITEMS);
      const totalM = randInt(1, 3); // 1-3 m
      const cutCm = randInt(20, 60);
      const totalCm = totalM * 100;
      return {
        skill: 'measure-2step',
        prompt: `A piece of ${item} is ${totalM} m long. ${cutCm} cm is cut off. How much ${item} is left? Give your answer in cm.`,
        answer: totalCm - cutCm,
        unit: 'cm',
        workings: `${totalM} m = ${totalCm} cm, then ${totalCm} - ${cutCm} = ${totalCm - cutCm} cm`,
      };
    },
  },
  // medium: 5 m rope, cut 175 cm off, in cm
  {
    skill: 'measure-2step',
    difficulty: 'medium',
    build: () => {
      const item = pick(MEASURE_ITEMS);
      const totalM = randInt(3, 6);
      const cutCm = randInt(60, totalM * 100 - 25);
      const totalCm = totalM * 100;
      return {
        skill: 'measure-2step',
        prompt: `A piece of ${item} is ${totalM} m long. ${cutCm} cm is cut off. How much ${item} is left? Give your answer in cm.`,
        answer: totalCm - cutCm,
        unit: 'cm',
        workings: `${totalM} m = ${totalCm} cm, then ${totalCm} - ${cutCm} = ${totalCm - cutCm} cm`,
      };
    },
  },
  // hard: 2 kg, take 350 g, in g
  {
    skill: 'measure-2step',
    difficulty: 'hard',
    build: () => {
      const totalKg = randInt(2, 5);
      const takeG = randInt(150, totalKg * 1000 - 200);
      const totalG = totalKg * 1000;
      return {
        skill: 'measure-2step',
        prompt: `A sack of rice weighs ${totalKg} kg. ${takeG} g is taken out. How much rice is left? Give your answer in g.`,
        answer: totalG - takeG,
        unit: 'g',
        workings: `${totalKg} kg = ${totalG} g, then ${totalG} - ${takeG} = ${totalG - takeG} g`,
      };
    },
  },
];

// Fractions — one step.
const FRACTIONS_1STEP: Template[] = [
  // easy: pizza cut into N, ate M, fraction left
  {
    skill: 'fractions-1step',
    difficulty: 'easy',
    build: () => {
      const name = pick(NAMES);
      const item = pick(FRACTION_ITEMS);
      const piece = FRACTION_PIECE[item] ?? 'pieces';
      const den = pick([4, 6, 8]);
      const eaten = randInt(1, den - 1);
      const left = den - eaten;
      return {
        skill: 'fractions-1step',
        prompt: `A ${item} is cut into ${den} equal ${piece}. ${name} eats ${eaten} ${piece}. What fraction of the ${item} is left?`,
        answer: `${left}/${den}`,
      };
    },
  },
  // medium: two people share, fraction left
  {
    skill: 'fractions-1step',
    difficulty: 'medium',
    build: () => {
      const a = pick(NAMES);
      let b = pick(NAMES);
      while (b === a) b = pick(NAMES);
      const item = pick(FRACTION_ITEMS);
      const piece = FRACTION_PIECE[item] ?? 'pieces';
      const den = pick([8, 10, 12]);
      const eatenA = randInt(1, Math.floor(den / 2));
      const eatenB = randInt(1, Math.floor(den / 2));
      const left = den - eatenA - eatenB;
      if (left <= 0) {
        // Fall back to a guaranteed-positive scenario.
        return {
          skill: 'fractions-1step',
          prompt: `A ${item} is cut into 8 equal ${piece}. ${a} eats 2 ${piece} and ${b} eats 3 ${piece}. What fraction of the ${item} is left?`,
          answer: `3/8`,
        };
      }
      return {
        skill: 'fractions-1step',
        prompt: `A ${item} is cut into ${den} equal ${piece}. ${a} eats ${eatenA} ${piece} and ${b} eats ${eatenB} ${piece}. What fraction of the ${item} is left?`,
        answer: `${left}/${den}`,
      };
    },
  },
  // hard: fraction of a whole as a quantity
  {
    skill: 'fractions-1step',
    difficulty: 'hard',
    build: () => {
      const name = pick(NAMES);
      const den = pick([3, 4, 5, 6]);
      const total = den * randInt(4, 8); // ensures integer answer
      const num = randInt(1, den - 1);
      const result = (total / den) * num;
      return {
        skill: 'fractions-1step',
        prompt: `${name} has ${total} stickers. ${pronounSubject(name)} gives ${num}/${den} of them to a friend. How many stickers does ${pronounSubject(name).toLowerCase()} give away?`,
        answer: result,
      };
    },
  },
];

// Gender-balanced he/she pronoun, mapped from name. Kept deterministic so
// the same name always produces a consistent pronoun in the same prompt.
function pronounSubject(name: string): string {
  const she = new Set(['Lily', 'Maya', 'Aisha', 'Zara', 'Mia', 'Priya']);
  return she.has(name) ? 'She' : 'He';
}

// HH:MM helper (12-hour clock without AM/PM — kid-friendly).
function formatTime(h: number, m: number): string {
  const hh = ((h - 1) % 12) + 1; // 0 -> 12, 13 -> 1, etc. (defensive)
  return `${hh}:${m.toString().padStart(2, '0')}`;
}

// All templates flat-mapped, indexed by skill.
const TEMPLATES_BY_SKILL: Record<WordProblemSkill, Template[]> = {
  'arith-1step': ARITH_1STEP,
  'arith-2step': ARITH_2STEP,
  'money-1step': MONEY_1STEP,
  'money-2step': MONEY_2STEP,
  'time-1step': TIME_1STEP,
  'measure-1step': MEASURE_1STEP,
  'measure-2step': MEASURE_2STEP,
  'fractions-1step': FRACTIONS_1STEP,
};

// Picks the templates from a skill that match the requested difficulty,
// falling back to any template for that skill if none match exactly.
function pickTemplate(skill: WordProblemSkill, difficulty: WordDifficulty): Template {
  const pool = TEMPLATES_BY_SKILL[skill];
  const matches = pool.filter(t => t.difficulty === difficulty);
  if (matches.length > 0) return pick(matches);
  return pick(pool);
}

/**
 * Sanity-check a generated question: make sure the numeric answer is sane
 * (non-negative integer for non-money/non-fraction answers, at most one
 * decimal for hard money answers). Returns true when the question is OK.
 */
export function isSaneQuestion(q: WordQuestion, difficulty: WordDifficulty): boolean {
  if (typeof q.answer === 'number') {
    if (q.answer < 0) return false;
    // For easy/medium the answer must be an integer.
    if (difficulty !== 'hard' && !Number.isInteger(q.answer)) return false;
    return true;
  }
  if (typeof q.answer === 'string') {
    if (q.answer.startsWith('£')) {
      // Money: parse pence; must be non-negative.
      const pence = parseMoneyToPence(q.answer);
      if (pence === null || pence < 0) return false;
      return true;
    }
    if (q.answer.includes('/')) {
      const f = parseFraction(q.answer);
      if (!f) return false;
      return f.den > 0 && f.num >= 0 && f.num <= f.den;
    }
    // HH:MM time string or fallback.
    return q.answer.length > 0;
  }
  return false;
}

export function generateWordQuestions(
  settings: WordSettings,
  count: number
): WordQuestion[] {
  const skills = settings.skills.length > 0 ? settings.skills : WORD_SKILL_OPTIONS.slice();
  // Round-robin per skill (last skill takes the remainder).
  const k = skills.length;
  const perSkill = Math.floor(count / k);
  const remainder = count - perSkill * k;

  const out: WordQuestion[] = [];
  skills.forEach((skill, idx) => {
    const target = perSkill + (idx < remainder ? 1 : 0);
    for (let n = 0; n < target; n++) {
      let q: WordQuestion | null = null;
      for (let attempt = 0; attempt < 20 && q === null; attempt++) {
        const t = pickTemplate(skill, settings.difficulty);
        const candidate = t.build();
        if (isSaneQuestion(candidate, settings.difficulty)) q = candidate;
      }
      // Defensive fallback — accept whatever the last attempt produced.
      if (!q) q = pickTemplate(skill, settings.difficulty).build();
      out.push(q);
    }
  });

  // Shuffle so skills aren't grouped.
  out.sort(() => Math.random() - 0.5);
  return out;
}

/** Format the canonical answer for display (used in feedback + answer key). */
export function expectedAnswerString(q: WordQuestion): string {
  if (typeof q.answer === 'string') return q.answer;
  return q.unit ? `${q.answer} ${q.unit}` : `${q.answer}`;
}
