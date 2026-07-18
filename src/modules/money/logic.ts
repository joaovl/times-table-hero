// Money module — UK National Curriculum Years 3-5 money problems.
//
// Everything is stored in *pence* (integer) internally. Display is delegated
// to `formatMoney` so we never accumulate floating-point drift on £/p sums.
// Each question is a discriminated union by `skill` so the renderer (online
// play, PDF) can switch on shape without re-parsing.

import { CURRENCIES, type CurrencyConfig } from '@/lib/i18n/currency';

export type MoneySkill =
  | 'add-money'
  | 'subtract-money'
  | 'change'
  | 'multi-item'
  | 'compare-prices'
  | 'multiply-money';

export type Difficulty = 'easy' | 'medium' | 'hard';

// Curriculum mapping. Exported so the setup screen / docs can show year tags
// next to each skill chip and so we have a single source of truth that
// matches the UK NC programme of study for KS2 money.
export interface CurriculumTag {
  years: ReadonlyArray<3 | 4 | 5>;
  objective: string;
}

export const CURRICULUM_TAGS: Record<MoneySkill, CurriculumTag> = {
  'add-money': {
    years: [3, 4, 5],
    objective: 'Add amounts of money (Y3); use four operations to solve problems involving money (Y4-5).',
  },
  'subtract-money': {
    years: [3, 4, 5],
    objective: 'Subtract amounts of money (Y3); use four operations to solve problems involving money (Y4-5).',
  },
  change: {
    years: [3, 4, 5],
    objective: 'Calculate change from a given amount (Y3); apply to multi-step contexts (Y4-5).',
  },
  'multi-item': {
    years: [3, 4, 5],
    objective: 'Add money of different denominations to find a total cost.',
  },
  'compare-prices': {
    years: [3, 4, 5],
    objective: 'Compare amounts of money in £ and p, identifying which is greater/lesser.',
  },
  'multiply-money': {
    years: [4, 5],
    objective: 'Multiply amounts of money in pounds and pence (Y4-5).',
  },
};

export const MONEY_SKILL_OPTIONS: ReadonlyArray<MoneySkill> = [
  'add-money',
  'subtract-money',
  'change',
  'multi-item',
  'compare-prices',
  'multiply-money',
];

export const MONEY_SKILL_LABEL: Record<MoneySkill, string> = {
  'add-money': 'Add money',
  'subtract-money': 'Subtract money',
  change: 'Give change',
  'multi-item': 'Total items',
  'compare-prices': 'Compare prices',
  'multiply-money': 'Multiply money',
};

export const MONEY_SKILL_SHORT_LABEL: Record<MoneySkill, string> = {
  'add-money': '+',
  'subtract-money': '-',
  change: 'Change',
  'multi-item': 'Total',
  'compare-prices': 'Compare',
  'multiply-money': '×',
};

// Common item names for multi-item / multiply-money questions.
// Kept wholesome and unbranded.
export const ITEM_NAMES: ReadonlyArray<string> = [
  'apple',
  'banana',
  'bread',
  'milk',
  'cheese',
  'biscuits',
  'eggs',
  'orange',
  'pear',
  'yoghurt',
  'pen',
  'pencil',
  'rubber',
  'ruler',
  'notebook',
  'book',
  'crayon',
  'sticker',
  'card',
  'sharpener',
];

// ---------------------------------------------------------------------------
// Question shapes (discriminated union by `skill`).
// ---------------------------------------------------------------------------

export interface AddMoneyQuestion {
  skill: 'add-money';
  aPence: number;
  bPence: number;
  answerPence: number;
}

export interface SubtractMoneyQuestion {
  skill: 'subtract-money';
  aPence: number;
  bPence: number;
  answerPence: number;
}

export interface MultiplyMoneyQuestion {
  skill: 'multiply-money';
  /** Unit price in pence. */
  aPence: number;
  /** Quantity. */
  bPence: number; // named bPence to keep the binary-question shape symmetric
  answerPence: number;
  itemName: string;
}

export interface ChangeQuestion {
  skill: 'change';
  pricePence: number;
  paidPence: number;
  answerPence: number;
  itemName: string;
}

export interface MultiItemQuestion {
  skill: 'multi-item';
  items: Array<{ name: string; pricePence: number }>;
  answerPence: number;
}

export interface ComparePricesQuestion {
  skill: 'compare-prices';
  aPence: number;
  bPence: number;
  answer: 'A' | 'B' | 'equal';
  itemAName: string;
  itemBName: string;
}

export type MoneyQuestion =
  | AddMoneyQuestion
  | SubtractMoneyQuestion
  | MultiplyMoneyQuestion
  | ChangeQuestion
  | MultiItemQuestion
  | ComparePricesQuestion;

