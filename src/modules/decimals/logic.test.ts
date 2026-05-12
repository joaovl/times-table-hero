import { describe, it, expect } from 'vitest';
import {
  ALL_SKILLS,
  COMMON_FRACTION_PAIRS,
  COMMON_PERCENT_PAIRS,
  CURRICULUM_TAGS,
  checkFractionAnswer,
  checkNumericAnswer,
  checkOrderAnswer,
  formatDecimal,
  fractionGlyph,
  gcd,
  generateDecimalsQuestions,
  isAddSubQuestion,
  isCompareQuestion,
  isFractionDecimalQuestion,
  isIdentifyQuestion,
  isPercentQuestion,
  isRoundQuestion,
  parseDecimalList,
  roundTo,
  simplifyFraction,
} from './logic';
import type { DecimalsSettings, DecimalsSkill } from './logic';

const baseSettings = (skills: DecimalsSkill[]): DecimalsSettings => ({
  skills,
  gameMode: 'questions',
  questionCount: 10,
  timeLimit: 60,
});

describe('CURRICULUM_TAGS', () => {
  it('every skill in ALL_SKILLS has a curriculum tag', () => {
    ALL_SKILLS.forEach(s => {
      expect(CURRICULUM_TAGS[s]).toBeDefined();
      expect(['Y4', 'Y5', 'Y4/Y5']).toContain(CURRICULUM_TAGS[s].year);
      expect(CURRICULUM_TAGS[s].strand.length).toBeGreaterThan(0);
    });
  });

  it('tenths/hundredths/round-1dp are Y4, thousandths/round-2dp/percent-* are Y5', () => {
    expect(CURRICULUM_TAGS['identify-tenths'].year).toBe('Y4');
    expect(CURRICULUM_TAGS['identify-hundredths'].year).toBe('Y4');
    expect(CURRICULUM_TAGS['identify-thousandths'].year).toBe('Y5');
    expect(CURRICULUM_TAGS['round-1dp'].year).toBe('Y4');
    expect(CURRICULUM_TAGS['round-2dp'].year).toBe('Y5');
    expect(CURRICULUM_TAGS['percent-fraction'].year).toBe('Y5');
    expect(CURRICULUM_TAGS['percent-decimal'].year).toBe('Y5');
    expect(CURRICULUM_TAGS['decimal-percent'].year).toBe('Y5');
  });
});

describe('roundTo', () => {
  it('returns the value when dp is 0', () => {
    expect(roundTo(3.7, 0)).toBe(4);
    expect(roundTo(3.4, 0)).toBe(3);
    expect(roundTo(0, 0)).toBe(0);
  });
  it('handles the classic 0.1 + 0.2 case without floating-point dust', () => {
    expect(roundTo(0.1 + 0.2, 1)).toBe(0.3);
    expect(roundTo(0.1 + 0.2, 2)).toBe(0.3);
  });
  it('rounds half up at 1dp boundaries', () => {
    expect(roundTo(0.45, 1)).toBe(0.5);
    expect(roundTo(0.25, 1)).toBe(0.3);
  });
});

describe('formatDecimal', () => {
  it('formats whole numbers with 0 dp', () => {
    expect(formatDecimal(4, 0)).toBe('4');
    expect(formatDecimal(-3, 0)).toBe('-3');
  });
  it('preserves trailing zeros at the requested dp', () => {
    expect(formatDecimal(0.5, 2)).toBe('0.50');
    expect(formatDecimal(3, 1)).toBe('3.0');
  });
  it('avoids floating-point dust', () => {
    expect(formatDecimal(0.1 + 0.2, 1)).toBe('0.3');
  });
});

describe('gcd and simplifyFraction', () => {
  it('computes gcd via Euclidean', () => {
    expect(gcd(12, 8)).toBe(4);
    expect(gcd(7, 3)).toBe(1);
    expect(gcd(0, 5)).toBe(5);
  });
  it('simplifies 25/100 to 1/4', () => {
    expect(simplifyFraction(25, 100)).toEqual({ num: 1, den: 4 });
  });
  it('simplifies 0/8 to 0/1', () => {
    expect(simplifyFraction(0, 8)).toEqual({ num: 0, den: 1 });
  });
});

describe('fractionGlyph', () => {
  it('returns the unicode glyph for screen-safe fractions', () => {
    expect(fractionGlyph(1, 2)).toBe('½');
    expect(fractionGlyph(1, 4)).toBe('¼');
    expect(fractionGlyph(3, 4)).toBe('¾');
    expect(fractionGlyph(1, 5)).toBe('⅕');
    expect(fractionGlyph(4, 5)).toBe('⅘');
  });
  it('returns null for non-common fractions', () => {
    expect(fractionGlyph(2, 7)).toBeNull();
    expect(fractionGlyph(5, 9)).toBeNull();
  });
});

describe('checkNumericAnswer', () => {
  it('treats null as wrong', () => {
    expect(checkNumericAnswer(0.5, null)).toBe(false);
  });
  it('matches within a tiny epsilon for floating-point safety', () => {
    expect(checkNumericAnswer(0.3, 0.1 + 0.2)).toBe(true);
  });
});

