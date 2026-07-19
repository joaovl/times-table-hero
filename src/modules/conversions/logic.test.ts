import { describe, it, expect } from 'vitest';
import {
  CONVERSION_SKILL_OPTIONS,
  CURRICULUM_TAGS,
  answerString,
  formatNumber,
  generateConversionQuestions,
  isAnswerCorrect,
  promptFor,
} from './logic';
import type {
  ConversionDifficulty,
  ConversionQuestion,
  ConversionSettings,
  ConversionSkill,
  FigureSpecL,
  FigureSpecT,
} from './logic';

const baseSettings = (over: Partial<ConversionSettings>): ConversionSettings => ({
  skills: ['length-cm-mm'],
  difficulty: 'easy',
  gameMode: 'questions',
  questionCount: 10,
  timeLimit: 60,
  ...over,
});

// -------------------------------------------------------------------------
// CURRICULUM_TAGS
// -------------------------------------------------------------------------

describe('CURRICULUM_TAGS', () => {
  it('has an entry for every skill', () => {
    CONVERSION_SKILL_OPTIONS.forEach(s => {
      expect(CURRICULUM_TAGS[s]).toBeDefined();
      expect(CURRICULUM_TAGS[s].length).toBeGreaterThan(0);
    });
  });

  it('targets Years 3 - 5 only (v1 scope)', () => {
    const allTags = new Set<string>();
    Object.values(CURRICULUM_TAGS).forEach(arr => arr.forEach(t => allTags.add(t)));
    const allowed = new Set(['Y3', 'Y4', 'Y5']);
    allTags.forEach(t => expect(allowed.has(t)).toBe(true));
  });
});

// -------------------------------------------------------------------------
// CONVERSION_SKILL_OPTIONS list shape
// -------------------------------------------------------------------------

describe('CONVERSION_SKILL_OPTIONS contains all twelve v1 skills', () => {
  it('lists every skill in canonical order', () => {
    expect(CONVERSION_SKILL_OPTIONS).toEqual([
      'length-cm-mm',
      'length-m-cm',
      'length-km-m',
      'mass-kg-g',
      'volume-L-mL',
      'time-h-min',
      'time-min-s',
      'metric-imperial',
      'perimeter-composite',
      'area-irregular',
      'volume-cube',
      'volume-cuboid',
    ]);
  });
});

// -------------------------------------------------------------------------
// Simple unit conversions
// -------------------------------------------------------------------------

describe('generateConversionQuestions — simple conversions', () => {
  it.each<[ConversionSkill, number]>([
    ['length-cm-mm', 10],
    ['length-m-cm', 100],
    ['length-km-m', 1000],
    ['mass-kg-g', 1000],
    ['volume-L-mL', 1000],
    ['time-h-min', 60],
    ['time-min-s', 60],
  ])('%s: answer === fromValue * factor (within fp tolerance)', (skill, factor) => {
    const qs = generateConversionQuestions(
      baseSettings({ skills: [skill], difficulty: 'easy' }),
      30
    );
    qs.forEach(q => {
      if (q.skill === skill && 'fromValue' in q) {
        expect(q.answer).toBeCloseTo(q.fromValue * factor, 5);
      }
    });
  });

  it('easy difficulty produces integer fromValue for simple skills', () => {
    const qs = generateConversionQuestions(
      baseSettings({ skills: ['length-cm-mm'], difficulty: 'easy' }),
      30
    );
    qs.forEach(q => {
      if ('fromValue' in q) expect(Number.isInteger(q.fromValue)).toBe(true);
    });
  });

  it('medium difficulty may produce decimal fromValue', () => {
    const qs = generateConversionQuestions(
      baseSettings({ skills: ['volume-L-mL'], difficulty: 'medium' }),
      50
    );
    const hasDecimal = qs.some(q => 'fromValue' in q && !Number.isInteger(q.fromValue));
    expect(hasDecimal).toBe(true);
  });

  it('returns the requested count', () => {
    const qs = generateConversionQuestions(baseSettings({}), 25);
    expect(qs).toHaveLength(25);
  });

  it('returns 0 when asked for 0', () => {
    const qs = generateConversionQuestions(baseSettings({}), 0);
    expect(qs).toHaveLength(0);
  });
});

