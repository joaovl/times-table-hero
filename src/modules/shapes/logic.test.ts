import { describe, it, expect } from 'vitest';
import {
  ANGLE_CATEGORIES,
  answerString,
  generateShapeQuestions,
  isAnswerCorrect,
  maxDimensionForDifficulty,
  PI_APPROX,
  pickNameDistractors,
  promptFor,
  SHAPE_KIND_OPTIONS,
  SHAPE_SIDE_COUNT,
  SHAPE_SKILL_OPTIONS,
  unitsSquared,
} from './logic';
import type {
  AngleCategory,
  ShapeDifficulty,
  ShapeSettings,
  ShapeSkill,
  ShapeUnits,
} from './logic';

const baseSettings = (over: Partial<ShapeSettings>): ShapeSettings => ({
  skills: ['name-2d'],
  units: 'cm',
  difficulty: 'easy',
  gameMode: 'questions',
  questionCount: 10,
  timeLimit: 60,
  ...over,
});

describe('SHAPE_SIDE_COUNT', () => {
  it('canonical polygon side counts', () => {
    expect(SHAPE_SIDE_COUNT.triangle).toBe(3);
    expect(SHAPE_SIDE_COUNT.square).toBe(4);
    expect(SHAPE_SIDE_COUNT.rectangle).toBe(4);
    expect(SHAPE_SIDE_COUNT.pentagon).toBe(5);
    expect(SHAPE_SIDE_COUNT.hexagon).toBe(6);
    expect(SHAPE_SIDE_COUNT.octagon).toBe(8);
    expect(SHAPE_SIDE_COUNT.circle).toBe(0);
  });
});

describe('maxDimensionForDifficulty', () => {
  it.each<[ShapeDifficulty, number]>([
    ['easy', 10],
    ['medium', 20],
    ['hard', 50],
  ])('%s -> %i', (d, expected) => {
    expect(maxDimensionForDifficulty(d)).toBe(expected);
  });
});

describe('generateShapeQuestions — count', () => {
  it('returns the requested count', () => {
    const qs = generateShapeQuestions(baseSettings({}), 25);
    expect(qs).toHaveLength(25);
  });

  it('returns 0 when asked for 0', () => {
    const qs = generateShapeQuestions(baseSettings({}), 0);
    expect(qs).toHaveLength(0);
  });

  it('every generated question has the requested units', () => {
    const units: ShapeUnits = 'mm';
    const qs = generateShapeQuestions(
      baseSettings({ skills: ['perimeter-rect'], units }),
      50
    );
    qs.forEach(q => expect(q.units).toBe('mm'));
  });
});

describe('generateShapeQuestions — name-2d', () => {
  it('every name-2d question has a valid shape field', () => {
    const qs = generateShapeQuestions(baseSettings({ skills: ['name-2d'] }), 100);
    qs.forEach(q => {
      expect(q.skill).toBe('name-2d');
      expect(q.shape).toBeDefined();
      expect(SHAPE_KIND_OPTIONS).toContain(q.shape!);
    });
  });

  it('all 7 named shapes appear over a large sample', () => {
    const qs = generateShapeQuestions(baseSettings({ skills: ['name-2d'] }), 700);
    const seen = new Set(qs.map(q => q.shape));
    SHAPE_KIND_OPTIONS.forEach(k => expect(seen.has(k)).toBe(true));
  });
});

describe('generateShapeQuestions — count-sides', () => {
  it("never picks 'circle' (circles have no countable straight sides)", () => {
    const qs = generateShapeQuestions(baseSettings({ skills: ['count-sides'] }), 300);
    qs.forEach(q => expect(q.shape).not.toBe('circle'));
  });

  it("answer matches the shape's canonical side count", () => {
    const qs = generateShapeQuestions(baseSettings({ skills: ['count-sides'] }), 200);
    qs.forEach(q => {
      expect(q.shape).toBeDefined();
      expect(q.answer).toBe(SHAPE_SIDE_COUNT[q.shape!]);
    });
  });

  it('triangle -> 3, square -> 4, pentagon -> 5, hexagon -> 6, octagon -> 8', () => {
    // Sanity check via the constant (the generator stays uniform on these).
    expect(SHAPE_SIDE_COUNT.triangle).toBe(3);
    expect(SHAPE_SIDE_COUNT.square).toBe(4);
    expect(SHAPE_SIDE_COUNT.pentagon).toBe(5);
    expect(SHAPE_SIDE_COUNT.hexagon).toBe(6);
    expect(SHAPE_SIDE_COUNT.octagon).toBe(8);
  });
});

