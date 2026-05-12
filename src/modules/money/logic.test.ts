import { describe, it, expect } from 'vitest';
import {
  CURRICULUM_TAGS,
  MONEY_SKILL_OPTIONS,
  checkCompareAnswer,
  checkMoneyAnswer,
  formatMoney,
  generateMoneyQuestions,
  parseMoney,
  renderQuestionPlain,
} from './logic';
import type {
  ComparePricesQuestion,
  MoneyQuestion,
  MoneySettings,
  MoneySkill,
} from './logic';

const baseSettings = (over: Partial<MoneySettings> = {}): MoneySettings => ({
  skills: ['add-money'],
  difficulty: 'easy',
  gameMode: 'questions',
  questionCount: 10,
  timeLimit: 60,
  ...over,
});

describe('formatMoney', () => {
  it('renders sub-£1 amounts in pence with a "p" suffix', () => {
    expect(formatMoney(0)).toBe('0p');
    expect(formatMoney(5)).toBe('5p');
    expect(formatMoney(75)).toBe('75p');
    expect(formatMoney(99)).toBe('99p');
  });

  it('renders £1+ amounts as £X.YY with two-digit pence', () => {
    expect(formatMoney(100)).toBe('£1.00');
    expect(formatMoney(105)).toBe('£1.05');
    expect(formatMoney(345)).toBe('£3.45');
    expect(formatMoney(565)).toBe('£5.65');
    expect(formatMoney(1000)).toBe('£10.00');
  });

  it('always uses the WinAnsi pound symbol (U+00A3), never the math-minus', () => {
    expect(formatMoney(345).charCodeAt(0)).toBe(0xa3);
  });

  it('rounds non-integer pence (defensive — caller should never pass these)', () => {
    expect(formatMoney(345.4)).toBe('£3.45');
    expect(formatMoney(99.6)).toBe('£1.00');
  });
});

describe('parseMoney', () => {
  it('parses decimal pounds form', () => {
    expect(parseMoney('3.45')).toBe(345);
    expect(parseMoney('0.05')).toBe(5);
    expect(parseMoney('10.00')).toBe(1000);
  });

  it('parses leading £ symbol', () => {
    expect(parseMoney('£3.45')).toBe(345);
    expect(parseMoney('£10.00')).toBe(1000);
    expect(parseMoney(' £3.45 ')).toBe(345);
  });

  it('parses trailing "p" as pence-only', () => {
    expect(parseMoney('345p')).toBe(345);
    expect(parseMoney('75p')).toBe(75);
    expect(parseMoney('5P')).toBe(5);
  });

  it('treats a bare integer as pence', () => {
    expect(parseMoney('345')).toBe(345);
    expect(parseMoney('75')).toBe(75);
  });

  it('pads single decimal digit (3.4 means £3.40, not £3.04)', () => {
    expect(parseMoney('3.4')).toBe(340);
    expect(parseMoney('£3.4')).toBe(340);
  });

  it('rejects garbage', () => {
    expect(parseMoney('')).toBeNull();
    expect(parseMoney('  ')).toBeNull();
    expect(parseMoney('abc')).toBeNull();
    expect(parseMoney('3..45')).toBeNull();
    expect(parseMoney('3.456')).toBeNull(); // > 2 decimal places
    expect(parseMoney('£')).toBeNull();
  });
});

describe('CURRICULUM_TAGS', () => {
  it('covers every skill', () => {
    for (const s of MONEY_SKILL_OPTIONS) {
      expect(CURRICULUM_TAGS[s]).toBeDefined();
      expect(CURRICULUM_TAGS[s].years.length).toBeGreaterThan(0);
      expect(CURRICULUM_TAGS[s].objective.length).toBeGreaterThan(0);
    }
  });

  it('multiply-money is Y4-Y5 only (not Y3)', () => {
    expect(CURRICULUM_TAGS['multiply-money'].years).toEqual([4, 5]);
  });

  it('add/subtract/change/multi-item/compare are Y3-Y5', () => {
    for (const s of ['add-money', 'subtract-money', 'change', 'multi-item', 'compare-prices'] as MoneySkill[]) {
      expect(CURRICULUM_TAGS[s].years).toEqual([3, 4, 5]);
    }
  });
});