// -------------------------------------------------------------------------
// metric-imperial — 5:8 ratio (rough)
// -------------------------------------------------------------------------

describe('generateConversionQuestions — metric-imperial', () => {
  it('miles → km uses the 5:8 ratio', () => {
    const qs = generateConversionQuestions(
      baseSettings({ skills: ['metric-imperial'] }),
      80
    );
    qs.forEach(q => {
      if (q.skill === 'metric-imperial') {
        if (q.fromUnit === 'miles') {
          // miles is a multiple of 5; km is miles/5 * 8.
          expect(q.fromValue % 5).toBe(0);
          expect(q.answer).toBe((q.fromValue / 5) * 8);
        } else if (q.fromUnit === 'km') {
          // km is a multiple of 5; miles is rounded ratio.
          expect(q.fromValue % 5).toBe(0);
          // Allow ±1 for rounding fairness.
          const expected = Math.round((q.fromValue / 8) * 5);
          expect(q.answer).toBe(expected);
        }
      }
    });
  });

  it('both directions appear over a large sample', () => {
    const qs = generateConversionQuestions(
      baseSettings({ skills: ['metric-imperial'] }),
      200
    );
    const fromUnits = new Set(qs.map(q => ('fromUnit' in q ? q.fromUnit : '')));
    expect(fromUnits.has('miles')).toBe(true);
    expect(fromUnits.has('km')).toBe(true);
  });
});

// -------------------------------------------------------------------------
// perimeter-composite
// -------------------------------------------------------------------------

describe('generateConversionQuestions — perimeter-composite', () => {
  it('every L-shape has 6 positive integer edges that sum to the answer', () => {
    const qs = generateConversionQuestions(
      baseSettings({ skills: ['perimeter-composite'], difficulty: 'medium' }),
      80
    );
    qs.forEach(q => {
      if (q.skill === 'perimeter-composite' && q.layout === 'L') {
        expect(q.edges).toHaveLength(6);
        q.edges.forEach(e => {
          expect(e).toBeGreaterThan(0);
          expect(Number.isInteger(e)).toBe(true);
        });
        const sum = q.edges.reduce((s, x) => s + x, 0);
        expect(q.answer).toBe(sum);
      }
    });
  });

  it('every T-shape has 8 positive integer edges that sum to the answer', () => {
    const qs = generateConversionQuestions(
      baseSettings({ skills: ['perimeter-composite'], difficulty: 'hard' }),
      80
    );
    qs.forEach(q => {
      if (q.skill === 'perimeter-composite' && q.layout === 'T') {
        expect(q.edges).toHaveLength(8);
        q.edges.forEach(e => {
          expect(e).toBeGreaterThan(0);
          expect(Number.isInteger(e)).toBe(true);
        });
        const sum = q.edges.reduce((s, x) => s + x, 0);
        expect(q.answer).toBe(sum);
      }
    });
  });

  it('L-shape perimeter equals 2*(outerW + outerH)', () => {
    // L-shape perimeter identity — the rectangular cut cancels out.
    const qs = generateConversionQuestions(
      baseSettings({ skills: ['perimeter-composite'] }),
      60
    );
    qs.forEach(q => {
      if (q.skill === 'perimeter-composite' && q.layout === 'L') {
        const spec = q.figureSpec as FigureSpecL;
        expect(q.answer).toBe(2 * (spec.outerW + spec.outerH));
      }
    });
  });

  it('T-shape shoulders are strictly positive (topW > stemW)', () => {
    const qs = generateConversionQuestions(
      baseSettings({ skills: ['perimeter-composite'] }),
      60
    );
    qs.forEach(q => {
      if (q.skill === 'perimeter-composite' && q.layout === 'T') {
        const spec = q.figureSpec as FigureSpecT;
        expect(spec.topW).toBeGreaterThan(spec.stemW);
      }
    });
  });
});

// -------------------------------------------------------------------------
// area-irregular
// -------------------------------------------------------------------------

