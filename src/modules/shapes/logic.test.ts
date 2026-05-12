import { describe, it, expect } from 'vitest';
import {
  ANGLE_CATEGORIES,
  ANGLE_CATEGORIES_REFLEX,
  angleMeasureStepForDifficulty,
  answerString,
  categoriseAngleReflex,
  coordGridMaxForDifficulty,
  CURRICULUM_TAGS,
  generateShapeQuestions,
  isAnswerCorrect,
  maxDimensionForDifficulty,
  parseCoord,
  PI_APPROX,
  pickNameDistractors,
  pickSolidDistractors,
  promptFor,
  SHAPE_KIND_OPTIONS,
  SHAPE_LINES_OF_SYMMETRY,
  SHAPE_SIDE_COUNT,
  SHAPE_SKILL_OPTIONS,
  SOLID_EDGES,
  SOLID_FACES,
  SOLID_KIND_OPTIONS,
  SOLID_VERTICES,
  unitsSquared,
} from './logic';
import type {
  AngleCategory,
  ShapeDifficulty,
  ShapeSettings,
  ShapeSkill,
  ShapeUnits,
  SolidKind,
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

describe('SHAPE_SKILL_OPTIONS', () => {
  it('starts with the original v1 skills in canonical order', () => {
    // v1.1 freeze: the eight 2D skills must stay first and in this order
    // so old saved configs keep working.
    expect(SHAPE_SKILL_OPTIONS.slice(0, 8)).toEqual([
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

  it('extends with v3 Y5-coverage skills (no duplicates)', () => {
    expect(SHAPE_SKILL_OPTIONS).toContain('name-3d');
    expect(SHAPE_SKILL_OPTIONS).toContain('count-faces');
    expect(SHAPE_SKILL_OPTIONS).toContain('count-edges');
    expect(SHAPE_SKILL_OPTIONS).toContain('count-vertices');
    expect(SHAPE_SKILL_OPTIONS).toContain('angle-measure');
    expect(SHAPE_SKILL_OPTIONS).toContain('angle-name-reflex');
    expect(SHAPE_SKILL_OPTIONS).toContain('lines-of-symmetry');
    expect(SHAPE_SKILL_OPTIONS).toContain('coord-read');
    expect(SHAPE_SKILL_OPTIONS).toContain('coord-plot');
    expect(SHAPE_SKILL_OPTIONS).toContain('translation');
    // No duplicates.
    expect(new Set(SHAPE_SKILL_OPTIONS).size).toBe(SHAPE_SKILL_OPTIONS.length);
  });

  it('does NOT include volume-cube / volume-cuboid (those live in the conversions module)', () => {
    expect(SHAPE_SKILL_OPTIONS).not.toContain('volume-cube' as unknown as never);
    expect(SHAPE_SKILL_OPTIONS).not.toContain('volume-cuboid' as unknown as never);
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

// ---------------------------------------------------------------------------
// v3 (Y5) — 3D-solid skills, angle-measure, reflex, lines-of-symmetry,
// coords, translation.
// ---------------------------------------------------------------------------

describe('SOLID_FACES / SOLID_EDGES / SOLID_VERTICES', () => {
  it('cube and cuboid both have 6 faces / 12 edges / 8 vertices', () => {
    expect(SOLID_FACES.cube).toBe(6);
    expect(SOLID_FACES.cuboid).toBe(6);
    expect(SOLID_EDGES.cube).toBe(12);
    expect(SOLID_EDGES.cuboid).toBe(12);
    expect(SOLID_VERTICES.cube).toBe(8);
    expect(SOLID_VERTICES.cuboid).toBe(8);
  });

  it('cylinder: 3 faces, 2 edges, 0 vertices (KS2 convention)', () => {
    expect(SOLID_FACES.cylinder).toBe(3);
    expect(SOLID_EDGES.cylinder).toBe(2);
    expect(SOLID_VERTICES.cylinder).toBe(0);
  });

  it('sphere: 1 face, 0 edges, 0 vertices', () => {
    expect(SOLID_FACES.sphere).toBe(1);
    expect(SOLID_EDGES.sphere).toBe(0);
    expect(SOLID_VERTICES.sphere).toBe(0);
  });

  it('cone: 2 faces, 1 edge, 1 vertex', () => {
    expect(SOLID_FACES.cone).toBe(2);
    expect(SOLID_EDGES.cone).toBe(1);
    expect(SOLID_VERTICES.cone).toBe(1);
  });

  it('square-based pyramid: 5 faces, 8 edges, 5 vertices', () => {
    expect(SOLID_FACES.pyramid).toBe(5);
    expect(SOLID_EDGES.pyramid).toBe(8);
    expect(SOLID_VERTICES.pyramid).toBe(5);
  });
});

describe('generateShapeQuestions — 3D skills', () => {
  it('name-3d: each question has a valid solid', () => {
    const qs = generateShapeQuestions(baseSettings({ skills: ['name-3d'] }), 60);
    qs.forEach(q => {
      expect(q.skill).toBe('name-3d');
      expect(q.solid).toBeDefined();
      expect(SOLID_KIND_OPTIONS).toContain(q.solid!);
    });
  });

  it('count-faces / count-edges / count-vertices: answer matches the constant', () => {
    (['count-faces', 'count-edges', 'count-vertices'] as ShapeSkill[]).forEach(skill => {
      const qs = generateShapeQuestions(baseSettings({ skills: [skill] }), 60);
      const table =
        skill === 'count-faces' ? SOLID_FACES : skill === 'count-edges' ? SOLID_EDGES : SOLID_VERTICES;
      qs.forEach(q => {
        expect(q.skill).toBe(skill);
        expect(q.solid).toBeDefined();
        expect(q.answer).toBe(table[q.solid!]);
      });
    });
  });

  it('every solid appears over a large sample', () => {
    const qs = generateShapeQuestions(baseSettings({ skills: ['name-3d'] }), 600);
    const seen = new Set<SolidKind>(qs.map(q => q.solid!));
    SOLID_KIND_OPTIONS.forEach(s => expect(seen.has(s)).toBe(true));
  });
});

describe('generateShapeQuestions — angle-measure', () => {
  it.each<[ShapeDifficulty, number]>([
    ['easy', 30],
    ['medium', 10],
    ['hard', 5],
  ])('%s: every angle is a multiple of %i', (difficulty, step) => {
    const qs = generateShapeQuestions(baseSettings({ skills: ['angle-measure'], difficulty }), 100);
    qs.forEach(q => {
      expect(q.skill).toBe('angle-measure');
      expect(q.angle).toBeDefined();
      expect(q.angle! % step).toBe(0);
      expect(q.answer).toBe(q.angle);
    });
  });

  it('hard difficulty may produce reflex angles (>180°)', () => {
    const qs = generateShapeQuestions(baseSettings({ skills: ['angle-measure'], difficulty: 'hard' }), 200);
    const sawReflex = qs.some(q => (q.angle ?? 0) > 180);
    expect(sawReflex).toBe(true);
  });

  it('easy / medium stay non-reflex (≤180°)', () => {
    const easy = generateShapeQuestions(baseSettings({ skills: ['angle-measure'], difficulty: 'easy' }), 100);
    easy.forEach(q => expect(q.angle!).toBeLessThanOrEqual(180));
    const med = generateShapeQuestions(baseSettings({ skills: ['angle-measure'], difficulty: 'medium' }), 100);
    med.forEach(q => expect(q.angle!).toBeLessThanOrEqual(180));
  });
});

describe('generateShapeQuestions — angle-name-reflex', () => {
  it('category matches the angle range (including reflex)', () => {
    const qs = generateShapeQuestions(baseSettings({ skills: ['angle-name-reflex'] }), 300);
    qs.forEach(q => {
      expect(q.skill).toBe('angle-name-reflex');
      expect(q.category).toBeDefined();
      expect(q.angle).toBeDefined();
      if (q.category === 'right') expect(q.angle).toBe(90);
      else if (q.category === 'acute') {
        expect(q.angle!).toBeGreaterThan(0);
        expect(q.angle!).toBeLessThan(90);
      } else if (q.category === 'obtuse') {
        expect(q.angle!).toBeGreaterThan(90);
        expect(q.angle!).toBeLessThan(180);
      } else if (q.category === 'reflex') {
        expect(q.angle!).toBeGreaterThan(180);
        expect(q.angle!).toBeLessThan(360);
      }
    });
  });

  it('all four categories appear over a large sample', () => {
    const qs = generateShapeQuestions(baseSettings({ skills: ['angle-name-reflex'] }), 400);
    const seen = new Set(qs.map(q => q.category));
    ANGLE_CATEGORIES_REFLEX.forEach(c => expect(seen.has(c)).toBe(true));
  });
});

describe('generateShapeQuestions — lines-of-symmetry', () => {
  it('easy difficulty only picks from the simple-shape pool', () => {
    const qs = generateShapeQuestions(baseSettings({ skills: ['lines-of-symmetry'], difficulty: 'easy' }), 60);
    qs.forEach(q => {
      expect(['square', 'rectangle', 'triangle']).toContain(q.shape!);
    });
  });

  it('answer matches SHAPE_LINES_OF_SYMMETRY', () => {
    const qs = generateShapeQuestions(baseSettings({ skills: ['lines-of-symmetry'], difficulty: 'hard' }), 80);
    qs.forEach(q => {
      expect(q.shape).toBeDefined();
      expect(q.answer).toBe(SHAPE_LINES_OF_SYMMETRY[q.shape!]);
    });
  });

  it('hard difficulty includes octagons over a large sample', () => {
    const qs = generateShapeQuestions(baseSettings({ skills: ['lines-of-symmetry'], difficulty: 'hard' }), 300);
    expect(qs.some(q => q.shape === 'octagon')).toBe(true);
  });
});

describe('generateShapeQuestions — coord-read / coord-plot', () => {
  it('point is within the grid range for each difficulty', () => {
    (['easy', 'medium', 'hard'] as ShapeDifficulty[]).forEach(d => {
      const max = coordGridMaxForDifficulty(d);
      const qs = generateShapeQuestions(baseSettings({ skills: ['coord-read', 'coord-plot'], difficulty: d }), 60);
      qs.forEach(q => {
        expect(q.point).toBeDefined();
        expect(q.point!.x).toBeGreaterThanOrEqual(0);
        expect(q.point!.x).toBeLessThanOrEqual(max);
        expect(q.point!.y).toBeGreaterThanOrEqual(0);
        expect(q.point!.y).toBeLessThanOrEqual(max);
        expect(q.gridMax).toBe(max);
      });
    });
  });
});

describe('generateShapeQuestions — translation', () => {
  it('endpoint stays inside the grid', () => {
    (['easy', 'medium', 'hard'] as ShapeDifficulty[]).forEach(d => {
      const max = coordGridMaxForDifficulty(d);
      const qs = generateShapeQuestions(baseSettings({ skills: ['translation'], difficulty: d }), 60);
      qs.forEach(q => {
        expect(q.point).toBeDefined();
        expect(q.delta).toBeDefined();
        const ex = q.point!.x + q.delta!.dx;
        const ey = q.point!.y + q.delta!.dy;
        expect(ex).toBeGreaterThanOrEqual(0);
        expect(ex).toBeLessThanOrEqual(max);
        expect(ey).toBeGreaterThanOrEqual(0);
        expect(ey).toBeLessThanOrEqual(max);
      });
    });
  });

  it('delta is non-zero — the kid always moves at least one cell', () => {
    const qs = generateShapeQuestions(baseSettings({ skills: ['translation'] }), 60);
    qs.forEach(q => {
      expect(q.delta!.dx + q.delta!.dy).toBeGreaterThan(0);
    });
  });
});

describe('promptFor — v3 skills', () => {
  it('count-faces / count-edges / count-vertices', () => {
    expect(promptFor({ skill: 'count-faces', solid: 'cube', units: 'cm', answer: 6 })).toBe('Faces?');
    expect(promptFor({ skill: 'count-edges', solid: 'cube', units: 'cm', answer: 12 })).toBe('Edges?');
    expect(promptFor({ skill: 'count-vertices', solid: 'cube', units: 'cm', answer: 8 })).toBe('Vertices?');
  });

  it('angle-measure includes "degrees" word', () => {
    expect(promptFor({ skill: 'angle-measure', angle: 45, units: 'cm', answer: 45 })).toContain('degrees');
  });

  it('coord-plot prompt embeds the target coordinates', () => {
    expect(
      promptFor({ skill: 'coord-plot', point: { x: 3, y: 4 }, gridMax: 5, units: 'cm', answer: 304 })
    ).toBe('Plot (3, 4)');
  });

  it('translation prompt names the direction in words', () => {
    const p = promptFor({
      skill: 'translation',
      point: { x: 2, y: 3 },
      delta: { dx: 4, dy: 2 },
      gridMax: 10,
      units: 'cm',
      answer: 0,
    });
    expect(p).toContain('Translate (2, 3)');
    expect(p).toContain('4 right');
    expect(p).toContain('2 up');
  });
});

describe('answerString — v3 skills', () => {
  it('name-3d returns the solid name', () => {
    expect(answerString({ skill: 'name-3d', solid: 'pyramid', units: 'cm', answer: 0 })).toBe('pyramid');
  });

  it('count-faces returns just the number', () => {
    expect(answerString({ skill: 'count-faces', solid: 'cube', units: 'cm', answer: 6 })).toBe('6');
  });

  it('angle-measure appends ° (U+00B0, WinAnsi-safe)', () => {
    const s = answerString({ skill: 'angle-measure', angle: 45, units: 'cm', answer: 45 });
    expect(s).toBe('45°');
    expect(s.charCodeAt(2)).toBe(0x00b0);
  });

  it('angle-name-reflex returns the category', () => {
    expect(
      answerString({ skill: 'angle-name-reflex', angle: 270, category: 'reflex', units: 'cm', answer: 270 })
    ).toBe('reflex');
  });

  it('lines-of-symmetry returns the integer count', () => {
    expect(answerString({ skill: 'lines-of-symmetry', shape: 'square', units: 'cm', answer: 4 })).toBe('4');
  });

  it('coord-read returns "(x, y)"', () => {
    expect(
      answerString({ skill: 'coord-read', point: { x: 3, y: 4 }, gridMax: 5, units: 'cm', answer: 304 })
    ).toBe('(3, 4)');
  });

  it('translation returns the translated endpoint', () => {
    expect(
      answerString({
        skill: 'translation',
        point: { x: 2, y: 3 },
        delta: { dx: 4, dy: 2 },
        gridMax: 10,
        units: 'cm',
        answer: 0,
      })
    ).toBe('(6, 5)');
  });
});

describe('isAnswerCorrect — v3 skills', () => {
  it('name-3d matches solid name (case-insensitive)', () => {
    const q = { skill: 'name-3d' as const, solid: 'cylinder' as const, units: 'cm' as const, answer: 3 };
    expect(isAnswerCorrect(q, 'cylinder')).toBe(true);
    expect(isAnswerCorrect(q, '  CYLINDER ')).toBe(true);
    expect(isAnswerCorrect(q, 'cone')).toBe(false);
  });

  it('count-faces accepts the integer', () => {
    const q = { skill: 'count-faces' as const, solid: 'cube' as const, units: 'cm' as const, answer: 6 };
    expect(isAnswerCorrect(q, '6')).toBe(true);
    expect(isAnswerCorrect(q, '7')).toBe(false);
  });

  it('angle-measure tolerates ±2°', () => {
    const q = { skill: 'angle-measure' as const, angle: 45, units: 'cm' as const, answer: 45 };
    expect(isAnswerCorrect(q, '45')).toBe(true);
    expect(isAnswerCorrect(q, '43')).toBe(true);
    expect(isAnswerCorrect(q, '47')).toBe(true);
    expect(isAnswerCorrect(q, '48')).toBe(false);
    expect(isAnswerCorrect(q, '45°')).toBe(true);
  });

  it('angle-name-reflex matches the category', () => {
    const q = {
      skill: 'angle-name-reflex' as const,
      angle: 270,
      category: 'reflex' as const,
      units: 'cm' as const,
      answer: 270,
    };
    expect(isAnswerCorrect(q, 'reflex')).toBe(true);
    expect(isAnswerCorrect(q, 'Reflex')).toBe(true);
    expect(isAnswerCorrect(q, 'obtuse')).toBe(false);
  });

  it('lines-of-symmetry: integer compare', () => {
    const q = { skill: 'lines-of-symmetry' as const, shape: 'square' as const, units: 'cm' as const, answer: 4 };
    expect(isAnswerCorrect(q, '4')).toBe(true);
    expect(isAnswerCorrect(q, '3')).toBe(false);
  });

  it('coord-read accepts "x,y" with or without parens / spaces', () => {
    const q = {
      skill: 'coord-read' as const,
      point: { x: 3, y: 4 },
      gridMax: 5,
      units: 'cm' as const,
      answer: 304,
    };
    expect(isAnswerCorrect(q, '3,4')).toBe(true);
    expect(isAnswerCorrect(q, '3, 4')).toBe(true);
    expect(isAnswerCorrect(q, '(3, 4)')).toBe(true);
    expect(isAnswerCorrect(q, '4, 3')).toBe(false);
    expect(isAnswerCorrect(q, '3')).toBe(false);
  });

  it('coord-plot accepts the target point', () => {
    const q = {
      skill: 'coord-plot' as const,
      point: { x: 3, y: 4 },
      gridMax: 5,
      units: 'cm' as const,
      answer: 304,
    };
    expect(isAnswerCorrect(q, '3,4')).toBe(true);
    expect(isAnswerCorrect(q, '4,3')).toBe(false);
  });

  it('translation accepts the translated endpoint', () => {
    const q = {
      skill: 'translation' as const,
      point: { x: 2, y: 3 },
      delta: { dx: 4, dy: 2 },
      gridMax: 10,
      units: 'cm' as const,
      answer: 0,
    };
    expect(isAnswerCorrect(q, '6,5')).toBe(true);
    expect(isAnswerCorrect(q, '(6, 5)')).toBe(true);
    expect(isAnswerCorrect(q, '2,3')).toBe(false);
  });
});

describe('parseCoord', () => {
  it('parses plain "x,y"', () => {
    expect(parseCoord('3,4')).toEqual({ x: 3, y: 4 });
  });
  it('parses "(x, y)" with parens + space', () => {
    expect(parseCoord('(3, 4)')).toEqual({ x: 3, y: 4 });
  });
  it('returns null for non-integer values', () => {
    expect(parseCoord('3.5, 4')).toBeNull();
  });
  it('returns null for malformed input', () => {
    expect(parseCoord('3')).toBeNull();
    expect(parseCoord('')).toBeNull();
    expect(parseCoord('abc')).toBeNull();
  });
});

describe('pickSolidDistractors', () => {
  it('returns the requested number of distractors', () => {
    expect(pickSolidDistractors('cube', 3)).toHaveLength(3);
  });
  it('never includes the correct solid', () => {
    for (let i = 0; i < 30; i++) {
      const correct = SOLID_KIND_OPTIONS[i % SOLID_KIND_OPTIONS.length];
      expect(pickSolidDistractors(correct, 3)).not.toContain(correct);
    }
  });
});

describe('CURRICULUM_TAGS', () => {
  it('every skill has at least one tag', () => {
    SHAPE_SKILL_OPTIONS.forEach(s => {
      expect(Array.isArray(CURRICULUM_TAGS[s])).toBe(true);
      expect(CURRICULUM_TAGS[s].length).toBeGreaterThan(0);
    });
  });

  it('Y5 skills are tagged Y5', () => {
    expect(CURRICULUM_TAGS['name-3d']).toContain('Y5');
    expect(CURRICULUM_TAGS['angle-measure']).toContain('Y5');
    expect(CURRICULUM_TAGS['translation']).toContain('Y5');
  });
});

describe('angleMeasureStepForDifficulty', () => {
  it.each<[ShapeDifficulty, number]>([
    ['easy', 30],
    ['medium', 10],
    ['hard', 5],
  ])('%s -> %i', (d, n) => {
    expect(angleMeasureStepForDifficulty(d)).toBe(n);
  });
});

describe('coordGridMaxForDifficulty', () => {
  it.each<[ShapeDifficulty, number]>([
    ['easy', 5],
    ['medium', 10],
    ['hard', 20],
  ])('%s -> %i', (d, n) => {
    expect(coordGridMaxForDifficulty(d)).toBe(n);
  });
});

describe('categoriseAngleReflex', () => {
  it('classifies acute / right / obtuse / reflex', () => {
    expect(categoriseAngleReflex(45)).toBe('acute');
    expect(categoriseAngleReflex(90)).toBe('right');
    expect(categoriseAngleReflex(120)).toBe('obtuse');
    expect(categoriseAngleReflex(270)).toBe('reflex');
  });
});
