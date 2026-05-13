import { describe, it, expect } from 'vitest';
import {
  ALL_SKILLS,
  SKILL_LABELS,
  CURRICULUM_TAGS,
  answerText,
  checkRatioAnswer,
  generateRatioQuestions,
  isPercentOfQuestion,
  isScaleFactorQuestion,
  isRatioShareQuestion,
  isRatioSimplifyQuestion,
  isRatioEquivalentQuestion,
  parseRatio,
  parseShareAnswer,
  questionPromptText,
} from './logic';
import type { RatioSettings } from './logic';

const baseSettings = (over: Partial<RatioSettings> = {}): RatioSettings => ({
  skills: ['percent-of'],
  difficulty: 'medium',
  gameMode: 'questions',
  questionCount: 10,
  timeLimit: 60,
  ...over,
});

describe('ALL_SKILLS / SKILL_LABELS', () => {
  it('has the 5 required Y6 skills', () => {
    expect(ALL_SKILLS).toEqual([
      'percent-of',
      'scale-factor',
      'ratio-share',
      'ratio-simplify',
      'ratio-equivalent',
    ]);
  });

  it('every skill has a label', () => {
    ALL_SKILLS.forEach(s => {
      expect(SKILL_LABELS[s]).toBeDefined();
      expect(SKILL_LABELS[s].length).toBeGreaterThan(0);
    });
  });
});

describe('CURRICULUM_TAGS', () => {
  it('every skill has at least one Y6 entry', () => {
    ALL_SKILLS.forEach(s => {
      const tags = CURRICULUM_TAGS[s];
      expect(tags.length).toBeGreaterThanOrEqual(1);
      expect(tags.every(t => t.year === 6)).toBe(true);
      expect(tags.every(t => t.objective.length > 10)).toBe(true);
    });
  });
});

describe('generateRatioQuestions — count', () => {
  it('returns the requested number of questions', () => {
    const qs = generateRatioQuestions(baseSettings(), 25);
    expect(qs).toHaveLength(25);
  });

  it('only emits requested skills', () => {
    const qs = generateRatioQuestions(
      baseSettings({ skills: ['percent-of', 'ratio-simplify'] }),
      100
    );
    qs.forEach(q => {
      expect(['percent-of', 'ratio-simplify']).toContain(q.skill);
    });
  });

  it('mixing all 5 skills emits every skill in 500 picks', () => {
    const qs = generateRatioQuestions(baseSettings({ skills: ALL_SKILLS }), 500);
    const observed = new Set(qs.map(q => q.skill));
    ALL_SKILLS.forEach(s =>
      expect(observed.has(s), `${s} never emitted in 500 samples`).toBe(true)
    );
  });
});

describe('percent-of', () => {
  it('answer = percent * whole / 100, integer', () => {
    const qs = generateRatioQuestions(baseSettings({ skills: ['percent-of'], difficulty: 'medium' }), 80);
    qs.forEach(q => {
      if (!isPercentOfQuestion(q)) throw new Error('wrong shape');
      expect(q.percent).toBeGreaterThanOrEqual(1);
      expect(q.percent).toBeLessThanOrEqual(100);
      expect(q.whole).toBeGreaterThan(0);
      expect(q.answer).toBe((q.percent * q.whole) / 100);
      expect(Number.isInteger(q.answer)).toBe(true);
    });
  });

  it('easy uses friendly percents (10/25/50/75)', () => {
    const qs = generateRatioQuestions(baseSettings({ skills: ['percent-of'], difficulty: 'easy' }), 30);
    qs.forEach(q => {
      if (!isPercentOfQuestion(q)) throw new Error('wrong shape');
      expect([10, 25, 50, 75]).toContain(q.percent);
    });
  });

  it('prompt + answer round-trip via checkRatioAnswer', () => {
    const qs = generateRatioQuestions(baseSettings({ skills: ['percent-of'] }), 40);
    qs.forEach(q => {
      expect(checkRatioAnswer(q, String(q.answer))).toBe(true);
    });
  });
});

describe('scale-factor', () => {
  it('answer = length * factor', () => {
    const qs = generateRatioQuestions(baseSettings({ skills: ['scale-factor'] }), 40);
    qs.forEach(q => {
      if (!isScaleFactorQuestion(q)) throw new Error('wrong shape');
      expect(q.factor).toBeGreaterThanOrEqual(2);
      expect(q.length).toBeGreaterThan(0);
      expect(q.answer).toBe(q.length * q.factor);
    });
  });
});

describe('ratio-share', () => {
  it('shares sum to total; parts are integer', () => {
    const qs = generateRatioQuestions(baseSettings({ skills: ['ratio-share'] }), 40);
    qs.forEach(q => {
      if (!isRatioShareQuestion(q)) throw new Error('wrong shape');
      expect(q.answer[0] + q.answer[1]).toBe(q.total);
      expect(Number.isInteger(q.answer[0])).toBe(true);
      expect(Number.isInteger(q.answer[1])).toBe(true);
      expect(q.a).toBeGreaterThan(0);
      expect(q.b).toBeGreaterThan(0);
      expect(q.a).not.toBe(q.b);
    });
  });

  it('shares are in the requested ratio', () => {
    const qs = generateRatioQuestions(baseSettings({ skills: ['ratio-share'] }), 40);
    qs.forEach(q => {
      if (!isRatioShareQuestion(q)) throw new Error('wrong shape');
      // q.answer[0]/q.answer[1] == q.a/q.b  (cross-multiplication)
      expect(q.answer[0] * q.b).toBe(q.answer[1] * q.a);
    });
  });

  it('checkRatioAnswer accepts "X and Y" form', () => {
    const qs = generateRatioQuestions(baseSettings({ skills: ['ratio-share'] }), 20);
    qs.forEach(q => {
      if (!isRatioShareQuestion(q)) throw new Error('wrong shape');
      expect(checkRatioAnswer(q, `${q.answer[0]} and ${q.answer[1]}`)).toBe(true);
      expect(checkRatioAnswer(q, `${q.answer[0]}, ${q.answer[1]}`)).toBe(true);
      // Wrong order rejected.
      expect(checkRatioAnswer(q, `${q.answer[1]} and ${q.answer[0]}`)).toBe(false);
    });
  });
});

