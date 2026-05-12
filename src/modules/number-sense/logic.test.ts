import { describe, it, expect } from 'vitest';
import {
  toRoman,
  fromRoman,
  generateNumberSenseQuestions,
  checkNumberSenseAnswer,
  parseSequenceAnswer,
  answerText,
  questionPromptText,
  isPlaceValueQuestion,
  isRoundQuestion,
  isSequenceQuestion,
  isRomanQuestion,
  isOrderQuestion,
  ALL_SKILLS,
  CURRICULUM_TAGS,
} from './logic';
import type {
  NumberSenseSettings,
  NumberSenseSkill,
  NumberSenseQuestion,
  NumberSensePlaceValueQuestion,
  NumberSenseRoundQuestion,
  NumberSenseSequenceQuestion,
  NumberSenseRomanQuestion,
  NumberSenseOrderQuestion,
} from './logic';

const baseSettings = (over: Partial<NumberSenseSettings>): NumberSenseSettings => ({
  skills: ['place-value-3d'],
  difficulty: 'easy',
  gameMode: 'questions',
  questionCount: 10,
  timeLimit: 60,
  ...over,
});

describe('CURRICULUM_TAGS', () => {
  it('has at least one entry for every skill', () => {
    for (const skill of ALL_SKILLS) {
      const tags = CURRICULUM_TAGS[skill];
      expect(tags, `missing curriculum tag for ${skill}`).toBeDefined();
      expect(tags.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('every tag references year 3, 4, or 5', () => {
    for (const skill of ALL_SKILLS) {
      for (const tag of CURRICULUM_TAGS[skill]) {
        expect([3, 4, 5]).toContain(tag.year);
        expect(typeof tag.objective).toBe('string');
        expect(tag.objective.length).toBeGreaterThan(10);
      }
    }
  });
});

describe('toRoman', () => {
  it.each([
    [1, 'I'],
    [4, 'IV'],
    [9, 'IX'],
    [14, 'XIV'],
    [40, 'XL'],
    [50, 'L'],
    [90, 'XC'],
    [100, 'C'],
    [400, 'CD'],
    [500, 'D'],
    [900, 'CM'],
    [1000, 'M'],
    [1999, 'MCMXCIX'],
    [3999, 'MMMCMXCIX'],
  ])('toRoman(%i) = %s', (n, expected) => {
    expect(toRoman(n)).toBe(expected);
  });

  it('returns empty string for out-of-range values', () => {
    expect(toRoman(0)).toBe('');
    expect(toRoman(-1)).toBe('');
    expect(toRoman(4000)).toBe('');
  });
});

describe('fromRoman', () => {
  it.each([
    ['I', 1],
    ['IV', 4],
    ['IX', 9],
    ['XIV', 14],
    ['XL', 40],
    ['L', 50],
    ['XC', 90],
    ['C', 100],
    ['CD', 400],
    ['D', 500],
    ['CM', 900],
    ['M', 1000],
    ['MCMXCIX', 1999],
  ])('fromRoman(%s) = %i', (s, expected) => {
    expect(fromRoman(s)).toBe(expected);
  });

  it('is case-insensitive', () => {
    expect(fromRoman('xiv')).toBe(14);
    expect(fromRoman('Xiv')).toBe(14);
  });

  it('returns NaN for invalid characters', () => {
    expect(Number.isNaN(fromRoman('XYZ'))).toBe(true);
    expect(Number.isNaN(fromRoman(''))).toBe(true);
    expect(Number.isNaN(fromRoman('123'))).toBe(true);
  });

  it('roundtrips through toRoman for every value 1..1000', () => {
    for (let n = 1; n <= 1000; n++) {
      const r = toRoman(n);
      expect(fromRoman(r), `roundtrip failed for ${n} → ${r}`).toBe(n);
    }
  });
});

describe('generateNumberSenseQuestions — count', () => {
  it('returns the requested number of questions', () => {
    const qs = generateNumberSenseQuestions(baseSettings({}), 25);
    expect(qs).toHaveLength(25);
  });
});

describe('generateNumberSenseQuestions — place value', () => {
  const skills: Array<['place-value-3d' | 'place-value-4d' | 'place-value-7d', number, number]> = [
    ['place-value-3d', 100, 999],
    ['place-value-4d', 1000, 9999],
    ['place-value-7d', 10000, 9999999],
  ];

  it.each(skills)('%s produces a number in [%i, %i] with a valid digit answer', (skill, min, max) => {
    const qs = generateNumberSenseQuestions(baseSettings({ skills: [skill] }), 40);
    qs.forEach(q => {
      expect(q.skill).toBe(skill);
      if (!isPlaceValueQuestion(q)) throw new Error('wrong shape');
      expect(q.number).toBeGreaterThanOrEqual(min);
      expect(q.number).toBeLessThanOrEqual(max);
      expect(q.digitIndex).toBeGreaterThanOrEqual(0);
      expect(q.digitIndex).toBeLessThan(String(q.number).length);
      // Answer must equal the targeted digit times its positional power.
      const digit = parseInt(String(q.number)[q.digitIndex], 10);
      const positionFromRight = String(q.number).length - 1 - q.digitIndex;
      expect(q.answer).toBe(digit * 10 ** positionFromRight);
    });
  });

  it('targeted digit is non-zero (avoids "value of the 0 in 304")', () => {
    // Run a large sample; non-zero is enforced in every sample where it's
    // possible to find a non-zero digit, which is "every number 100+".
    const qs = generateNumberSenseQuestions(baseSettings({ skills: ['place-value-3d'] }), 200);
    qs.forEach(q => {
      if (!isPlaceValueQuestion(q)) throw new Error('wrong shape');
      const digit = parseInt(String(q.number)[q.digitIndex], 10);
      expect(digit).not.toBe(0);
    });
  });
});

describe('generateNumberSenseQuestions — rounding', () => {
  const cases: Array<[NumberSenseSkill, number[]]> = [
    ['round-10', [10]],
    ['round-100', [100]],
    ['round-1000', [1000]],
    ['round-10k', [10000, 100000]],
  ];

  it.each(cases)('%s answers are multiples of the rounding base', (skill, bases) => {
    const qs = generateNumberSenseQuestions(baseSettings({ skills: [skill], difficulty: 'medium' }), 40);
    qs.forEach(q => {
      if (!isRoundQuestion(q)) throw new Error('wrong shape');
      expect(bases).toContain(q.nearest);
      expect(q.answer % q.nearest).toBe(0);
      // Standard rounding: |number - answer| <= nearest/2 (round-half-up
      // implementation uses Math.round which rounds .5 to even/up depending
      // on JS engine, but the difference is always at most nearest/2).
      expect(Math.abs(q.number - q.answer)).toBeLessThanOrEqual(q.nearest / 2);
    });
  });
});

describe('generateNumberSenseQuestions — sequences', () => {
  it('count-multiples produces a 6-term arithmetic sequence', () => {
    const qs = generateNumberSenseQuestions(baseSettings({ skills: ['count-multiples'], difficulty: 'easy' }), 30);
    qs.forEach(q => {
      if (!isSequenceQuestion(q)) throw new Error('wrong shape');
      expect(q.skill).toBe('count-multiples');
      expect(q.sequence).toHaveLength(6);
      // Step is constant across all consecutive pairs.
      for (let i = 1; i < q.sequence.length; i++) {
        expect(q.sequence[i] - q.sequence[i - 1]).toBe(q.step);
      }
      // Y3 multiples: step is one of [4, 8, 50, 100].
      expect([4, 8, 50, 100]).toContain(q.step);
    });
  });

  it('count-multiples easy/medium/hard use the right step sets', () => {
    const easy = generateNumberSenseQuestions(baseSettings({ skills: ['count-multiples'], difficulty: 'easy' }), 30);
    easy.forEach(q => {
      if (!isSequenceQuestion(q)) throw new Error('wrong shape');
      expect([4, 8, 50, 100]).toContain(q.step);
    });
    const medium = generateNumberSenseQuestions(baseSettings({ skills: ['count-multiples'], difficulty: 'medium' }), 30);
    medium.forEach(q => {
      if (!isSequenceQuestion(q)) throw new Error('wrong shape');
      expect([6, 7, 9, 25, 1000]).toContain(q.step);
    });
    const hard = generateNumberSenseQuestions(baseSettings({ skills: ['count-multiples'], difficulty: 'hard' }), 30);
    hard.forEach(q => {
      if (!isSequenceQuestion(q)) throw new Error('wrong shape');
      expect([10, 100, 1000, 10000, 100000, 1000000]).toContain(q.step);
    });
  });

  it('negative-count crosses zero with a negative step', () => {
    const qs = generateNumberSenseQuestions(baseSettings({ skills: ['negative-count'], difficulty: 'medium' }), 40);
    qs.forEach(q => {
      if (!isSequenceQuestion(q)) throw new Error('wrong shape');
      expect(q.step).toBeLessThan(0);
      // Some terms must be <= 0 if we're truly counting back through zero.
      const hasNonPositive = q.sequence.some(v => v <= 0);
      expect(hasNonPositive).toBe(true);
    });
  });

  it('sequence questions always specify at least one missing index, never index 0', () => {
    const qs = generateNumberSenseQuestions(baseSettings({ skills: ['count-multiples'] }), 20);
    qs.forEach(q => {
      if (!isSequenceQuestion(q)) throw new Error('wrong shape');
      expect(q.missingIndices.length).toBeGreaterThanOrEqual(1);
      expect(q.missingIndices).not.toContain(0);
      // Answers correspond to sequence values at missing indices.
      q.missingIndices.forEach((idx, j) => {
        expect(q.answers[j]).toBe(q.sequence[idx]);
      });
    });
  });
});

describe('generateNumberSenseQuestions — roman', () => {
  it('roman-100 stays within 1..100, both directions', () => {
    const qs = generateNumberSenseQuestions(baseSettings({ skills: ['roman-100'], difficulty: 'medium' }), 60);
    qs.forEach(q => {
      if (!isRomanQuestion(q)) throw new Error('wrong shape');
      expect(q.skill).toBe('roman-100');
      // Recover the numeric value from whichever side is numeric.
      const n = q.direction === 'r2n' ? parseInt(q.answer, 10) : parseInt(q.prompt, 10);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(100);
      // Roundtrip check.
      if (q.direction === 'n2r') {
        expect(q.answer).toBe(toRoman(n));
      } else {
        expect(fromRoman(q.prompt)).toBe(n);
      }
    });
  });

  it('roman-1000 stays within 1..1000', () => {
    const qs = generateNumberSenseQuestions(baseSettings({ skills: ['roman-1000'], difficulty: 'medium' }), 60);
    qs.forEach(q => {
      if (!isRomanQuestion(q)) throw new Error('wrong shape');
      const n = q.direction === 'r2n' ? parseInt(q.answer, 10) : parseInt(q.prompt, 10);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(1000);
    });
  });

  it('emits both directions over a sample of 60', () => {
    const qs = generateNumberSenseQuestions(baseSettings({ skills: ['roman-100'] }), 60);
    const dirs = new Set(qs.map(q => (isRomanQuestion(q) ? q.direction : 'x')));
    expect(dirs.has('r2n')).toBe(true);
    expect(dirs.has('n2r')).toBe(true);
  });
});

describe('generateNumberSenseQuestions — order-numbers', () => {
  it('produces 4 distinct numbers and a sorted answer', () => {
    const qs = generateNumberSenseQuestions(baseSettings({ skills: ['order-numbers'], difficulty: 'medium' }), 40);
    qs.forEach(q => {
      if (!isOrderQuestion(q)) throw new Error('wrong shape');
      expect(q.numbers).toHaveLength(4);
      const set = new Set(q.numbers);
      expect(set.size).toBe(4);
      // Answer is sorted ascending.
      for (let i = 1; i < q.answer.length; i++) {
        expect(q.answer[i]).toBeGreaterThanOrEqual(q.answer[i - 1]);
      }
      // Answer is a permutation of numbers.
      const sortedInput = [...q.numbers].sort((a, b) => a - b);
      expect(q.answer).toEqual(sortedInput);
    });
  });

  it('difficulty scales the upper bound', () => {
    const easy = generateNumberSenseQuestions(baseSettings({ skills: ['order-numbers'], difficulty: 'easy' }), 20);
    easy.forEach(q => {
      if (!isOrderQuestion(q)) throw new Error('wrong shape');
      q.numbers.forEach(n => expect(n).toBeLessThanOrEqual(1000));
    });
    const hard = generateNumberSenseQuestions(baseSettings({ skills: ['order-numbers'], difficulty: 'hard' }), 40);
    const maxObserved = hard.reduce((m, q) => {
      if (!isOrderQuestion(q)) return m;
      return Math.max(m, ...q.numbers);
    }, 0);
    // With 4*40 = 160 picks in [1, 1_000_000], we expect at least one above 10000.
    expect(maxObserved).toBeGreaterThan(10000);
  });
});

describe('generateNumberSenseQuestions — multi-skill', () => {
  it('mixes selected skills across a single batch', () => {
    const settings = baseSettings({
      skills: ['place-value-3d', 'round-100', 'roman-100', 'order-numbers'],
    });
    const qs = generateNumberSenseQuestions(settings, 200);
    const skillSet = new Set(qs.map(q => q.skill));
    // All 4 selected skills should appear in 200 picks with high probability.
    expect(skillSet.has('place-value-3d')).toBe(true);
    expect(skillSet.has('round-100')).toBe(true);
    expect(skillSet.has('roman-100')).toBe(true);
    expect(skillSet.has('order-numbers')).toBe(true);
    // No unrequested skill leaks through.
    qs.forEach(q => {
      expect(['place-value-3d', 'round-100', 'roman-100', 'order-numbers']).toContain(q.skill);
    });
  });
});

describe('parseSequenceAnswer', () => {
  it('accepts comma-separated integers', () => {
    expect(parseSequenceAnswer('1, 2, 3')).toEqual([1, 2, 3]);
  });

  it('accepts whitespace-separated integers', () => {
    expect(parseSequenceAnswer('1 2 3')).toEqual([1, 2, 3]);
  });

  it('accepts mixed separators', () => {
    expect(parseSequenceAnswer('1,2 3,4')).toEqual([1, 2, 3, 4]);
  });

  it('accepts negative integers', () => {
    expect(parseSequenceAnswer('-3, -1, 1')).toEqual([-3, -1, 1]);
  });

  it('returns null on empty input', () => {
    expect(parseSequenceAnswer('')).toBeNull();
    expect(parseSequenceAnswer('   ')).toBeNull();
  });

  it('returns null on garbage tokens', () => {
    expect(parseSequenceAnswer('1, foo, 3')).toBeNull();
    expect(parseSequenceAnswer('1, 2.5, 3')).toBeNull();
  });
});

describe('checkNumberSenseAnswer', () => {
  it('place-value: exact numeric match', () => {
    const q: NumberSensePlaceValueQuestion = {
      skill: 'place-value-3d',
      number: 374,
      digitIndex: 1,
      answer: 70,
    };
    expect(checkNumberSenseAnswer(q, '70')).toBe(true);
    expect(checkNumberSenseAnswer(q, ' 70 ')).toBe(true);
    expect(checkNumberSenseAnswer(q, '7')).toBe(false);
    expect(checkNumberSenseAnswer(q, '')).toBe(false);
    expect(checkNumberSenseAnswer(q, 'seventy')).toBe(false);
  });

  it('round: exact numeric match', () => {
    const q: NumberSenseRoundQuestion = {
      skill: 'round-100',
      number: 347,
      nearest: 100,
      answer: 300,
    };
    expect(checkNumberSenseAnswer(q, '300')).toBe(true);
    expect(checkNumberSenseAnswer(q, '400')).toBe(false);
  });

  it('sequence: all blanks must match in order', () => {
    const q: NumberSenseSequenceQuestion = {
      skill: 'count-multiples',
      sequence: [8, 16, 24, 32, 40, 48],
      missingIndices: [3, 4],
      answers: [32, 40],
      step: 8,
    };
    expect(checkNumberSenseAnswer(q, '32, 40')).toBe(true);
    expect(checkNumberSenseAnswer(q, '32 40')).toBe(true);
    expect(checkNumberSenseAnswer(q, '40, 32')).toBe(false); // wrong order
    expect(checkNumberSenseAnswer(q, '32')).toBe(false); // too few
  });

  it('roman r2n: numeric match', () => {
    const q: NumberSenseRomanQuestion = {
      skill: 'roman-100',
      direction: 'r2n',
      prompt: 'XIV',
      answer: '14',
    };
    expect(checkNumberSenseAnswer(q, '14')).toBe(true);
    expect(checkNumberSenseAnswer(q, '15')).toBe(false);
  });

  it('roman n2r: case-insensitive Roman match', () => {
    const q: NumberSenseRomanQuestion = {
      skill: 'roman-100',
      direction: 'n2r',
      prompt: '14',
      answer: 'XIV',
    };
    expect(checkNumberSenseAnswer(q, 'XIV')).toBe(true);
    expect(checkNumberSenseAnswer(q, 'xiv')).toBe(true);
    expect(checkNumberSenseAnswer(q, ' Xiv ')).toBe(true);
    expect(checkNumberSenseAnswer(q, 'XV')).toBe(false);
  });

  it('order-numbers: ascending comma-separated', () => {
    const q: NumberSenseOrderQuestion = {
      skill: 'order-numbers',
      numbers: [4, 1, 3, 2],
      answer: [1, 2, 3, 4],
    };
    expect(checkNumberSenseAnswer(q, '1, 2, 3, 4')).toBe(true);
    expect(checkNumberSenseAnswer(q, '1 2 3 4')).toBe(true);
    expect(checkNumberSenseAnswer(q, '4, 3, 2, 1')).toBe(false);
    expect(checkNumberSenseAnswer(q, '1, 2, 3')).toBe(false);
  });
});

describe('answerText / questionPromptText', () => {
  it('place-value prompt mentions the digit and the number', () => {
    const q: NumberSensePlaceValueQuestion = {
      skill: 'place-value-3d',
      number: 374,
      digitIndex: 1,
      answer: 70,
    };
    expect(questionPromptText(q)).toContain('374');
    expect(questionPromptText(q)).toContain('7');
    expect(answerText(q)).toBe('70');
  });

  it('sequence answer is comma-separated', () => {
    const q: NumberSenseSequenceQuestion = {
      skill: 'count-multiples',
      sequence: [8, 16, 24, 32, 40, 48],
      missingIndices: [3],
      answers: [32],
      step: 8,
    };
    expect(answerText(q)).toBe('32');
  });

  it('roman n2r answer is the Roman numeral string', () => {
    const q: NumberSenseRomanQuestion = {
      skill: 'roman-100',
      direction: 'n2r',
      prompt: '14',
      answer: 'XIV',
    };
    expect(answerText(q)).toBe('XIV');
  });

  it('order-numbers answer is comma-separated ascending', () => {
    const q: NumberSenseOrderQuestion = {
      skill: 'order-numbers',
      numbers: [4, 1, 3, 2],
      answer: [1, 2, 3, 4],
    };
    expect(answerText(q)).toBe('1, 2, 3, 4');
  });
});

describe('end-to-end: every generated question is answer-checkable', () => {
  it('the canonical answer always validates', () => {
    const settings = baseSettings({ skills: [...ALL_SKILLS], difficulty: 'medium' });
    const qs = generateNumberSenseQuestions(settings, 300);
    qs.forEach((q: NumberSenseQuestion) => {
      expect(checkNumberSenseAnswer(q, answerText(q)), `answer rejected for ${JSON.stringify(q)}`).toBe(true);
    });
  });
});
