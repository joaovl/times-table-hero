import { describe, it, expect } from 'vitest';
import {
  BOOL_SKILLS,
  CURRICULUM_TAGS,
  LIST_SKILLS,
  NUMBER_SKILLS,
  NUMBER_THEORY_DIFFICULTY_OPTIONS,
  NUMBER_THEORY_SKILL_LABEL,
  NUMBER_THEORY_SKILL_OPTIONS,
  answerString,
  commonFactorsOf,
  factorsOf,
  firstMultiples,
  generateNumberTheoryQuestions,
  isAnswerCorrect,
  isPrime,
  normaliseNumberList,
  promptFor,
  rangeFor,
} from './logic';
import type {
  NumberTheoryDifficulty,
  NumberTheoryQuestion,
  NumberTheorySettings,
  NumberTheorySkill,
} from './logic';

const baseSettings = (
  over: Partial<NumberTheorySettings>
): NumberTheorySettings => ({
  skills: ['factors'],
  difficulty: 'easy',
  gameMode: 'questions',
  questionCount: 10,
  timeLimit: 60,
  ...over,
});

describe('skill registry', () => {
  it('lists every skill in canonical order', () => {
    expect(NUMBER_THEORY_SKILL_OPTIONS).toEqual([
      'factors',
      'factor-pair',
      'multiples',
      'is-multiple',
      'prime-recognize',
      'prime-list-19',
      'square',
      'cube',
      'common-factor',
      'square-root',
    ]);
  });

  it('every skill has a label', () => {
    NUMBER_THEORY_SKILL_OPTIONS.forEach(s => {
      expect(NUMBER_THEORY_SKILL_LABEL[s]).toBeTruthy();
    });
  });

  it('LIST_SKILLS, BOOL_SKILLS, NUMBER_SKILLS partition the skill set', () => {
    const all = new Set<NumberTheorySkill>([
      ...LIST_SKILLS,
      ...BOOL_SKILLS,
      ...NUMBER_SKILLS,
    ]);
    expect(all.size).toBe(NUMBER_THEORY_SKILL_OPTIONS.length);
    NUMBER_THEORY_SKILL_OPTIONS.forEach(s => expect(all.has(s)).toBe(true));
  });
});

describe('CURRICULUM_TAGS', () => {
  it('mentions Y4 and Y5 coverage', () => {
    const joined = CURRICULUM_TAGS.join('\n');
    expect(joined).toMatch(/Y4/);
    expect(joined).toMatch(/Y5/);
  });

  it('covers factors, multiples, primes, squares, and cubes', () => {
    const joined = CURRICULUM_TAGS.join('\n').toLowerCase();
    expect(joined).toMatch(/factor/);
    expect(joined).toMatch(/multiple/);
    expect(joined).toMatch(/prime/);
    expect(joined).toMatch(/square/);
    expect(joined).toMatch(/cube/);
  });
});

describe('factorsOf', () => {
  it('factors of 24 = 1,2,3,4,6,8,12,24', () => {
    expect(factorsOf(24)).toEqual([1, 2, 3, 4, 6, 8, 12, 24]);
  });

  it('factors of 1 = [1]', () => {
    expect(factorsOf(1)).toEqual([1]);
  });

  it('factors of primes are 1 and themselves', () => {
    expect(factorsOf(7)).toEqual([1, 7]);
    expect(factorsOf(13)).toEqual([1, 13]);
  });

  it('factors of 36 includes 6 once (perfect-square edge)', () => {
    expect(factorsOf(36)).toEqual([1, 2, 3, 4, 6, 9, 12, 18, 36]);
  });

  it('returns [] for 0 or negative', () => {
    expect(factorsOf(0)).toEqual([]);
    expect(factorsOf(-5)).toEqual([]);
  });
});

describe('commonFactorsOf', () => {
  it('common factors of 12 and 18 = [1,2,3,6]', () => {
    expect(commonFactorsOf(12, 18)).toEqual([1, 2, 3, 6]);
  });

  it('common factors of coprime numbers = [1]', () => {
    expect(commonFactorsOf(8, 9)).toEqual([1]);
  });

  it('commutes', () => {
    expect(commonFactorsOf(20, 30)).toEqual(commonFactorsOf(30, 20));
  });
});