describe('generateMoneyQuestions — counts', () => {
  it('returns the requested number of questions', () => {
    const qs = generateMoneyQuestions(baseSettings({ skills: ['add-money'] }), 25);
    expect(qs).toHaveLength(25);
  });

  it('handles every skill in isolation', () => {
    for (const skill of MONEY_SKILL_OPTIONS) {
      const qs = generateMoneyQuestions(baseSettings({ skills: [skill] }), 12);
      expect(qs).toHaveLength(12);
      qs.forEach(q => expect(q.skill).toBe(skill));
    }
  });

  it('mixes multiple skills when more than one is selected', () => {
    const skills: MoneySkill[] = ['add-money', 'subtract-money', 'change'];
    const qs = generateMoneyQuestions(baseSettings({ skills }), 30);
    expect(qs).toHaveLength(30);
    const observed = new Set(qs.map(q => q.skill));
    skills.forEach(s => expect(observed.has(s)).toBe(true));
  });

  it('balances skills evenly when count is divisible by skill-count', () => {
    const skills: MoneySkill[] = ['add-money', 'subtract-money'];
    const qs = generateMoneyQuestions(baseSettings({ skills }), 20);
    expect(qs.filter(q => q.skill === 'add-money')).toHaveLength(10);
    expect(qs.filter(q => q.skill === 'subtract-money')).toHaveLength(10);
  });

  it('distributes the remainder to earlier skills when count is not divisible', () => {
    const skills: MoneySkill[] = ['add-money', 'subtract-money', 'change'];
    const qs = generateMoneyQuestions(baseSettings({ skills }), 10);
    // 10 / 3 = 3 each, remainder 1 → 4, 3, 3
    expect(qs.filter(q => q.skill === 'add-money')).toHaveLength(4);
    expect(qs.filter(q => q.skill === 'subtract-money')).toHaveLength(3);
    expect(qs.filter(q => q.skill === 'change')).toHaveLength(3);
  });
});

describe('generateMoneyQuestions — invariants per skill', () => {
  it('add-money: answerPence = aPence + bPence', () => {
    const qs = generateMoneyQuestions(baseSettings({ skills: ['add-money'] }), 40);
    qs.forEach(q => {
      if (q.skill !== 'add-money') throw new Error('wrong skill');
      expect(q.aPence + q.bPence).toBe(q.answerPence);
      expect(q.aPence).toBeGreaterThan(0);
      expect(q.bPence).toBeGreaterThan(0);
    });
  });

  it('subtract-money: a >= b and answerPence = aPence - bPence (never negative)', () => {
    const qs = generateMoneyQuestions(
      baseSettings({ skills: ['subtract-money'], difficulty: 'hard' }),
      40
    );
    qs.forEach(q => {
      if (q.skill !== 'subtract-money') throw new Error('wrong skill');
      expect(q.aPence).toBeGreaterThanOrEqual(q.bPence);
      expect(q.aPence - q.bPence).toBe(q.answerPence);
      // Subtractions of zero are dull; we bump them in the generator.
      expect(q.answerPence).toBeGreaterThan(0);
    });
  });

  it('change: paid > price and answerPence = paid - price', () => {
    const qs = generateMoneyQuestions(baseSettings({ skills: ['change'] }), 40);
    qs.forEach(q => {
      if (q.skill !== 'change') throw new Error('wrong skill');
      expect(q.paidPence).toBeGreaterThan(q.pricePence);
      expect(q.paidPence - q.pricePence).toBe(q.answerPence);
      expect(q.itemName.length).toBeGreaterThan(0);
    });
  });

  it('multi-item: items have between 3 and 4 entries, sum equals answerPence', () => {
    const qs = generateMoneyQuestions(
      baseSettings({ skills: ['multi-item'], difficulty: 'hard' }),
      40
    );
    qs.forEach(q => {
      if (q.skill !== 'multi-item') throw new Error('wrong skill');
      expect(q.items.length).toBeGreaterThanOrEqual(3);
      expect(q.items.length).toBeLessThanOrEqual(4);
      const sum = q.items.reduce((s, it) => s + it.pricePence, 0);
      expect(sum).toBe(q.answerPence);
      q.items.forEach(it => {
        expect(it.name.length).toBeGreaterThan(0);
        expect(it.pricePence).toBeGreaterThan(0);
      });
    });
  });

  it('multi-item easy/medium: exactly 3 items', () => {
    for (const difficulty of ['easy', 'medium'] as const) {
      const qs = generateMoneyQuestions(
        baseSettings({ skills: ['multi-item'], difficulty }),
        20
      );
      qs.forEach(q => {
        if (q.skill !== 'multi-item') throw new Error('wrong skill');
        expect(q.items.length).toBe(3);
      });
    }
  });

  it('compare-prices: answer matches actual a-vs-b comparison', () => {
    const qs = generateMoneyQuestions(
      baseSettings({ skills: ['compare-prices'] }),
      60
    );
    qs.forEach(q => {
      if (q.skill !== 'compare-prices') throw new Error('wrong skill');
      const expected = q.aPence < q.bPence ? 'A' : q.aPence > q.bPence ? 'B' : 'equal';
      expect(q.answer).toBe(expected);
    });
  });

  it('multiply-money: qty between 2 and 10, answerPence = unit × qty', () => {
    const qs = generateMoneyQuestions(
      baseSettings({ skills: ['multiply-money'], difficulty: 'hard' }),
      40
    );
    qs.forEach(q => {
      if (q.skill !== 'multiply-money') throw new Error('wrong skill');
      expect(q.bPence).toBeGreaterThanOrEqual(2);
      expect(q.bPence).toBeLessThanOrEqual(10);
      expect(q.aPence * q.bPence).toBe(q.answerPence);
      expect(q.itemName.length).toBeGreaterThan(0);
    });
  });
});