export interface MoneySettings {
  /** Active skills. Non-empty. */
  skills: MoneySkill[];
  difficulty: Difficulty;
  gameMode: 'questions' | 'time';
  questionCount: number;
  timeLimit: number;
}

// ---------------------------------------------------------------------------
// Formatting & parsing.
// ---------------------------------------------------------------------------

/**
 * Format a minor-unit value (pence by default) for display.
 * - `< 100` minor units → "75p" (uses `cfg.minorSuffix`)
 * - `>= 100` minor units → "£3.45" (symbol placement/decimal separator per `cfg`)
 * - 0 → "0p"
 *
 * Defaults to GBP (`CURRENCIES.GBP`) so existing call sites are unaffected.
 * Uses U+00A3 (£) which is in Helvetica's WinAnsi encoding (safe for PDFs).
 */
export function formatMoney(pence: number, cfg: CurrencyConfig = CURRENCIES.GBP): string {
  const v = Math.round(pence);
  if (v < 100) return `${v}${cfg.minorSuffix}`;
  const major = Math.floor(v / 100);
  const minor = (v % 100).toString().padStart(2, '0');
  const sep = cfg.decimalComma ? ',' : '.';
  const amount = `${major}${sep}${minor}`;
  return cfg.symbolBefore ? `${cfg.symbol}${amount}` : `${amount} ${cfg.symbol}`;
}

// Escape regex metacharacters in a currency symbol/suffix so it can be
// embedded literally in a RegExp (e.g. '$' in USD's '$' or BRL's minor units).
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parse a user-typed money string into minor units (pence by default).
 * Accepts (for GBP, the default): "3.45", "£3.45", "345p", "345", " £3.45 ".
 * For other currencies (via `cfg`), also accepts the currency's own symbol
 * (in either position) and comma-decimal input (e.g. "3,45", "R$3,45").
 * Returns the minor-unit integer, or `null` if the string is unparseable.
 * - A bare integer (no symbol, no decimal) is treated as **minor units**, so
 *   kids who type "345" mean "three hundred and forty-five pence" (= £3.45).
 *   They'd type "£3.45" or "3.45" for the major-unit form.
 */