describe('isPrime', () => {
  it.each([
    [2, true],
    [3, true],
    [5, true],
    [7, true],
    [11, true],
    [13, true],
    [17, true],
    [19, true],
    [97, true],
  ])('isPrime(%i) === %s', (n, expected) => {
    expect(isPrime(n)).toBe(expected);
  });

  it.each([
    [0, false],
    [1, false],
    [4, false],
    [9, false],
    [15, false],
    [21, false],
    [25, false],
    [100, false],
  ])('isPrime(%i) === %s', (n, expected) => {
    expect(isPrime(n)).toBe(expected);
  });
});

describe('firstMultiples', () => {
  it('first 5 multiples of 7 = 7,14,21,28,35', () => {
    expect(firstMultiples(7, 5)).toEqual([7, 14, 21, 28, 35]);
  });

  it('first 3 multiples of 12 = 12,24,36', () => {
    expect(firstMultiples(12, 3)).toEqual([12, 24, 36]);
  });
});

describe('rangeFor', () => {
  it('factors easy caps at 24; hard caps at 100', () => {
    expect(rangeFor('factors', 'easy').max).toBeLessThanOrEqual(24);
    expect(rangeFor('factors', 'hard').max).toBeLessThanOrEqual(100);
  });

  it('prime ranges respect "primes ≤ 19" for easy and "primes ≤ 100" for hard', () => {
    expect(rangeFor('prime-recognize', 'easy').max).toBeLessThanOrEqual(19);
    expect(rangeFor('prime-recognize', 'hard').max).toBeLessThanOrEqual(100);
    expect(rangeFor('prime-list-19', 'easy').max).toBeLessThanOrEqual(19);
  });

  it('squares hard caps at 15', () => {
    expect(rangeFor('square', 'hard').max).toBe(15);
  });

  it('cubes hard caps at 10', () => {
    expect(rangeFor('cube', 'hard').max).toBeLessThanOrEqual(10);
  });
});

describe('generateNumberTheoryQuestions — count', () => {
  it('returns the requested count', () => {
    const qs = generateNumberTheoryQuestions(baseSettings({}), 25);
    expect(qs).toHaveLength(25);
  });

  it('returns 0 when asked for 0', () => {
    expect(generateNumberTheoryQuestions(baseSettings({}), 0)).toHaveLength(0);
  });
});

describe('generateNumberTheoryQuestions — factors', () => {
  it('answer is always the canonical sorted factor list', () => {
    const qs = generateNumberTheoryQuestions(
      baseSettings({ skills: ['factors'], difficulty: 'hard' }),
      80
    );
    qs.forEach(q => {
      expect(q.skill).toBe('factors');
      if (q.skill === 'factors') {
        expect(q.answer).toEqual(factorsOf(q.n));
      }
    });
  });

  it('easy difficulty keeps n ≤ 24', () => {
    const qs = generateNumberTheoryQuestions(
      baseSettings({ skills: ['factors'], difficulty: 'easy' }),
      40
    );
    qs.forEach(q => {
      if (q.skill === 'factors') {
        expect(q.n).toBeGreaterThanOrEqual(1);
        expect(q.n).toBeLessThanOrEqual(24);
      }
    });
  });
});

describe('generateNumberTheoryQuestions — multiples', () => {
  it('produces ascending first-N multiples', () => {
    const qs = generateNumberTheoryQuestions(
      baseSettings({ skills: ['multiples'] }),
      30
    );
    qs.forEach(q => {
      if (q.skill === 'multiples') {
        expect(q.answer).toEqual(firstMultiples(q.base, q.count));
        expect(q.count).toBeGreaterThanOrEqual(4);
      }
    });
  });
});

describe('generateNumberTheoryQuestions — factor-pair', () => {
  it('answer reflects n % m === 0', () => {
    const qs = generateNumberTheoryQuestions(
      baseSettings({ skills: ['factor-pair'] }),
      50
    );
    qs.forEach(q => {
      if (q.skill === 'factor-pair') {
        expect(q.answer).toBe(q.n % q.m === 0);
      }
    });
  });

  it('both yes and no outcomes appear over a large sample', () => {
    const qs = generateNumberTheoryQuestions(
      baseSettings({ skills: ['factor-pair'] }),
      200
    );
    const yes = qs.filter(q => q.skill === 'factor-pair' && q.answer);
    const no = qs.filter(q => q.skill === 'factor-pair' && !q.answer);
    expect(yes.length).toBeGreaterThan(0);
    expect(no.length).toBeGreaterThan(0);
  });
});