describe('generateConversionQuestions — area-irregular', () => {
  it('answer === count of true cells', () => {
    const qs = generateConversionQuestions(
      baseSettings({ skills: ['area-irregular'] }),
      30
    );
    qs.forEach(q => {
      if (q.skill === 'area-irregular') {
        let count = 0;
        q.grid.forEach(row => row.forEach(c => c && count++));
        expect(q.answer).toBe(count);
      }
    });
  });

  it('grid is square (rows === cols) and at least 3 cells shaded', () => {
    const qs = generateConversionQuestions(
      baseSettings({ skills: ['area-irregular'] }),
      30
    );
    qs.forEach(q => {
      if (q.skill === 'area-irregular') {
        const rows = q.grid.length;
        const cols = q.grid[0].length;
        expect(rows).toBe(cols);
        expect(q.answer).toBeGreaterThanOrEqual(3);
      }
    });
  });
});

// -------------------------------------------------------------------------
// volume-cube / volume-cuboid
// -------------------------------------------------------------------------

describe('generateConversionQuestions — volume skills', () => {
  it('cube: answer === side^3', () => {
    const qs = generateConversionQuestions(
      baseSettings({ skills: ['volume-cube'] }),
      40
    );
    qs.forEach(q => {
      if (q.skill === 'volume-cube') {
        expect(q.answer).toBe(q.side ** 3);
      }
    });
  });

  it('cuboid: answer === length * width * height', () => {
    const qs = generateConversionQuestions(
      baseSettings({ skills: ['volume-cuboid'] }),
      40
    );
    qs.forEach(q => {
      if (q.skill === 'volume-cuboid') {
        expect(q.answer).toBe(q.length * q.width * q.height);
      }
    });
  });

  it('cube unit defaults to cm³', () => {
    const qs = generateConversionQuestions(
      baseSettings({ skills: ['volume-cube'] }),
      10
    );
    qs.forEach(q => {
      if (q.skill === 'volume-cube') expect(q.unit).toBe('cm³');
    });
  });
});

// -------------------------------------------------------------------------
// Mixed-skill generation
// -------------------------------------------------------------------------

describe('generateConversionQuestions — mixed skill set', () => {
  it('all skills can appear over a large sample', () => {
    const allSkills: ConversionSkill[] = [...CONVERSION_SKILL_OPTIONS];
    const qs = generateConversionQuestions(baseSettings({ skills: allSkills }), 600);
    const seen = new Set(qs.map(q => q.skill));
    allSkills.forEach(s => expect(seen.has(s)).toBe(true));
  });

  it('empty skills falls back to length-cm-mm', () => {
    const qs = generateConversionQuestions(baseSettings({ skills: [] }), 5);
    expect(qs).toHaveLength(5);
    qs.forEach(q => expect(q.skill).toBe('length-cm-mm'));
  });
});

// -------------------------------------------------------------------------
// formatNumber
// -------------------------------------------------------------------------

describe('formatNumber', () => {
  it('integers stay integers', () => {
    expect(formatNumber(12)).toBe('12');
    expect(formatNumber(0)).toBe('0');
  });

  it('drops trailing zeros on decimals', () => {
    expect(formatNumber(1.5)).toBe('1.5');
    expect(formatNumber(1.0)).toBe('1');
    expect(formatNumber(2.4)).toBe('2.4');
  });
});

// -------------------------------------------------------------------------
// promptFor
// -------------------------------------------------------------------------

describe('promptFor', () => {
  it('simple conversion prompt has "= ?" structure', () => {
    const q: ConversionQuestion = {
      skill: 'length-cm-mm',
      fromValue: 30,
      fromUnit: 'cm',
      toUnit: 'mm',
      answer: 300,
    };
    expect(promptFor(q)).toBe('30 cm = ? mm');
  });

  it('metric-imperial prompt uses the word "approximately" (no ≈ glyph)', () => {
    const q: ConversionQuestion = {
      skill: 'metric-imperial',
      fromValue: 5,
      fromUnit: 'miles',
      toUnit: 'km',
      answer: 8,
    };
    const p = promptFor(q);
    expect(p).toContain('approximately');
    expect(p).not.toMatch(/≈/);
  });

  it('perimeter-composite prompt asks for the perimeter with unit', () => {
    const q: ConversionQuestion = {
      skill: 'perimeter-composite',
      layout: 'rect',
      figureSpec: { w: 3, h: 4 },
      edges: [3, 4, 3, 4],
      answer: 14,
      unit: 'cm',
    };
    expect(promptFor(q)).toBe('Perimeter? (cm)');
  });
});