describe('ratio-simplify', () => {
  it('answer ratio is in simplest form (gcd = 1)', () => {
    const qs = generateRatioQuestions(baseSettings({ skills: ['ratio-simplify'] }), 40);
    qs.forEach(q => {
      if (!isRatioSimplifyQuestion(q)) throw new Error('wrong shape');
      // gcd(answer[0], answer[1]) === 1
      let x = q.answer[0];
      let y = q.answer[1];
      while (y !== 0) {
        const t = y;
        y = x % y;
        x = t;
      }
      expect(x).toBe(1);
    });
  });

  it('answer * scale = (left, right) for some integer scale', () => {
    const qs = generateRatioQuestions(baseSettings({ skills: ['ratio-simplify'] }), 30);
    qs.forEach(q => {
      if (!isRatioSimplifyQuestion(q)) throw new Error('wrong shape');
      expect(q.left % q.answer[0]).toBe(0);
      expect(q.right % q.answer[1]).toBe(0);
      const k1 = q.left / q.answer[0];
      const k2 = q.right / q.answer[1];
      expect(k1).toBe(k2);
    });
  });

  it('checkRatioAnswer accepts the canonical "a:b" form', () => {
    const qs = generateRatioQuestions(baseSettings({ skills: ['ratio-simplify'] }), 20);
    qs.forEach(q => {
      if (!isRatioSimplifyQuestion(q)) throw new Error('wrong shape');
      expect(checkRatioAnswer(q, `${q.answer[0]}:${q.answer[1]}`)).toBe(true);
      // Equivalent non-simplified should also pass because simplify(input) == canonical.
      const scaled = `${q.answer[0] * 2}:${q.answer[1] * 2}`;
      expect(checkRatioAnswer(q, scaled)).toBe(true);
      // Wrong: a non-matching ratio.
      expect(checkRatioAnswer(q, `${q.answer[0] + 1}:${q.answer[1]}`)).toBe(false);
    });
  });
});

describe('ratio-equivalent', () => {
  it('answer is consistent with the base ratio a:b', () => {
    const qs = generateRatioQuestions(baseSettings({ skills: ['ratio-equivalent'] }), 40);
    qs.forEach(q => {
      if (!isRatioEquivalentQuestion(q)) throw new Error('wrong shape');
      // For "a:b = given:?" the answer = b*given/a.
      // For "a:b = ?:given" the answer = a*given/b.
      // Either way, a*answer == b*given OR a*given == b*answer respectively.
      if (q.missing === 'right') {
        expect(q.a * q.answer).toBe(q.b * q.given);
      } else {
        expect(q.b * q.answer).toBe(q.a * q.given);
      }
    });
  });
});

describe('parseRatio / parseShareAnswer', () => {
  it('parseRatio accepts "a:b" and rejects malformed', () => {
    expect(parseRatio('2:3')).toEqual({ a: 2, b: 3 });
    expect(parseRatio(' 12 : 18 ')).toEqual({ a: 12, b: 18 });
    expect(parseRatio('foo')).toBeNull();
    expect(parseRatio('2')).toBeNull();
    expect(parseRatio('2:3:4')).toBeNull();
    expect(parseRatio('-2:3')).toBeNull();
  });

  it('parseShareAnswer accepts "X and Y", "X, Y", "X Y", with currency prefixes', () => {
    expect(parseShareAnswer('15 and 25')).toEqual([15, 25]);
    expect(parseShareAnswer('15, 25')).toEqual([15, 25]);
    expect(parseShareAnswer('15 25')).toEqual([15, 25]);
    expect(parseShareAnswer('£15 and £25')).toEqual([15, 25]);
    expect(parseShareAnswer('foo')).toBeNull();
    expect(parseShareAnswer('')).toBeNull();
  });
});

describe('questionPromptText / answerText round-trip', () => {
  it('canonical answer always validates', () => {
    const settings = baseSettings({ skills: ALL_SKILLS, difficulty: 'medium' });
    const qs = generateRatioQuestions(settings, 200);
    qs.forEach(q => {
      expect(checkRatioAnswer(q, answerText(q)), `${q.skill} rejected: ${answerText(q)}`).toBe(true);
    });
  });

  it('prompts contain WinAnsi-safe characters only', () => {
    const qs = generateRatioQuestions(baseSettings({ skills: ALL_SKILLS, difficulty: 'hard' }), 100);
    const MATH_OPERATORS = /[∀-⋿−]/u;
    qs.forEach(q => {
      const text = questionPromptText(q);
      expect(MATH_OPERATORS.test(text), `unsafe char in "${text}"`).toBe(false);
    });
  });
});

describe('checkRatioAnswer — rejections', () => {
  it('rejects empty / non-matching input', () => {
    const q = { skill: 'percent-of' as const, percent: 15, whole: 80, answer: 12 };
    expect(checkRatioAnswer(q, '')).toBe(false);
    expect(checkRatioAnswer(q, '  ')).toBe(false);
    expect(checkRatioAnswer(q, '13')).toBe(false);
    expect(checkRatioAnswer(q, '12.5')).toBe(false);
  });
});