describe('checkFractionAnswer', () => {
  it('accepts the exact fraction', () => {
    expect(checkFractionAnswer(1, 4, 1, 4)).toBe(true);
  });
  it('accepts any equivalent fraction', () => {
    expect(checkFractionAnswer(1, 4, 25, 100)).toBe(true);
    expect(checkFractionAnswer(25, 100, 1, 4)).toBe(true);
  });
  it('rejects null inputs or zero denominator', () => {
    expect(checkFractionAnswer(1, 4, null, 4)).toBe(false);
    expect(checkFractionAnswer(1, 4, 1, null)).toBe(false);
    expect(checkFractionAnswer(1, 4, 1, 0)).toBe(false);
  });
});

describe('checkOrderAnswer', () => {
  it('passes when the typed list matches ascending', () => {
    expect(checkOrderAnswer([0.4, 0.45, 0.5, 0.54], [0.4, 0.45, 0.5, 0.54])).toBe(true);
  });
  it('rejects wrong order', () => {
    expect(checkOrderAnswer([0.4, 0.45, 0.5, 0.54], [0.45, 0.4, 0.5, 0.54])).toBe(false);
  });
  it('rejects mismatched length', () => {
    expect(checkOrderAnswer([0.4, 0.5], [0.4, 0.5, 0.6])).toBe(false);
  });
});