// -------------------------------------------------------------------------
// answerString
// -------------------------------------------------------------------------

describe('answerString', () => {
  it('simple conversion answer carries the toUnit', () => {
    const q: ConversionQuestion = {
      skill: 'length-cm-mm',
      fromValue: 30,
      fromUnit: 'cm',
      toUnit: 'mm',
      answer: 300,
    };
    expect(answerString(q)).toBe('300 mm');
  });

  it('metric-imperial uses the "~" tilde rather than ≈', () => {
    const q: ConversionQuestion = {
      skill: 'metric-imperial',
      fromValue: 5,
      fromUnit: 'miles',
      toUnit: 'km',
      answer: 8,
    };
    expect(answerString(q)).toBe('~ 8 km');
    expect(answerString(q)).not.toMatch(/≈/);
  });

  it('volume answer carries cm³ suffix', () => {
    const q: ConversionQuestion = {
      skill: 'volume-cube',
      side: 3,
      answer: 27,
      unit: 'cm³',
    };
    expect(answerString(q)).toBe('27 cm³');
  });

  it('area-irregular answer carries "sq units"', () => {
    const q: ConversionQuestion = {
      skill: 'area-irregular',
      grid: [
        [true, true],
        [true, false],
      ],
      answer: 3,
      unit: 'sq',
    };
    expect(answerString(q)).toBe('3 sq units');
  });
});

// -------------------------------------------------------------------------
// isAnswerCorrect
// -------------------------------------------------------------------------

describe('isAnswerCorrect — simple conversions', () => {
  it('cm → mm accepts the plain integer', () => {
    const q: ConversionQuestion = {
      skill: 'length-cm-mm',
      fromValue: 30,
      fromUnit: 'cm',
      toUnit: 'mm',
      answer: 300,
    };
    expect(isAnswerCorrect(q, '300')).toBe(true);
    expect(isAnswerCorrect(q, '300 mm')).toBe(true);
    expect(isAnswerCorrect(q, '301')).toBe(false);
  });

  it('volume-L-mL accepts a decimal answer with optional unit', () => {
    const q: ConversionQuestion = {
      skill: 'volume-L-mL',
      fromValue: 1.5,
      fromUnit: 'L',
      toUnit: 'mL',
      answer: 1500,
    };
    expect(isAnswerCorrect(q, '1500')).toBe(true);
    expect(isAnswerCorrect(q, '1500 mL')).toBe(true);
    expect(isAnswerCorrect(q, '1499')).toBe(false);
  });

  it('time-h-min accepts plain numeric', () => {
    const q: ConversionQuestion = {
      skill: 'time-h-min',
      fromValue: 2,
      fromUnit: 'h',
      toUnit: 'min',
      answer: 120,
    };
    expect(isAnswerCorrect(q, '120')).toBe(true);
    expect(isAnswerCorrect(q, '120 min')).toBe(true);
    expect(isAnswerCorrect(q, '120 minutes')).toBe(true);
    expect(isAnswerCorrect(q, '119')).toBe(false);
  });

  it('rejects empty / whitespace input', () => {
    const q: ConversionQuestion = {
      skill: 'length-cm-mm',
      fromValue: 5,
      fromUnit: 'cm',
      toUnit: 'mm',
      answer: 50,
    };
    expect(isAnswerCorrect(q, '')).toBe(false);
    expect(isAnswerCorrect(q, '   ')).toBe(false);
  });
});

describe('isAnswerCorrect — metric-imperial (approximate, ±1)', () => {
  // Metric<->imperial is an approximation (the 5:8 ratio is itself rough), so a
  // sensible close answer must not be marked wrong (bug #16).
  it('5 miles ≈ 8 km accepts 7..9, rejects clearly-off values', () => {
    const q: ConversionQuestion = {
      skill: 'metric-imperial',
      fromValue: 5,
      fromUnit: 'miles',
      toUnit: 'km',
      answer: 8,
    };
    expect(isAnswerCorrect(q, '8')).toBe(true);
    expect(isAnswerCorrect(q, '7')).toBe(true);
    expect(isAnswerCorrect(q, '9')).toBe(true);
    expect(isAnswerCorrect(q, '6')).toBe(false);
    expect(isAnswerCorrect(q, '10')).toBe(false);
  });

  it('15 km ≈ 9 miles accepts a close 10 (the reported case)', () => {
    const q: ConversionQuestion = {
      skill: 'metric-imperial',
      fromValue: 15,
      fromUnit: 'km',
      toUnit: 'miles',
      answer: 9,
    };
    expect(isAnswerCorrect(q, '9')).toBe(true);
    expect(isAnswerCorrect(q, '10')).toBe(true);
    expect(isAnswerCorrect(q, '8')).toBe(true);
    expect(isAnswerCorrect(q, '11')).toBe(false);
    expect(isAnswerCorrect(q, '7')).toBe(false);
  });
});

