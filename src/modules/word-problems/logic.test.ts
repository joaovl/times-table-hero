import { describe, it, expect } from 'vitest';
import {
  generateWordQuestions,
  checkWordAnswer,
  parseMoneyToPence,
  parseFraction,
  formatPounds,
  isSaneQuestion,
  expectedAnswerString,
  CURRICULUM_TAGS,
  WORD_SKILL_OPTIONS,
} from './logic';
import type { WordProblemSkill, WordSettings, WordQuestion } from './logic';

const baseSettings = (over: Partial<WordSettings> = {}): WordSettings => ({
  skills: ['arith-1step'],
  difficulty: 'easy',
  gameMode: 'questions',
  questionCount: 10,
  timeLimit: 180,
  ...over,
});

describe('CURRICULUM_TAGS', () => {
  it('exposes a tag list for every skill', () => {
    WORD_SKILL_OPTIONS.forEach(s => {
      expect(CURRICULUM_TAGS[s]).toBeDefined();
      expect(CURRICULUM_TAGS[s].length).toBeGreaterThan(0);
    });
  });

  it('only references Y3, Y4 or Y5', () => {
    const allowed = new Set(['Y3', 'Y4', 'Y5']);
    Object.values(CURRICULUM_TAGS).forEach(tags => {
      tags.forEach(t => expect(allowed.has(t)).toBe(true));
    });
  });
});

describe('formatPounds', () => {
  it.each([
    [0, '£0.00'],
    [5, '£0.05'],
    [50, '£0.50'],
    [100, '£1.00'],
    [350, '£3.50'],
    [1099, '£10.99'],
  ])('formats %i pence as %s', (pence, expected) => {
    expect(formatPounds(pence)).toBe(expected);
  });
});

describe('parseMoneyToPence', () => {
  it.each([
    ['£3.50', 350],
    ['3.50', 350],
    ['£3', 300],
    ['3', 300],
    ['350p', 350],
    ['50p', 50],
    [' £10.99 ', 1099],
    ['£10.5', 1050],
  ])('parses %s -> %i pence', (raw, expected) => {
    expect(parseMoneyToPence(raw)).toBe(expected);
  });

  it('returns null for nonsense', () => {
    expect(parseMoneyToPence('')).toBeNull();
    expect(parseMoneyToPence('abc')).toBeNull();
    expect(parseMoneyToPence('£abc')).toBeNull();
  });
});

describe('parseFraction', () => {
  it('parses N/D shapes', () => {
    expect(parseFraction('3/8')).toEqual({ num: 3, den: 8 });
    expect(parseFraction(' 5 / 12 ')).toEqual({ num: 5, den: 12 });
  });

  it('returns null for malformed input', () => {
    expect(parseFraction('3')).toBeNull();
    expect(parseFraction('3/0')).toBeNull();
    expect(parseFraction('abc')).toBeNull();
  });
});

describe('generateWordQuestions — count and skill coverage', () => {
  it('returns the requested number of questions', () => {
    const qs = generateWordQuestions(baseSettings({}), 15);
    expect(qs).toHaveLength(15);
  });

  it('honours a single skill: every generated question matches', () => {
    const qs = generateWordQuestions(
      baseSettings({ skills: ['money-1step'], difficulty: 'easy' }),
      20
    );
    qs.forEach(q => expect(q.skill).toBe('money-1step'));
  });

  it('multi-skill: every generated question is one of the selected skills', () => {
    const skills: WordProblemSkill[] = ['arith-1step', 'fractions-1step', 'time-1step'];
    const qs = generateWordQuestions(baseSettings({ skills, difficulty: 'medium' }), 60);
    qs.forEach(q => expect(skills).toContain(q.skill));
  });

  it('multi-skill: every selected skill is produced at least once over a large sample', () => {
    const skills: WordProblemSkill[] = ['arith-1step', 'money-1step', 'measure-1step'];
    const qs = generateWordQuestions(baseSettings({ skills, difficulty: 'easy' }), 120);
    const observed = new Set(qs.map(q => q.skill));
    skills.forEach(s => expect(observed.has(s)).toBe(true));
  });
});