describe('generateShapeQuestions — perimeter-rect', () => {
  it('answer === 2 * (width + height)', () => {
    const qs = generateShapeQuestions(
      baseSettings({ skills: ['perimeter-rect'], difficulty: 'medium' }),
      150
    );
    qs.forEach(q => {
      expect(q.width).toBeDefined();
      expect(q.height).toBeDefined();
      expect(q.answer).toBe(2 * (q.width! + q.height!));
    });
  });

  it('dimensions are integers ≥ 1', () => {
    const qs = generateShapeQuestions(
      baseSettings({ skills: ['perimeter-rect'], difficulty: 'hard' }),
      150
    );
    qs.forEach(q => {
      expect(Number.isInteger(q.width)).toBe(true);
      expect(Number.isInteger(q.height)).toBe(true);
      expect(q.width!).toBeGreaterThanOrEqual(1);
      expect(q.height!).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('generateShapeQuestions — area-rect', () => {
  it('answer === width * height', () => {
    const qs = generateShapeQuestions(
      baseSettings({ skills: ['area-rect'], difficulty: 'medium' }),
      150
    );
    qs.forEach(q => {
      expect(q.width).toBeDefined();
      expect(q.height).toBeDefined();
      expect(q.answer).toBe(q.width! * q.height!);
    });
  });
});

describe('generateShapeQuestions — difficulty respected', () => {
  it.each<[ShapeDifficulty, number]>([
    ['easy', 10],
    ['medium', 20],
    ['hard', 50],
  ])('%s: dimensions ≤ %i', (difficulty, max) => {
    const qs = generateShapeQuestions(
      baseSettings({ skills: ['perimeter-rect', 'area-rect'], difficulty }),
      250
    );
    qs.forEach(q => {
      expect(q.width!).toBeLessThanOrEqual(max);
      expect(q.height!).toBeLessThanOrEqual(max);
    });
  });
});

describe('generateShapeQuestions — empty/default fallbacks', () => {
  it('empty skills falls back to name-2d (no crash)', () => {
    const qs = generateShapeQuestions(baseSettings({ skills: [] }), 5);
    expect(qs).toHaveLength(5);
    qs.forEach(q => expect(q.skill).toBe('name-2d'));
  });
});

describe('generateShapeQuestions — mixed skill set', () => {
  it('all four skills appear over a large sample', () => {
    const allSkills: ShapeSkill[] = [...SHAPE_SKILL_OPTIONS];
    const qs = generateShapeQuestions(baseSettings({ skills: allSkills }), 400);
    const seen = new Set(qs.map(q => q.skill));
    allSkills.forEach(s => expect(seen.has(s)).toBe(true));
  });
});

describe('pickNameDistractors', () => {
  it('returns the requested number of distractors', () => {
    const ds = pickNameDistractors('square', 3);
    expect(ds).toHaveLength(3);
  });

  it('never includes the correct answer', () => {
    for (let trial = 0; trial < 50; trial++) {
      const correct = SHAPE_KIND_OPTIONS[trial % SHAPE_KIND_OPTIONS.length];
      const ds = pickNameDistractors(correct, 3);
      expect(ds).not.toContain(correct);
    }
  });

  it('returned distractors are unique', () => {
    const ds = pickNameDistractors('hexagon', 3);
    expect(new Set(ds).size).toBe(ds.length);
  });
});

describe('promptFor', () => {
  it('matches the skill', () => {
    expect(promptFor({ skill: 'name-2d', shape: 'square', units: 'cm', answer: 4 })).toBe('Name?');
    expect(promptFor({ skill: 'count-sides', shape: 'hexagon', units: 'cm', answer: 6 })).toBe('Sides?');
    expect(promptFor({ skill: 'perimeter-rect', width: 3, height: 4, units: 'cm', answer: 14 })).toBe('Perimeter?');
    expect(promptFor({ skill: 'area-rect', width: 3, height: 4, units: 'cm', answer: 12 })).toBe('Area?');
  });
});

describe('answerString', () => {
  it('name-2d returns the shape name', () => {
    expect(
      answerString({ skill: 'name-2d', shape: 'hexagon', units: 'cm', answer: 6 })
    ).toBe('hexagon');
  });

  it('count-sides returns just the number', () => {
    expect(
      answerString({ skill: 'count-sides', shape: 'pentagon', units: 'cm', answer: 5 })
    ).toBe('5');
  });

  it('perimeter-rect appends units', () => {
    expect(
      answerString({ skill: 'perimeter-rect', width: 3, height: 4, units: 'cm', answer: 14 })
    ).toBe('14 cm');
  });

  it('area-rect appends squared units', () => {
    // v1.1: area answers carry the squared-unit suffix (cm² / mm² …)
    // so the answer key is dimensionally correct alongside the new
    // area-tri / area-circle skills.
    expect(
      answerString({ skill: 'area-rect', width: 3, height: 4, units: 'mm', answer: 12 })
    ).toBe('12 mm²');
  });
});

describe('isAnswerCorrect', () => {
  it('name-2d accepts the shape name (case-insensitive)', () => {
    const q = { skill: 'name-2d' as const, shape: 'pentagon' as const, units: 'cm' as const, answer: 5 };
    expect(isAnswerCorrect(q, 'pentagon')).toBe(true);
    expect(isAnswerCorrect(q, 'Pentagon')).toBe(true);
    expect(isAnswerCorrect(q, '  PENTAGON  ')).toBe(true);
    expect(isAnswerCorrect(q, 'hexagon')).toBe(false);
  });

  it('count-sides accepts the integer string', () => {
    const q = { skill: 'count-sides' as const, shape: 'hexagon' as const, units: 'cm' as const, answer: 6 };
    expect(isAnswerCorrect(q, '6')).toBe(true);
    expect(isAnswerCorrect(q, '5')).toBe(false);
    expect(isAnswerCorrect(q, 'six')).toBe(false);
  });

  it('perimeter-rect / area-rect accept the integer answer (units typed are ignored)', () => {
    const q = { skill: 'perimeter-rect' as const, width: 3, height: 4, units: 'cm' as const, answer: 14 };
    expect(isAnswerCorrect(q, '14')).toBe(true);
    expect(isAnswerCorrect(q, '13')).toBe(false);
  });

  it('rejects empty input', () => {
    const q = { skill: 'count-sides' as const, shape: 'square' as const, units: 'cm' as const, answer: 4 };
    expect(isAnswerCorrect(q, '')).toBe(false);
    expect(isAnswerCorrect(q, '   ')).toBe(false);
  });

  it('numeric area-rect accepts the integer with or without unit suffix', () => {
    const q = {
      skill: 'area-rect' as const,
      width: 3,
      height: 4,
      units: 'cm' as const,
      answer: 12,
    };
    expect(isAnswerCorrect(q, '12')).toBe(true);
    expect(isAnswerCorrect(q, '12 cm²')).toBe(true);
    expect(isAnswerCorrect(q, '12 cm2')).toBe(true);
    expect(isAnswerCorrect(q, '12 sq cm')).toBe(true);
    expect(isAnswerCorrect(q, '13')).toBe(false);
  });
});

describe('SHAPE_SKILL_OPTIONS contains all eight v1 skills', () => {
  it('lists name-2d, count-sides, perimeter-rect, area-rect, area-tri, area-circle, circumference, angle-name', () => {
    expect(SHAPE_SKILL_OPTIONS).toEqual([
      'name-2d',
      'count-sides',
      'perimeter-rect',
      'area-rect',
      'area-tri',
      'area-circle',
      'circumference',
      'angle-name',
    ]);
  });
});

describe('unitsSquared', () => {
  it('appends the U+00B2 superscript-2 to the unit', () => {
    expect(unitsSquared('cm')).toBe('cm²');
    expect(unitsSquared('mm')).toBe('mm²');
    expect(unitsSquared('m')).toBe('m²');
    expect(unitsSquared('in')).toBe('in²');
  });

  it('² character code point is 0x00B2 (in WinAnsi)', () => {
    expect(unitsSquared('cm').charCodeAt(2)).toBe(0x00b2);
  });
});

describe('PI_APPROX', () => {
  it('uses 3.14 (the kid-arithmetic approximation)', () => {
    expect(PI_APPROX).toBe(3.14);
  });
});

describe('generateShapeQuestions — area-tri', () => {
  it('answer ≈ 0.5 * base * height (rounded to 2 dp)', () => {
    const qs = generateShapeQuestions(baseSettings({ skills: ['area-tri'] }), 100);
    qs.forEach(q => {
      expect(q.skill).toBe('area-tri');
      expect(q.width).toBeDefined();
      expect(q.height).toBeDefined();
      const expected = Math.round(0.5 * q.width! * q.height! * 100) / 100;
      expect(q.answer).toBeCloseTo(expected, 5);
    });
  });

  it('easy difficulty produces integer base and height', () => {
    const qs = generateShapeQuestions(
      baseSettings({ skills: ['area-tri'], difficulty: 'easy' }),
      80
    );
    qs.forEach(q => {
      expect(Number.isInteger(q.width)).toBe(true);
      expect(Number.isInteger(q.height)).toBe(true);
      expect(q.width!).toBeGreaterThanOrEqual(1);
      expect(q.width!).toBeLessThanOrEqual(10);
    });
  });

  it('medium difficulty may produce one-decimal dimensions', () => {
    const qs = generateShapeQuestions(
      baseSettings({ skills: ['area-tri'], difficulty: 'medium' }),
      200
    );
    const hasDecimal = qs.some(q => !Number.isInteger(q.width!) || !Number.isInteger(q.height!));
    // With 200 samples and ~90% non-integer probability per dimension this
    // is overwhelmingly likely; the test asserts the generator is capable
    // of producing decimals at all.
    expect(hasDecimal).toBe(true);
  });
});

describe('generateShapeQuestions — area-circle', () => {
  it('answer ≈ 3.14 * r²', () => {
    const qs = generateShapeQuestions(baseSettings({ skills: ['area-circle'] }), 100);
    qs.forEach(q => {
      expect(q.skill).toBe('area-circle');
      expect(q.radius).toBeDefined();
      const expected = Math.round(PI_APPROX * q.radius! * q.radius! * 100) / 100;
      expect(q.answer).toBeCloseTo(expected, 5);
    });
  });
});

describe('generateShapeQuestions — circumference', () => {
  it('answer ≈ 2 * 3.14 * r', () => {
    const qs = generateShapeQuestions(baseSettings({ skills: ['circumference'] }), 100);
    qs.forEach(q => {
      expect(q.skill).toBe('circumference');
      expect(q.radius).toBeDefined();
      const expected = Math.round(2 * PI_APPROX * q.radius! * 100) / 100;
      expect(q.answer).toBeCloseTo(expected, 5);
    });
  });
});

describe('generateShapeQuestions — angle-name', () => {
  it('category matches the angle range', () => {
    const qs = generateShapeQuestions(baseSettings({ skills: ['angle-name'] }), 300);
    qs.forEach(q => {
      expect(q.skill).toBe('angle-name');
      expect(q.category).toBeDefined();
      expect(q.angle).toBeDefined();
      if (q.category === 'right') {
        expect(q.angle).toBe(90);
      } else if (q.category === 'acute') {
        expect(q.angle!).toBeGreaterThan(0);
        expect(q.angle!).toBeLessThan(90);
      } else if (q.category === 'obtuse') {
        expect(q.angle!).toBeGreaterThan(90);
        expect(q.angle!).toBeLessThan(180);
      }
    });
  });

  it('all three categories appear over a large sample', () => {
    const qs = generateShapeQuestions(baseSettings({ skills: ['angle-name'] }), 300);
    const seen = new Set(qs.map(q => q.category));
    ANGLE_CATEGORIES.forEach((c: AngleCategory) => expect(seen.has(c)).toBe(true));
  });
});

describe('answerString — new skills', () => {
  it('area-tri appends squared units', () => {
    const q = {
      skill: 'area-tri' as const,
      width: 6,
      height: 4,
      units: 'cm' as const,
      answer: 12,
    };
    expect(answerString(q)).toBe('12 cm²');
  });

  it('area-circle appends squared units (decimal preserved)', () => {
    const q = {
      skill: 'area-circle' as const,
      radius: 3,
      units: 'cm' as const,
      answer: 28.26,
    };
    expect(answerString(q)).toBe('28.26 cm²');
  });

  it('circumference uses the linear unit', () => {
    const q = {
      skill: 'circumference' as const,
      radius: 5,
      units: 'm' as const,
      answer: 31.4,
    };
    expect(answerString(q)).toBe('31.4 m');
  });

  it('angle-name returns the category string', () => {
    const q = {
      skill: 'angle-name' as const,
      angle: 45,
      category: 'acute' as const,
      units: 'cm' as const,
      answer: 45,
    };
    expect(answerString(q)).toBe('acute');
  });

  it('whole-number area answers drop trailing zeros', () => {
    const q = {
      skill: 'area-tri' as const,
      width: 4,
      height: 5,
      units: 'cm' as const,
      answer: 10,
    };
    expect(answerString(q)).toBe('10 cm²');
  });
});

describe('isAnswerCorrect — new skills', () => {
  it('area-tri accepts a numeric answer with or without unit suffix', () => {
    const q = {
      skill: 'area-tri' as const,
      width: 6,
      height: 4,
      units: 'cm' as const,
      answer: 12,
    };
    expect(isAnswerCorrect(q, '12')).toBe(true);
    expect(isAnswerCorrect(q, '12 cm²')).toBe(true);
    expect(isAnswerCorrect(q, '12 cm2')).toBe(true);
    expect(isAnswerCorrect(q, '12 sq cm')).toBe(true);
    expect(isAnswerCorrect(q, '12 cm')).toBe(true);
    expect(isAnswerCorrect(q, '11')).toBe(false);
  });

  it('area-circle tolerates rounding error within 0.01', () => {
    const q = {
      skill: 'area-circle' as const,
      radius: 3,
      units: 'cm' as const,
      answer: 28.26,
    };
    expect(isAnswerCorrect(q, '28.26')).toBe(true);
    expect(isAnswerCorrect(q, '28.27')).toBe(true);
    expect(isAnswerCorrect(q, '28.25')).toBe(true);
    // 0.5 off — too far.
    expect(isAnswerCorrect(q, '28.76')).toBe(false);
  });

  it('circumference accepts decimal answer with or without unit', () => {
    const q = {
      skill: 'circumference' as const,
      radius: 5,
      units: 'cm' as const,
      answer: 31.4,
    };
    expect(isAnswerCorrect(q, '31.4')).toBe(true);
    expect(isAnswerCorrect(q, '31.4 cm')).toBe(true);
    expect(isAnswerCorrect(q, '30')).toBe(false);
  });

  it('angle-name accepts the category string case-insensitively', () => {
    const q = {
      skill: 'angle-name' as const,
      angle: 45,
      category: 'acute' as const,
      units: 'cm' as const,
      answer: 45,
    };
    expect(isAnswerCorrect(q, 'acute')).toBe(true);
    expect(isAnswerCorrect(q, 'ACUTE')).toBe(true);
    expect(isAnswerCorrect(q, '  Acute  ')).toBe(true);
    expect(isAnswerCorrect(q, 'right')).toBe(false);
    expect(isAnswerCorrect(q, 'obtuse')).toBe(false);
  });
});

describe('promptFor — new skills', () => {
  it('area-tri uses "Area?"', () => {
    const q = {
      skill: 'area-tri' as const,
      width: 1,
      height: 1,
      units: 'cm' as const,
      answer: 0.5,
    };
    expect(promptFor(q)).toBe('Area?');
  });

  it('area-circle prompt mentions 3.14 (no pi glyph)', () => {
    const q = {
      skill: 'area-circle' as const,
      radius: 1,
      units: 'cm' as const,
      answer: 3.14,
    };
    const p = promptFor(q);
    expect(p).toContain('Area?');
    expect(p).toContain('3.14');
    // No greek pi glyph — Helvetica WinAnsi can't render it.
    expect(p).not.toMatch(/π/);
  });

  it('circumference prompt mentions 3.14 (no pi glyph)', () => {
    const q = {
      skill: 'circumference' as const,
      radius: 1,
      units: 'cm' as const,
      answer: 6.28,
    };
    const p = promptFor(q);
    expect(p).toContain('Circumference?');
    expect(p).toContain('3.14');
    expect(p).not.toMatch(/π/);
  });

  it('angle-name uses "Angle?"', () => {
    const q = {
      skill: 'angle-name' as const,
      angle: 90,
      category: 'right' as const,
      units: 'cm' as const,
      answer: 90,
    };
    expect(promptFor(q)).toBe('Angle?');
  });
});