describe('generateNumberTheoryQuestions — is-multiple', () => {
  it('answer reflects n % m === 0', () => {
    const qs = generateNumberTheoryQuestions(
      baseSettings({ skills: ['is-multiple'] }),
      50
    );
    qs.forEach(q => {
      if (q.skill === 'is-multiple') {
        expect(q.answer).toBe(q.n % q.m === 0);
      }
    });
  });
});

describe('generateNumberTheoryQuestions — prime-recognize', () => {
  it('answer matches isPrime(n)', () => {
    const qs = generateNumberTheoryQuestions(
      baseSettings({ skills: ['prime-recognize'], difficulty: 'medium' }),
      60
    );
    qs.forEach(q => {
      if (q.skill === 'prime-recognize') expect(q.answer).toBe(isPrime(q.n));
    });
  });
});

describe('generateNumberTheoryQuestions — prime-list-19', () => {
  it('candidates contain exactly 5 numbers', () => {
    const qs = generateNumberTheoryQuestions(
      baseSettings({ skills: ['prime-list-19'], difficulty: 'medium' }),
      30
    );
    qs.forEach(q => {
      if (q.skill === 'prime-list-19') {
        expect(q.candidates).toHaveLength(5);
      }
    });
  });

  it('answer is the sorted list of primes inside candidates', () => {
    const qs = generateNumberTheoryQuestions(
      baseSettings({ skills: ['prime-list-19'], difficulty: 'medium' }),
      30
    );
    qs.forEach(q => {
      if (q.skill === 'prime-list-19') {
        const expected = q.candidates.filter(c => isPrime(c)).sort((a, b) => a - b);
        expect(q.answer).toEqual(expected);
      }
    });
  });

  it('easy difficulty restricts candidates to ≤ 19', () => {
    const qs = generateNumberTheoryQuestions(
      baseSettings({ skills: ['prime-list-19'], difficulty: 'easy' }),
      40
    );
    qs.forEach(q => {
      if (q.skill === 'prime-list-19') {
        q.candidates.forEach(c => expect(c).toBeLessThanOrEqual(19));
      }
    });
  });
});

describe('generateNumberTheoryQuestions — square / cube', () => {
  it('square answer = base²', () => {
    const qs = generateNumberTheoryQuestions(
      baseSettings({ skills: ['square'] }),
      40
    );
    qs.forEach(q => {
      if (q.skill === 'square') expect(q.answer).toBe(q.base * q.base);
    });
  });

  it('cube answer = base³', () => {
    const qs = generateNumberTheoryQuestions(
      baseSettings({ skills: ['cube'] }),
      40
    );
    qs.forEach(q => {
      if (q.skill === 'cube') expect(q.answer).toBe(q.base * q.base * q.base);
    });
  });

  it('hard square caps base at 15, hard cube caps base at 10', () => {
    const sq = generateNumberTheoryQuestions(
      baseSettings({ skills: ['square'], difficulty: 'hard' }),
      40
    );
    const cb = generateNumberTheoryQuestions(
      baseSettings({ skills: ['cube'], difficulty: 'hard' }),
      40
    );
    sq.forEach(q => {
      if (q.skill === 'square') expect(q.base).toBeLessThanOrEqual(15);
    });
    cb.forEach(q => {
      if (q.skill === 'cube') expect(q.base).toBeLessThanOrEqual(10);
    });
  });
});

describe('generateNumberTheoryQuestions — common-factor', () => {
  it('answer is the sorted list of shared divisors', () => {
    const qs = generateNumberTheoryQuestions(
      baseSettings({ skills: ['common-factor'] }),
      40
    );
    qs.forEach(q => {
      if (q.skill === 'common-factor') {
        expect(q.answer).toEqual(commonFactorsOf(q.n, q.m));
        expect(q.n).not.toBe(q.m);
      }
    });
  });

  it('answer always contains 1', () => {
    const qs = generateNumberTheoryQuestions(
      baseSettings({ skills: ['common-factor'] }),
      30
    );
    qs.forEach(q => {
      if (q.skill === 'common-factor') expect(q.answer[0]).toBe(1);
    });
  });
});