describe('generateMoneyQuestions — difficulty constraints', () => {
  it('add-money easy: each operand is pence-only OR whole pounds (no mixed)', () => {
    const qs = generateMoneyQuestions(
      baseSettings({ skills: ['add-money'], difficulty: 'easy' }),
      80
    );
    qs.forEach(q => {
      if (q.skill !== 'add-money') throw new Error('wrong skill');
      for (const v of [q.aPence, q.bPence]) {
        const isPenceOnly = v < 100; // 5..95
        const isWholePounds = v >= 100 && v % 100 === 0;
        expect(isPenceOnly || isWholePounds, `value=${v}`).toBe(true);
      }
    });
  });

  it('add-money medium: no carry across the decimal (sum-of-pence-parts < 100)', () => {
    const qs = generateMoneyQuestions(
      baseSettings({ skills: ['add-money'], difficulty: 'medium' }),
      80
    );
    qs.forEach(q => {
      if (q.skill !== 'add-money') throw new Error('wrong skill');
      const aPence = q.aPence % 100;
      const bPence = q.bPence % 100;
      expect(aPence + bPence).toBeLessThan(100);
    });
  });

  it('add-money hard: includes mixed £+p amounts (not pence-only on either side)', () => {
    const qs = generateMoneyQuestions(
      baseSettings({ skills: ['add-money'], difficulty: 'hard' }),
      100
    );
    // At least most operands should be mixed (>= 100 pence with pence-part > 0).
    const mixed = qs.filter(q => {
      if (q.skill !== 'add-money') return false;
      return q.aPence >= 100 && q.aPence % 100 !== 0;
    });
    expect(mixed.length).toBeGreaterThan(0);
  });
});

describe('checkMoneyAnswer', () => {
  it('accepts an exact pence match for add/subtract/change/multi-item/multiply', () => {
    const q: MoneyQuestion = { skill: 'add-money', aPence: 345, bPence: 220, answerPence: 565 };
    expect(checkMoneyAnswer(q, 565)).toBe(true);
    expect(checkMoneyAnswer(q, 564)).toBe(false);
    expect(checkMoneyAnswer(q, null)).toBe(false);
  });

  it('always rejects compare-prices via the numeric path', () => {
    const q: ComparePricesQuestion = {
      skill: 'compare-prices',
      aPence: 345,
      bPence: 354,
      answer: 'A',
      itemAName: 'apple',
      itemBName: 'banana',
    };
    expect(checkMoneyAnswer(q, 345)).toBe(false);
  });
});

describe('checkCompareAnswer', () => {
  const q: ComparePricesQuestion = {
    skill: 'compare-prices',
    aPence: 345,
    bPence: 354,
    answer: 'A',
    itemAName: 'apple',
    itemBName: 'banana',
  };

  it('returns true only for the recorded answer', () => {
    expect(checkCompareAnswer(q, 'A')).toBe(true);
    expect(checkCompareAnswer(q, 'B')).toBe(false);
    expect(checkCompareAnswer(q, 'equal')).toBe(false);
  });

  it('handles the "equal" case', () => {
    const eq: ComparePricesQuestion = { ...q, bPence: 345, answer: 'equal' };
    expect(checkCompareAnswer(eq, 'equal')).toBe(true);
    expect(checkCompareAnswer(eq, 'A')).toBe(false);
    expect(checkCompareAnswer(eq, 'B')).toBe(false);
  });
});

describe('renderQuestionPlain', () => {
  it('renders add-money', () => {
    expect(
      renderQuestionPlain({
        skill: 'add-money',
        aPence: 345,
        bPence: 220,
        answerPence: 565,
      })
    ).toBe('£3.45 + £2.20 = ?');
  });

  it('renders subtract-money with ASCII hyphen', () => {
    const out = renderQuestionPlain({
      skill: 'subtract-money',
      aPence: 500,
      bPence: 265,
      answerPence: 235,
    });
    expect(out).toBe('£5.00 - £2.65 = ?');
    expect(out).not.toContain('−'); // no U+2212
  });

  it('renders change with item name', () => {
    expect(
      renderQuestionPlain({
        skill: 'change',
        pricePence: 465,
        paidPence: 1000,
        answerPence: 535,
        itemName: 'apple',
      })
    ).toBe('Buy apple £4.65, pay £10.00. Change?');
  });

  it('renders multi-item with comma-separated items', () => {
    expect(
      renderQuestionPlain({
        skill: 'multi-item',
        items: [
          { name: 'apple', pricePence: 50 },
          { name: 'bread', pricePence: 120 },
          { name: 'milk', pricePence: 80 },
        ],
        answerPence: 250,
      })
    ).toBe('apple 50p, bread £1.20, milk 80p. Total?');
  });

  it('renders compare-prices', () => {
    expect(
      renderQuestionPlain({
        skill: 'compare-prices',
        aPence: 345,
        bPence: 354,
        answer: 'A',
        itemAName: 'apple',
        itemBName: 'banana',
      })
    ).toBe('Cheaper: A apple £3.45 or B banana £3.54?');
  });

  it('renders multiply-money with pluralised item name', () => {
    expect(
      renderQuestionPlain({
        skill: 'multiply-money',
        aPence: 130,
        bPence: 5,
        answerPence: 650,
        itemName: 'apple',
      })
    ).toBe('5 apples at £1.30 each. Total?');
  });
});