describe('generateWordQuestions — answer shape per skill', () => {
  it('arith-1step answers are non-negative integers', () => {
    const qs = generateWordQuestions(
      baseSettings({ skills: ['arith-1step'], difficulty: 'medium' }),
      60
    );
    qs.forEach(q => {
      expect(typeof q.answer).toBe('number');
      const n = q.answer as number;
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(0);
    });
  });

  it('arith-2step answers are non-negative integers with workings', () => {
    const qs = generateWordQuestions(
      baseSettings({ skills: ['arith-2step'], difficulty: 'medium' }),
      40
    );
    qs.forEach(q => {
      expect(typeof q.answer).toBe('number');
      expect(q.answer as number).toBeGreaterThanOrEqual(0);
      expect(q.workings).toBeTruthy();
    });
  });

  it('money-1step answers are £-prefixed strings', () => {
    const qs = generateWordQuestions(
      baseSettings({ skills: ['money-1step'], difficulty: 'easy' }),
      30
    );
    qs.forEach(q => {
      expect(typeof q.answer).toBe('string');
      expect((q.answer as string).startsWith('£')).toBe(true);
      expect(parseMoneyToPence(q.answer as string)).not.toBeNull();
    });
  });

  it('money-2step answers are £-strings with workings', () => {
    const qs = generateWordQuestions(
      baseSettings({ skills: ['money-2step'], difficulty: 'medium' }),
      30
    );
    qs.forEach(q => {
      expect(typeof q.answer).toBe('string');
      expect((q.answer as string).startsWith('£')).toBe(true);
      expect(q.workings).toBeTruthy();
    });
  });

  it('time-1step answers are HH:MM strings', () => {
    const qs = generateWordQuestions(
      baseSettings({ skills: ['time-1step'], difficulty: 'medium' }),
      30
    );
    qs.forEach(q => {
      expect(typeof q.answer).toBe('string');
      expect(q.answer as string).toMatch(/^\d{1,2}:\d{2}$/);
    });
  });

  it('measure-1step answers carry a unit', () => {
    const qs = generateWordQuestions(
      baseSettings({ skills: ['measure-1step'], difficulty: 'easy' }),
      30
    );
    qs.forEach(q => {
      expect(typeof q.answer).toBe('number');
      expect(q.unit).toBeTruthy();
    });
  });

  it('measure-2step answers carry a unit and workings', () => {
    const qs = generateWordQuestions(
      baseSettings({ skills: ['measure-2step'], difficulty: 'medium' }),
      30
    );
    qs.forEach(q => {
      expect(typeof q.answer).toBe('number');
      expect(q.unit).toBeTruthy();
      expect(q.workings).toBeTruthy();
    });
  });

  it('fractions-1step easy answers are N/D fractions', () => {
    const qs = generateWordQuestions(
      baseSettings({ skills: ['fractions-1step'], difficulty: 'easy' }),
      30
    );
    qs.forEach(q => {
      expect(typeof q.answer).toBe('string');
      const f = parseFraction(q.answer as string);
      expect(f).not.toBeNull();
      if (f) {
        expect(f.den).toBeGreaterThan(0);
        expect(f.num).toBeGreaterThanOrEqual(0);
        expect(f.num).toBeLessThanOrEqual(f.den);
      }
    });
  });
});