describe('parseDecimalList', () => {
  it('parses comma-separated decimals', () => {
    expect(parseDecimalList('0.45, 0.5, 0.405, 0.54')).toEqual([0.45, 0.5, 0.405, 0.54]);
  });
  it('parses whitespace-separated decimals', () => {
    expect(parseDecimalList('0.1 0.2 0.3')).toEqual([0.1, 0.2, 0.3]);
  });
  it('returns null on non-numeric tokens', () => {
    expect(parseDecimalList('0.1, abc')).toBeNull();
  });
  it('returns null on empty input', () => {
    expect(parseDecimalList('')).toBeNull();
    expect(parseDecimalList('   ')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Generator tests — per-skill shape invariants.
// ---------------------------------------------------------------------------

describe('generateDecimalsQuestions — identify skills', () => {
  it('identify-tenths produces n/10 with 1 ≤ n ≤ 9 and matching decimal', () => {
    const qs = generateDecimalsQuestions(baseSettings(['identify-tenths']), 30);
    qs.forEach(q => {
      expect(isIdentifyQuestion(q)).toBe(true);
      if (isIdentifyQuestion(q)) {
        expect(q.skill).toBe('identify-tenths');
        expect(q.answerDen).toBe(10);
        expect(q.answerNum).toBeGreaterThanOrEqual(1);
        expect(q.answerNum).toBeLessThanOrEqual(9);
        expect(Math.abs(q.decimal - q.answerNum / 10)).toBeLessThan(1e-9);
      }
    });
  });

  it('identify-hundredths produces n/100 with 1 ≤ n ≤ 99', () => {
    const qs = generateDecimalsQuestions(baseSettings(['identify-hundredths']), 30);
    qs.forEach(q => {
      if (isIdentifyQuestion(q)) {
        expect(q.skill).toBe('identify-hundredths');
        expect(q.answerDen).toBe(100);
        expect(q.answerNum).toBeGreaterThanOrEqual(1);
        expect(q.answerNum).toBeLessThanOrEqual(99);
      }
    });
  });

  it('identify-thousandths produces n/1000 with 1 ≤ n ≤ 999', () => {
    const qs = generateDecimalsQuestions(baseSettings(['identify-thousandths']), 30);
    qs.forEach(q => {
      if (isIdentifyQuestion(q)) {
        expect(q.skill).toBe('identify-thousandths');
        expect(q.answerDen).toBe(1000);
        expect(q.answerNum).toBeGreaterThanOrEqual(1);
        expect(q.answerNum).toBeLessThanOrEqual(999);
      }
    });
  });
});

describe('generateDecimalsQuestions — round skills', () => {
  it('round-1dp always asks to round to a whole number; answer is integer', () => {
    const qs = generateDecimalsQuestions(baseSettings(['round-1dp']), 30);
    qs.forEach(q => {
      if (isRoundQuestion(q)) {
        expect(q.skill).toBe('round-1dp');
        expect(q.precision).toBe(0);
        expect(Number.isInteger(q.answer)).toBe(true);
        expect(q.answer).toBe(Math.round(q.decimal));
      }
    });
  });

  it('round-2dp asks for whole or 1dp; answer matches the requested precision', () => {
    const qs = generateDecimalsQuestions(baseSettings(['round-2dp']), 80);
    let saw0 = false;
    let saw1 = false;
    qs.forEach(q => {
      if (isRoundQuestion(q)) {
        expect(q.skill).toBe('round-2dp');
        expect([0, 1]).toContain(q.precision);
        if (q.precision === 0) {
          saw0 = true;
          expect(q.answer).toBe(Math.round(q.decimal));
        } else {
          saw1 = true;
          expect(Math.abs(q.answer - roundTo(q.decimal, 1))).toBeLessThan(1e-9);
        }
      }
    });
    // Across 80 draws we should see both precisions.
    expect(saw0).toBe(true);
    expect(saw1).toBe(true);
  });
});

describe('generateDecimalsQuestions — compare-decimals', () => {
  it('emits 4 distinct decimals and a sorted-ascending answer', () => {
    const qs = generateDecimalsQuestions(baseSettings(['compare-decimals']), 30);
    qs.forEach(q => {
      if (isCompareQuestion(q)) {
        expect(q.decimals).toHaveLength(4);
        expect(q.answer).toHaveLength(4);
        // Distinct values
        const distinct = new Set(q.decimals);
        expect(distinct.size).toBe(4);
        // Answer is ascending
        for (let i = 1; i < q.answer.length; i++) {
          expect(q.answer[i]).toBeGreaterThanOrEqual(q.answer[i - 1]);
        }
        // Answer is a permutation of decimals
        expect(new Set(q.answer)).toEqual(new Set(q.decimals));
      }
    });
  });
});

describe('generateDecimalsQuestions — fraction <-> decimal', () => {
  it('fraction-to-decimal picks from the common-pair table', () => {
    const qs = generateDecimalsQuestions(baseSettings(['fraction-to-decimal']), 30);
    qs.forEach(q => {
      if (isFractionDecimalQuestion(q)) {
        expect(q.skill).toBe('fraction-to-decimal');
        const matches = COMMON_FRACTION_PAIRS.some(
          p => p.num === q.num && p.den === q.den && Math.abs(p.decimal - q.decimal) < 1e-9
        );
        expect(matches).toBe(true);
      }
    });
  });

  it('decimal-to-fraction picks from the common-pair table', () => {
    const qs = generateDecimalsQuestions(baseSettings(['decimal-to-fraction']), 30);
    qs.forEach(q => {
      if (isFractionDecimalQuestion(q)) {
        expect(q.skill).toBe('decimal-to-fraction');
        const matches = COMMON_FRACTION_PAIRS.some(
          p => p.num === q.num && p.den === q.den && Math.abs(p.decimal - q.decimal) < 1e-9
        );
        expect(matches).toBe(true);
      }
    });
  });
});

describe('generateDecimalsQuestions — percent skills', () => {
  it('percent-fraction maps headline percents to fraction pair', () => {
    const qs = generateDecimalsQuestions(baseSettings(['percent-fraction']), 30);
    qs.forEach(q => {
      if (isPercentQuestion(q)) {
        const found = COMMON_PERCENT_PAIRS.find(p => p.percent === q.percent);
        expect(found).toBeDefined();
        if (found) {
          expect(q.num).toBe(found.num);
          expect(q.den).toBe(found.den);
        }
      }
    });
  });

  it('decimal-percent maps decimals back to a percent value', () => {
    const qs = generateDecimalsQuestions(baseSettings(['decimal-percent']), 30);
    qs.forEach(q => {
      if (isPercentQuestion(q)) {
        expect(q.skill).toBe('decimal-percent');
        // Decimal × 100 ≈ percent (within fp tolerance)
        expect(Math.abs(q.decimal * 100 - q.percent)).toBeLessThan(1e-9);
      }
    });
  });
});

describe('generateDecimalsQuestions — add/subtract decimals', () => {
  it('add-decimals: answer equals a + b (within fp epsilon)', () => {
    const qs = generateDecimalsQuestions(baseSettings(['add-decimals']), 50);
    qs.forEach(q => {
      if (isAddSubQuestion(q)) {
        expect(q.skill).toBe('add-decimals');
        expect(q.sign).toBe('+');
        expect(Math.abs(q.answer - (q.a + q.b))).toBeLessThan(1e-6);
      }
    });
  });

  it('subtract-decimals: a >= b and answer equals a - b (non-negative)', () => {
    const qs = generateDecimalsQuestions(baseSettings(['subtract-decimals']), 50);
    qs.forEach(q => {
      if (isAddSubQuestion(q)) {
        expect(q.skill).toBe('subtract-decimals');
        expect(q.sign).toBe('-');
        expect(q.a).toBeGreaterThanOrEqual(q.b);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(Math.abs(q.answer - (q.a - q.b))).toBeLessThan(1e-6);
      }
    });
  });
});

describe('generateDecimalsQuestions — multi-skill mix', () => {
  it('returns the requested count', () => {
    const qs = generateDecimalsQuestions(
      baseSettings(['identify-tenths', 'round-1dp', 'compare-decimals']),
      25
    );
    expect(qs).toHaveLength(25);
  });

  it('every question carries a skill from the requested set', () => {
    const wanted: DecimalsSkill[] = ['identify-tenths', 'add-decimals'];
    const qs = generateDecimalsQuestions(baseSettings(wanted), 60);
    qs.forEach(q => expect(wanted).toContain(q.skill));
  });

  it('empty skills falls back to identify-tenths', () => {
    const qs = generateDecimalsQuestions(baseSettings([]), 10);
    qs.forEach(q => expect(q.skill).toBe('identify-tenths'));
  });
});