describe('generateNumberTheoryQuestions — square-root', () => {
  it('radicand is a perfect square; answer is its root', () => {
    const qs = generateNumberTheoryQuestions(
      baseSettings({ skills: ['square-root'] }),
      40
    );
    qs.forEach(q => {
      if (q.skill === 'square-root') {
        expect(q.base).toBe(q.answer * q.answer);
      }
    });
  });
});

describe('generateNumberTheoryQuestions — empty/default fallback', () => {
  it('empty skill set falls back to factors', () => {
    const qs = generateNumberTheoryQuestions(baseSettings({ skills: [] }), 5);
    expect(qs).toHaveLength(5);
    qs.forEach(q => expect(q.skill).toBe('factors'));
  });
});

describe('generateNumberTheoryQuestions — mixed skill set', () => {
  it('every selected skill appears over a large sample', () => {
    const allSkills: NumberTheorySkill[] = [...NUMBER_THEORY_SKILL_OPTIONS];
    const qs = generateNumberTheoryQuestions(
      baseSettings({ skills: allSkills }),
      400
    );
    const seen = new Set(qs.map(q => q.skill));
    allSkills.forEach(s => expect(seen.has(s)).toBe(true));
  });
});

describe('normaliseNumberList', () => {
  it('handles a clean comma-separated list', () => {
    expect(normaliseNumberList('1, 2, 3, 4')).toEqual([1, 2, 3, 4]);
  });

  it('sorts ascending', () => {
    expect(normaliseNumberList('4, 1, 3, 2')).toEqual([1, 2, 3, 4]);
  });

  it('dedupes', () => {
    expect(normaliseNumberList('2, 2, 3, 3, 3')).toEqual([2, 3]);
  });

  it('ignores extra whitespace and semicolons', () => {
    expect(normaliseNumberList('  1 ; 2,, 3 ; ;  4 ')).toEqual([1, 2, 3, 4]);
  });

  it('returns [] for empty / whitespace-only input', () => {
    expect(normaliseNumberList('')).toEqual([]);
    expect(normaliseNumberList('   ')).toEqual([]);
  });

  it('returns null when any token is non-numeric', () => {
    expect(normaliseNumberList('1, two, 3')).toBeNull();
    expect(normaliseNumberList('1.5, 2')).toBeNull();
  });
});

describe('isAnswerCorrect — list skills', () => {
  const q: NumberTheoryQuestion = {
    skill: 'factors',
    n: 24,
    answer: [1, 2, 3, 4, 6, 8, 12, 24],
  };

  it('accepts the canonical sorted list', () => {
    expect(isAnswerCorrect(q, '1, 2, 3, 4, 6, 8, 12, 24')).toBe(true);
  });

  it('accepts an unsorted list (normaliser sorts)', () => {
    expect(isAnswerCorrect(q, '24, 1, 12, 2, 8, 3, 6, 4')).toBe(true);
  });

  it('accepts a list with duplicates', () => {
    expect(isAnswerCorrect(q, '1, 1, 2, 3, 4, 6, 8, 12, 24')).toBe(true);
  });

  it('rejects a missing factor', () => {
    expect(isAnswerCorrect(q, '1, 2, 3, 4, 6, 12, 24')).toBe(false);
  });

  it('rejects a non-factor', () => {
    expect(isAnswerCorrect(q, '1, 2, 3, 4, 5, 6, 8, 12, 24')).toBe(false);
  });
});

describe('isAnswerCorrect — boolean skills', () => {
  const q: NumberTheoryQuestion = {
    skill: 'prime-recognize',
    n: 13,
    answer: true,
  };

  it('matches the chosen yes flag', () => {
    expect(isAnswerCorrect(q, '', true)).toBe(true);
    expect(isAnswerCorrect(q, '', false)).toBe(false);
  });

  it('typed value is ignored for boolean skills', () => {
    expect(isAnswerCorrect(q, 'whatever', true)).toBe(true);
  });
});