describe('generateWordQuestions — sanity (template variable picking respects difficulty caps)', () => {
  it('easy difficulty: arith-1step uses two-digit-or-smaller operands and integer answers', () => {
    const qs = generateWordQuestions(
      baseSettings({ skills: ['arith-1step'], difficulty: 'easy' }),
      80
    );
    qs.forEach(q => {
      const n = q.answer as number;
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(0);
      // Easy arithmetic shouldn't produce answers above 30 (templates cap at
      // n1=19, n2=9 for subtract / n1=15+n2=10 for add).
      expect(n).toBeLessThanOrEqual(30);
    });
  });

  it('easy money: answer is a tidy pence value (multiple of 25p)', () => {
    const qs = generateWordQuestions(
      baseSettings({ skills: ['money-1step'], difficulty: 'easy' }),
      30
    );
    qs.forEach(q => {
      const pence = parseMoneyToPence(q.answer as string);
      expect(pence).not.toBeNull();
      // Easy templates only use whole-pound costs and £5/£10 payments —
      // change is always a whole-pound amount.
      if (pence !== null) expect(pence % 100).toBe(0);
    });
  });

  it('no negative numeric answers (any skill, any difficulty)', () => {
    const skills = WORD_SKILL_OPTIONS;
    const diffs: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];
    for (const skill of skills) {
      for (const difficulty of diffs) {
        const qs = generateWordQuestions(
          baseSettings({ skills: [skill], difficulty }),
          30
        );
        qs.forEach(q => {
          if (typeof q.answer === 'number') {
            expect(q.answer).toBeGreaterThanOrEqual(0);
          }
        });
      }
    }
  });

  it('easy and medium money/measure answers have no fractional pence and integer measurements', () => {
    const settings = baseSettings({
      skills: ['money-1step', 'money-2step', 'measure-1step', 'measure-2step'],
      difficulty: 'easy',
    });
    const qs = generateWordQuestions(settings, 100);
    qs.forEach(q => {
      if (typeof q.answer === 'number') {
        expect(Number.isInteger(q.answer)).toBe(true);
      } else if (typeof q.answer === 'string' && q.answer.startsWith('£')) {
        const pence = parseMoneyToPence(q.answer);
        expect(pence).not.toBeNull();
        expect(Number.isInteger(pence)).toBe(true);
      }
    });
  });

  it('hard money: at most one decimal beyond the pound (i.e. always multiple of 5p)', () => {
    const qs = generateWordQuestions(
      baseSettings({ skills: ['money-1step'], difficulty: 'hard' }),
      60
    );
    qs.forEach(q => {
      const pence = parseMoneyToPence(q.answer as string);
      expect(pence).not.toBeNull();
      if (pence !== null) {
        // Snapped to 5p in the template — never 1p / 2p / 3p / 4p.
        expect(pence % 5).toBe(0);
      }
    });
  });
});

describe('isSaneQuestion', () => {
  it('rejects negative numeric answers', () => {
    const q: WordQuestion = { skill: 'arith-1step', prompt: '', answer: -1 };
    expect(isSaneQuestion(q, 'easy')).toBe(false);
  });

  it('accepts integer numeric answers at any difficulty', () => {
    const q: WordQuestion = { skill: 'arith-1step', prompt: '', answer: 12 };
    expect(isSaneQuestion(q, 'easy')).toBe(true);
    expect(isSaneQuestion(q, 'hard')).toBe(true);
  });

  it('rejects non-integer numeric answers at easy/medium but allows at hard', () => {
    const q: WordQuestion = { skill: 'arith-1step', prompt: '', answer: 12.5 };
    expect(isSaneQuestion(q, 'easy')).toBe(false);
    expect(isSaneQuestion(q, 'medium')).toBe(false);
    expect(isSaneQuestion(q, 'hard')).toBe(true);
  });

  it('accepts well-formed money answers', () => {
    const q: WordQuestion = { skill: 'money-1step', prompt: '', answer: '£3.50' };
    expect(isSaneQuestion(q, 'easy')).toBe(true);
  });

  it('accepts well-formed fraction answers (numerator <= denominator)', () => {
    const q: WordQuestion = { skill: 'fractions-1step', prompt: '', answer: '3/8' };
    expect(isSaneQuestion(q, 'easy')).toBe(true);
  });

  it('rejects fractions with denominator zero', () => {
    const q: WordQuestion = { skill: 'fractions-1step', prompt: '', answer: '3/0' };
    expect(isSaneQuestion(q, 'easy')).toBe(false);
  });
});

