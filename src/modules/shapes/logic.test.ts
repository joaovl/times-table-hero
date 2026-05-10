import { describe, it, expect } from 'vitest';
import {
  answerString,
  generateShapeQuestions,
  isAnswerCorrect,
  maxDimensionForDifficulty,
  pickNameDistractors,
  promptFor,
  SHAPE_KIND_OPTIONS,
  SHAPE_SIDE_COUNT,
  SHAPE_SKILL_OPTIONS,
} from './logic';
import type { ShapeDifficulty, ShapeSettings, ShapeSkill, ShapeUnits } from './logic';

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

  it('area-rect appends units', () => {
    expect(
      answerString({ skill: 'area-rect', width: 3, height: 4, units: 'mm', answer: 12 })
    ).toBe('12 mm');
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
});