describe('isAnswerCorrect — single-number skills', () => {
  it('square 5² = 25', () => {
    const q: NumberTheoryQuestion = { skill: 'square', base: 5, answer: 25 };
    expect(isAnswerCorrect(q, '25')).toBe(true);
    expect(isAnswerCorrect(q, '  25  ')).toBe(true);
    expect(isAnswerCorrect(q, '24')).toBe(false);
  });

  it('cube 3³ = 27', () => {
    const q: NumberTheoryQuestion = { skill: 'cube', base: 3, answer: 27 };
    expect(isAnswerCorrect(q, '27')).toBe(true);
    expect(isAnswerCorrect(q, '9')).toBe(false);
  });

  it('square-root sqrt(49) = 7', () => {
    const q: NumberTheoryQuestion = { skill: 'square-root', base: 49, answer: 7 };
    expect(isAnswerCorrect(q, '7')).toBe(true);
    expect(isAnswerCorrect(q, '49')).toBe(false);
  });

  it('rejects empty input', () => {
    const q: NumberTheoryQuestion = { skill: 'square', base: 5, answer: 25 };
    expect(isAnswerCorrect(q, '')).toBe(false);
  });
});

describe('promptFor', () => {
  it('factors uses "Factors of N?"', () => {
    expect(promptFor({ skill: 'factors', n: 24, answer: [1] })).toBe(
      'Factors of 24?'
    );
  });

  it('common-factor mentions both numbers', () => {
    expect(
      promptFor({ skill: 'common-factor', n: 12, m: 18, answer: [1] })
    ).toContain('12 and 18');
  });

  it('square uses the U+00B2 glyph', () => {
    const p = promptFor({ skill: 'square', base: 5, answer: 25 });
    expect(p).toContain('5²');
  });

  it('cube uses the U+00B3 glyph', () => {
    const p = promptFor({ skill: 'cube', base: 3, answer: 27 });
    expect(p).toContain('3³');
  });

  it('square-root prompt uses literal "sqrt(N)" (no √ glyph)', () => {
    const p = promptFor({ skill: 'square-root', base: 49, answer: 7 });
    expect(p).toContain('sqrt(49)');
    expect(p).not.toMatch(/√/);
  });

  it('boolean prompts include "yes/no" semantics in some form', () => {
    expect(promptFor({ skill: 'prime-recognize', n: 13, answer: true })).toMatch(
      /prime/i
    );
    expect(
      promptFor({ skill: 'factor-pair', n: 24, m: 6, answer: true })
    ).toMatch(/factor/i);
    expect(
      promptFor({ skill: 'is-multiple', n: 35, m: 5, answer: true })
    ).toMatch(/multiple/i);
  });
});

describe('answerString', () => {
  it('factors join with comma+space', () => {
    expect(
      answerString({ skill: 'factors', n: 24, answer: [1, 2, 3, 4, 6, 8, 12, 24] })
    ).toBe('1, 2, 3, 4, 6, 8, 12, 24');
  });

  it('boolean yields "yes" or "no"', () => {
    expect(
      answerString({ skill: 'prime-recognize', n: 7, answer: true })
    ).toBe('yes');
    expect(
      answerString({ skill: 'prime-recognize', n: 8, answer: false })
    ).toBe('no');
  });

  it('square / cube / square-root yield bare number', () => {
    expect(answerString({ skill: 'square', base: 5, answer: 25 })).toBe('25');
    expect(answerString({ skill: 'cube', base: 3, answer: 27 })).toBe('27');
    expect(answerString({ skill: 'square-root', base: 49, answer: 7 })).toBe('7');
  });

  it('prime-list-19 with no primes says "none"', () => {
    expect(
      answerString({
        skill: 'prime-list-19',
        candidates: [4, 6, 8, 9, 10],
        answer: [],
      })
    ).toBe('none');
  });
});

describe('difficulty options exposed', () => {
  it('lists easy, medium, hard', () => {
    expect([...NUMBER_THEORY_DIFFICULTY_OPTIONS]).toEqual<NumberTheoryDifficulty[]>([
      'easy',
      'medium',
      'hard',
    ]);
  });
});