describe('isAnswerCorrect — figure-based skills', () => {
  it('perimeter-composite accepts the integer with optional unit', () => {
    const q: ConversionQuestion = {
      skill: 'perimeter-composite',
      layout: 'rect',
      figureSpec: { w: 3, h: 4 },
      edges: [3, 4, 3, 4],
      answer: 14,
      unit: 'cm',
    };
    expect(isAnswerCorrect(q, '14')).toBe(true);
    expect(isAnswerCorrect(q, '14 cm')).toBe(true);
    expect(isAnswerCorrect(q, '13')).toBe(false);
  });

  it('area-irregular accepts the count', () => {
    const q: ConversionQuestion = {
      skill: 'area-irregular',
      grid: [[true, true], [true, false]],
      answer: 3,
      unit: 'sq',
    };
    expect(isAnswerCorrect(q, '3')).toBe(true);
    expect(isAnswerCorrect(q, '3 sq')).toBe(true);
    expect(isAnswerCorrect(q, '3 squares')).toBe(true);
    expect(isAnswerCorrect(q, '4')).toBe(false);
  });

  it('volume-cube accepts the integer with cm³ / cm3 / cubic cm', () => {
    const q: ConversionQuestion = {
      skill: 'volume-cube',
      side: 3,
      answer: 27,
      unit: 'cm³',
    };
    expect(isAnswerCorrect(q, '27')).toBe(true);
    expect(isAnswerCorrect(q, '27 cm³')).toBe(true);
    expect(isAnswerCorrect(q, '27 cm3')).toBe(true);
    expect(isAnswerCorrect(q, '27 cubic cm')).toBe(true);
    expect(isAnswerCorrect(q, '26')).toBe(false);
  });

  it('volume-cuboid: 2x3x4 = 24', () => {
    const q: ConversionQuestion = {
      skill: 'volume-cuboid',
      length: 2,
      width: 3,
      height: 4,
      answer: 24,
      unit: 'cm³',
    };
    expect(isAnswerCorrect(q, '24')).toBe(true);
    expect(isAnswerCorrect(q, '24 cm³')).toBe(true);
    expect(isAnswerCorrect(q, '23')).toBe(false);
  });
});

// -------------------------------------------------------------------------
// Encoding-safety — the question/answer text never includes a Math
// Operators block character (≈ etc.) that would mis-render in jsPDF.
// -------------------------------------------------------------------------

describe('encoding safety — promptFor / answerString avoid the Unicode Math Operators block', () => {
  it.each<ConversionDifficulty>(['easy', 'medium', 'hard'])(
    'no Math Operators glyphs at %s difficulty',
    diff => {
      const allSkills: ConversionSkill[] = [...CONVERSION_SKILL_OPTIONS];
      const qs = generateConversionQuestions(
        baseSettings({ skills: allSkills, difficulty: diff }),
        200
      );
      const block = /[∀-⋿]/u;
      qs.forEach(q => {
        expect(block.test(promptFor(q))).toBe(false);
        expect(block.test(answerString(q))).toBe(false);
      });
    }
  );
});

describe('imperial gating (i18n)', () => {
  it('offers imperial skills only under en', async () => {
    const { setLocale } = await import('@/lib/i18n/i18n');
    const { visibleConversionSkills, isImperialSkill } = await import('./logic');
    try {
      setLocale('fr');
      expect(visibleConversionSkills().some(isImperialSkill)).toBe(false);
      setLocale('en');
      expect(visibleConversionSkills().some(isImperialSkill)).toBe(true);
      // Metric skills are never gated.
      expect(visibleConversionSkills()).toContain('length-cm-mm');
    } finally {
      setLocale('en');
    }
  });
});