export function parseMoney(input: string, cfg: CurrencyConfig = CURRENCIES.GBP): number | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Strip a leading/trailing currency symbol (whichever side it appears on,
  // regardless of `cfg.symbolBefore`) and any whitespace around it.
  const symbolPattern = escapeRegExp(cfg.symbol);
  let s = trimmed
    .replace(new RegExp(`^${symbolPattern}\\s*`), '')
    .replace(new RegExp(`\\s*${symbolPattern}$`), '')
    .trim();
  if (s === '') return null;

  // Comma-decimal input (e.g. "3,45"): normalize to a dot when unambiguous —
  // exactly one comma and no dot present. Safe for GBP too (never triggers).
  const commaCount = (s.match(/,/g) || []).length;
  if (commaCount === 1 && !s.includes('.')) {
    s = s.replace(',', '.');
  }

  // Trailing minor-unit suffix (e.g. 'p', '¢', 'c') marks minor-units-only.
  const suffixPattern = escapeRegExp(cfg.minorSuffix);
  const suffixMatch = s.match(new RegExp(`^([0-9]+)${suffixPattern}$`, 'i'));
  if (suffixMatch) {
    const n = parseInt(suffixMatch[1], 10);
    return Number.isFinite(n) ? n : null;
  }

  // Decimal form "3.45" or "3.4" → minor units. Allow 1 or 2 decimal places.
  if (/^[0-9]+\.[0-9]{1,2}$/.test(s)) {
    const [majorStr, minorStr] = s.split('.');
    const major = parseInt(majorStr, 10);
    // Pad single digit (e.g. "3.4" → 40p, not 4p) so "3.4" means 3.40.
    const padded = minorStr.length === 1 ? minorStr + '0' : minorStr;
    const minor = parseInt(padded, 10);
    if (!Number.isFinite(major) || !Number.isFinite(minor)) return null;
    return major * 100 + minor;
  }

  // Bare integer with no symbol — treat as minor units.
  if (/^[0-9]+$/.test(s)) {
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : null;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Answer-checking.
// ---------------------------------------------------------------------------

/**
 * Check a numeric (typed) answer against a money question that expects a
 * pence amount. For compare-prices use `checkCompareAnswer` instead.
 */
export function checkMoneyAnswer(q: MoneyQuestion, userPence: number | null): boolean {
  if (q.skill === 'compare-prices') return false;
  if (userPence === null) return false;
  return userPence === q.answerPence;
}

export function checkCompareAnswer(
  q: ComparePricesQuestion,
  pick: 'A' | 'B' | 'equal'
): boolean {
  return pick === q.answer;
}

// ---------------------------------------------------------------------------
// Generation helpers.
// ---------------------------------------------------------------------------

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pickFrom<T>(arr: ReadonlyArray<T>): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickName(): string {
  return pickFrom(ITEM_NAMES);
}

/**
 * Sample a "side" pence amount sized by difficulty.
 *   easy   → pence-only OR whole-pounds-only (no mixed). 5p-95p step 5, or
 *            £1-£9 whole pounds.
 *   medium → mixed £ + p, with no carry across decimals when summed with
 *            another medium sample (i.e. each pence part is < 50).
 *   hard   → mixed £ + p, free range. Carries across the decimal are
 *            expected for add/subtract.
 *
 * For medium we constrain the pence part to multiples of 5 in [0, 45] so a
 * pair will never sum to >= 100 pence (i.e. no decimal carry).
 */
function sampleOperandPence(difficulty: Difficulty): number {
  if (difficulty === 'easy') {
    // 50/50: pence-only (5p..95p, step 5) or whole pounds (£1..£9).
    if (Math.random() < 0.5) {
      return randInt(1, 19) * 5; // 5..95
    }
    return randInt(1, 9) * 100;
  }

  if (difficulty === 'medium') {
    const pounds = randInt(1, 9);
    const pence = randInt(0, 9) * 5; // 0, 5, ..., 45  → no decimal carry
    return pounds * 100 + pence;
  }

  // hard: free mix £1..£9, 5p..95p (step 1 for variety). Pence can be high
  // enough that two samples will frequently carry across the decimal.
  const pounds = randInt(1, 9);
  const pence = randInt(5, 95);
  return pounds * 100 + pence;
}

// ---------------------------------------------------------------------------
// Per-skill builders.
// ---------------------------------------------------------------------------

function buildAdd(difficulty: Difficulty): AddMoneyQuestion {
  const a = sampleOperandPence(difficulty);
  const b = sampleOperandPence(difficulty);
  return { skill: 'add-money', aPence: a, bPence: b, answerPence: a + b };
}

function buildSubtract(difficulty: Difficulty): SubtractMoneyQuestion {
  let a = sampleOperandPence(difficulty);
  let b = sampleOperandPence(difficulty);
  if (a < b) [a, b] = [b, a];
  // Avoid the degenerate "a = b" case which yields a zero answer — boring and
  // confusing for kids ("£3.45 - £3.45 = ?").
  if (a === b) a += difficulty === 'easy' ? 5 : 10;
  return { skill: 'subtract-money', aPence: a, bPence: b, answerPence: a - b };
}

function buildChange(difficulty: Difficulty): ChangeQuestion {
  const price = sampleOperandPence(difficulty);
  // Paid amount is always >= price, and is typically a "round" note: £5/£10/£20.
  // Hard occasionally allows £2 / £50 to expand the range.
  const noteOptions =
    difficulty === 'easy'
      ? [500, 1000]
      : difficulty === 'medium'
        ? [500, 1000, 2000]
        : [200, 500, 1000, 2000, 5000];
  let paid = pickFrom(noteOptions);
  // Ensure paid > price so the kid actually gets change. If not, bump to the
  // next note up. If all notes are too small (very rare for these ranges),
  // fall back to a paid that's £1 more than the rounded-up price.
  let attempts = 0;
  while (paid <= price && attempts < 5) {
    paid = pickFrom(noteOptions);
    attempts++;
  }
  if (paid <= price) paid = Math.ceil((price + 1) / 100) * 100 + 100;

  return {
    skill: 'change',
    pricePence: price,
    paidPence: paid,
    answerPence: paid - price,
    itemName: pickName(),
  };
}

function buildMultiItem(difficulty: Difficulty): MultiItemQuestion {
  // Use 3 items for easy/medium, 3-4 items for hard. Three is the canonical
  // KS2 shape ("apple 50p, bread £1.20, milk 80p — total?").
  const n = difficulty === 'hard' ? randInt(3, 4) : 3;
  const usedNames = new Set<string>();
  const items: Array<{ name: string; pricePence: number }> = [];
  let total = 0;
  for (let i = 0; i < n; i++) {
    let name = pickName();
    let guard = 0;
    while (usedNames.has(name) && guard < 10) {
      name = pickName();
      guard++;
    }
    usedNames.add(name);
    const price = sampleOperandPence(difficulty);
    items.push({ name, pricePence: price });
    total += price;
  }
  return { skill: 'multi-item', items, answerPence: total };
}

function buildCompare(difficulty: Difficulty): ComparePricesQuestion {
  const a = sampleOperandPence(difficulty);
  // For comparison interest, generate `b` close to `a` so kids actually have
  // to look at the values (rather than spotting a 10x difference). With
  // ~25% chance produce equal prices.
  let b: number;
  const r = Math.random();
  if (r < 0.25) {
    b = a;
  } else if (r < 0.625) {
    // Within ~30p of a, but not equal.
    const delta = randInt(5, 30) * (Math.random() < 0.5 ? -1 : 1);
    b = Math.max(1, a + delta);
    if (b === a) b = a + 5;
  } else {
    b = sampleOperandPence(difficulty);
    if (b === a) b += 5;
  }
  const answer: 'A' | 'B' | 'equal' = a < b ? 'A' : a > b ? 'B' : 'equal';
  let nameA = pickName();
  let nameB = pickName();
  let guard = 0;
  while (nameB === nameA && guard < 10) {
    nameB = pickName();
    guard++;
  }
  return {
    skill: 'compare-prices',
    aPence: a,
    bPence: b,
    answer,
    itemAName: nameA,
    itemBName: nameB,
  };
}

function buildMultiply(difficulty: Difficulty): MultiplyMoneyQuestion {
  // Unit price scales with difficulty; quantity stays kid-friendly (2-10).
  const qty = randInt(2, difficulty === 'easy' ? 5 : 10);
  // Unit prices favour "neat" pence so multiplication doesn't always trigger
  // a carry — that's what `difficulty` controls.
  let unit: number;
  if (difficulty === 'easy') {
    unit = randInt(1, 9) * 10; // 10p..90p
  } else if (difficulty === 'medium') {
    // £1..£3 with pence ∈ {0, 10, 20, 30, 40, 50}: products stay tidy.
    unit = randInt(1, 3) * 100 + randInt(0, 5) * 10;
  } else {
    // Hard: unit price can include odd pence; product may need carries.
    unit = randInt(1, 5) * 100 + randInt(0, 19) * 5;
  }
  return {
    skill: 'multiply-money',
    aPence: unit,
    bPence: qty,
    answerPence: unit * qty,
    itemName: pickName(),
  };
}

// ---------------------------------------------------------------------------
// Top-level generator.
// ---------------------------------------------------------------------------

function buildOne(skill: MoneySkill, difficulty: Difficulty): MoneyQuestion {
  switch (skill) {
    case 'add-money':
      return buildAdd(difficulty);
    case 'subtract-money':
      return buildSubtract(difficulty);
    case 'change':
      return buildChange(difficulty);
    case 'multi-item':
      return buildMultiItem(difficulty);
    case 'compare-prices':
      return buildCompare(difficulty);
    case 'multiply-money':
      return buildMultiply(difficulty);
  }
}

export function generateMoneyQuestions(
  settings: MoneySettings,
  count: number
): MoneyQuestion[] {
  const skills = settings.skills.length > 0 ? settings.skills : (['add-money'] as MoneySkill[]);
  const k = skills.length;
  const perSkill = Math.floor(count / k);
  const remainder = count - perSkill * k;

  const out: MoneyQuestion[] = [];
  skills.forEach((skill, idx) => {
    const target = perSkill + (idx < remainder ? 1 : 0);
    for (let n = 0; n < target; n++) {
      out.push(buildOne(skill, settings.difficulty));
    }
  });
  // Interleave skills so the worksheet isn't grouped.
  out.sort(() => Math.random() - 0.5);
  return out;
}

// Pretty example for a setup-screen "live preview" of what the current
// skill/difficulty mix will produce. Returns a single sample question
// rendered as a one-line string. Deterministic-ish: respects the settings'
// skills + difficulty but the actual sample is random per call.
export function moneyExample(skills: MoneySkill[], difficulty: Difficulty): string {
  if (skills.length === 0) return '';
  const skill = skills[0];
  const q = buildOne(skill, difficulty);
  return renderQuestionPlain(q);
}

// Plain one-line rendering, used by setup-screen previews and the results
// "questions to practise" list. Keeps to ASCII-safe glyphs everywhere except
// £, which is WinAnsi-safe and renders fine in jsPDF Helvetica.
export function renderQuestionPlain(q: MoneyQuestion): string {
  switch (q.skill) {
    case 'add-money':
      return `${formatMoney(q.aPence)} + ${formatMoney(q.bPence)} = ?`;
    case 'subtract-money':
      return `${formatMoney(q.aPence)} - ${formatMoney(q.bPence)} = ?`;
    case 'change':
      return `Buy ${q.itemName} ${formatMoney(q.pricePence)}, pay ${formatMoney(q.paidPence)}. Change?`;
    case 'multi-item': {
      const list = q.items.map(it => `${it.name} ${formatMoney(it.pricePence)}`).join(', ');
      return `${list}. Total?`;
    }
    case 'compare-prices':
      return `Cheaper: A ${q.itemAName} ${formatMoney(q.aPence)} or B ${q.itemBName} ${formatMoney(q.bPence)}?`;
    case 'multiply-money':
      return `${q.bPence} ${q.itemName}${q.bPence === 1 ? '' : 's'} at ${formatMoney(q.aPence)} each. Total?`;
  }
}