describe('checkWordAnswer — numeric with optional unit suffix', () => {
  const q: WordQuestion = {
    skill: 'measure-1step',
    prompt: '',
    answer: 18,
    unit: 'cm',
  };

  it.each([
    '18',
    '18 cm',
    '18cm',
    ' 18 cm ',
    '18 centimetres',
    '18 centimeters',
    '18.00',
  ])('accepts "%s"', raw => {
    expect(checkWordAnswer(q, raw)).toBe(true);
  });

  it.each(['17', '19', '180', 'abc', ''])('rejects "%s"', raw => {
    expect(checkWordAnswer(q, raw)).toBe(false);
  });

  it('accepts within ±0.01 tolerance', () => {
    expect(checkWordAnswer(q, '18.005')).toBe(true);
    expect(checkWordAnswer(q, '17.995')).toBe(true);
    expect(checkWordAnswer(q, '18.02')).toBe(false);
  });
});

describe('checkWordAnswer — money', () => {
  const q: WordQuestion = {
    skill: 'money-1step',
    prompt: '',
    answer: '£3.50',
  };

  it.each(['£3.50', '3.50', '350p', '£3.5', '3.5'])('accepts "%s"', raw => {
    expect(checkWordAnswer(q, raw)).toBe(true);
  });

  it.each(['£3.51', '£3.49', '349p', 'abc', ''])('rejects "%s"', raw => {
    expect(checkWordAnswer(q, raw)).toBe(false);
  });

  it('accepts £0 case in either form', () => {
    const q0: WordQuestion = { skill: 'money-1step', prompt: '', answer: '£0.00' };
    expect(checkWordAnswer(q0, '£0')).toBe(true);
    expect(checkWordAnswer(q0, '0p')).toBe(true);
    expect(checkWordAnswer(q0, '£0.00')).toBe(true);
  });
});

describe('checkWordAnswer — fraction', () => {
  const q: WordQuestion = {
    skill: 'fractions-1step',
    prompt: '',
    answer: '5/8',
  };

  it.each(['5/8', ' 5 / 8 '])('accepts "%s"', raw => {
    expect(checkWordAnswer(q, raw)).toBe(true);
  });

  it.each(['5', '5/9', '6/8', 'abc', ''])('rejects "%s"', raw => {
    expect(checkWordAnswer(q, raw)).toBe(false);
  });
});

describe('checkWordAnswer — time strings', () => {
  const q: WordQuestion = {
    skill: 'time-1step',
    prompt: '',
    answer: '4:30',
  };

  it('accepts the exact answer string', () => {
    expect(checkWordAnswer(q, '4:30')).toBe(true);
  });

  it('rejects mismatching time', () => {
    expect(checkWordAnswer(q, '4:31')).toBe(false);
    expect(checkWordAnswer(q, '5:30')).toBe(false);
  });
});

describe('expectedAnswerString', () => {
  it('numeric with unit', () => {
    expect(
      expectedAnswerString({ skill: 'measure-1step', prompt: '', answer: 18, unit: 'cm' })
    ).toBe('18 cm');
  });

  it('numeric without unit', () => {
    expect(
      expectedAnswerString({ skill: 'arith-1step', prompt: '', answer: 12 })
    ).toBe('12');
  });

  it('money string passes through', () => {
    expect(
      expectedAnswerString({ skill: 'money-1step', prompt: '', answer: '£3.50' })
    ).toBe('£3.50');
  });

  it('fraction string passes through', () => {
    expect(
      expectedAnswerString({ skill: 'fractions-1step', prompt: '', answer: '3/8' })
    ).toBe('3/8');
  });
});
