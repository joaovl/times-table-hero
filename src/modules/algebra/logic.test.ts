import { describe, it, expect } from 'vitest';
import {
  ALL_SKILLS,
  SKILL_LABELS,
  CURRICULUM_TAGS,
  answerText,
  checkAlgebraAnswer,
  generateAlgebraQuestions,
  isFormulaEvalQuestion,
  isMissingNumberQuestion,
  isSequenceNextQuestion,
  isSequenceRuleQuestion,
  isExpressionEvaluateQuestion,
  normaliseRule,
  parsePair,
  questionPromptText,
} from './logic';
import type { AlgebraSettings } from './logic';

const baseSettings = (over: Partial<AlgebraSettings> = {}): AlgebraSettings => ({
  skills: ['missing-number'],
  difficulty: 'medium',
  gameMode: 'questions',
  questionCount: 10,
  timeLimit: 60,
  ...over,
});

describe('ALL_SKILLS / SKILL_LABELS', () => {
  it('has the 5 required Y6 skills', () => {
    expect(ALL_SKILLS).toEqual([
      'formula-eval',
      'missing-number',
      'sequence-next',
      'sequence-rule',
      'expression-evaluate',
    ]);
  });

  it('every skill has a non-empty label', () => {
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

describe('generateAlgebraQuestions — count', () => {
  it('returns the requested number of questions', () => {
    const qs = generateAlgebraQuestions(baseSettings(), 30);
    expect(qs).toHaveLength(30);
  });

  it('only emits requested skills', () => {
    const qs = generateAlgebraQuestions(
      baseSettings({ skills: ['sequence-next', 'sequence-rule'] }),
      80
    );
    qs.forEach(q => {
      expect(['sequence-next', 'sequence-rule']).toContain(q.skill);
    });
  });

  it('mixing all 5 skills emits every skill in 500 picks', () => {
    const qs = generateAlgebraQuestions(baseSettings({ skills: ALL_SKILLS }), 500);
    const observed = new Set(qs.map(q => q.skill));
    ALL_SKILLS.forEach(s =>
      expect(observed.has(s), `${s} never emitted in 500 samples`).toBe(true)
    );
  });
});

describe('formula-eval', () => {
  it('every formula returns the right numeric answer', () => {
    const qs = generateAlgebraQuestions(baseSettings({ skills: ['formula-eval'] }), 60);
    qs.forEach(q => {
      if (!isFormulaEvalQuestion(q)) throw new Error('wrong shape');
      const get = (n: string) => q.inputs.find(i => i.name === n)?.value ?? NaN;
      if (q.formula === 'perimeter') {
        expect(q.answer).toBe(2 * (get('l') + get('w')));
      } else if (q.formula === 'area') {
        expect(q.answer).toBe(get('l') * get('w'));
      } else if (q.formula === 'doubled-sum') {
        expect(q.answer).toBe(2 * get('a') + get('b'));
      } else {
        // half-product: (a*b)/2
        expect(q.answer).toBe((get('a') * get('b')) / 2);
        expect(Number.isInteger(q.answer)).toBe(true);
      }
    });
  });

  it('formulaText contains the result variable name', () => {
    const qs = generateAlgebraQuestions(baseSettings({ skills: ['formula-eval'] }), 30);
    qs.forEach(q => {
      if (!isFormulaEvalQuestion(q)) throw new Error('wrong shape');
      expect(q.formulaText.includes(`${q.resultName} =`)).toBe(true);
    });
  });
});

describe('missing-number', () => {
  it('coeff*answer + constant = rhs (positive integer answer)', () => {
    const qs = generateAlgebraQuestions(baseSettings({ skills: ['missing-number'] }), 60);
    qs.forEach(q => {
      if (!isMissingNumberQuestion(q)) throw new Error('wrong shape');
      expect(q.coeff * q.answer + q.constant).toBe(q.rhs);
      expect(q.answer).toBeGreaterThan(0);
      expect(Number.isInteger(q.answer)).toBe(true);
    });
  });

  it('canonical answer round-trips via checkAlgebraAnswer', () => {
    const qs = generateAlgebraQuestions(baseSettings({ skills: ['missing-number'] }), 30);
    qs.forEach(q => {
      expect(checkAlgebraAnswer(q, String(q.answer === undefined ? '' : answerText(q)))).toBe(true);
    });
  });
});

describe('sequence-next', () => {
  it('visible 4 terms plus answer 2 terms form a constant arithmetic progression', () => {
    const qs = generateAlgebraQuestions(baseSettings({ skills: ['sequence-next'] }), 40);
    qs.forEach(q => {
      if (!isSequenceNextQuestion(q)) throw new Error('wrong shape');
      expect(q.sequence).toHaveLength(4);
      for (let i = 1; i < 4; i++) {
        expect(q.sequence[i] - q.sequence[i - 1]).toBe(q.step);
      }
      expect(q.answer[0] - q.sequence[3]).toBe(q.step);
      expect(q.answer[1] - q.answer[0]).toBe(q.step);
    });
  });

  it('checkAlgebraAnswer accepts the canonical pair', () => {
    const qs = generateAlgebraQuestions(baseSettings({ skills: ['sequence-next'] }), 20);
    qs.forEach(q => {
      if (!isSequenceNextQuestion(q)) throw new Error('wrong shape');
      expect(checkAlgebraAnswer(q, `${q.answer[0]}, ${q.answer[1]}`)).toBe(true);
      expect(checkAlgebraAnswer(q, `${q.answer[0]} ${q.answer[1]}`)).toBe(true);
      expect(checkAlgebraAnswer(q, `${q.answer[1]}, ${q.answer[0]}`)).toBe(false);
    });
  });
});

describe('sequence-rule', () => {
  it('answer string matches the step direction and magnitude', () => {
    const qs = generateAlgebraQuestions(baseSettings({ skills: ['sequence-rule'] }), 40);
    qs.forEach(q => {
      if (!isSequenceRuleQuestion(q)) throw new Error('wrong shape');
      if (q.step >= 0) {
        expect(q.answer).toBe(`add ${q.step}`);
      } else {
        expect(q.answer).toBe(`subtract ${-q.step}`);
      }
    });
  });

  it('checkAlgebraAnswer accepts "+N" and "add N" aliases', () => {
    const q = {
      skill: 'sequence-rule' as const,
      sequence: [3, 7, 11, 15],
      step: 4,
      answer: 'add 4',
    };
    expect(checkAlgebraAnswer(q, 'add 4')).toBe(true);
    expect(checkAlgebraAnswer(q, '+4')).toBe(true);
    expect(checkAlgebraAnswer(q, 'plus 4')).toBe(true);
    expect(checkAlgebraAnswer(q, 'subtract 4')).toBe(false);
  });

  it('checkAlgebraAnswer accepts "-N", "subtract N", "minus N" aliases', () => {
    const q = {
      skill: 'sequence-rule' as const,
      sequence: [20, 17, 14, 11],
      step: -3,
      answer: 'subtract 3',
    };
    expect(checkAlgebraAnswer(q, 'subtract 3')).toBe(true);
    expect(checkAlgebraAnswer(q, '-3')).toBe(true);
    expect(checkAlgebraAnswer(q, 'minus 3')).toBe(true);
    expect(checkAlgebraAnswer(q, 'add 3')).toBe(false);
  });
});

describe('expression-evaluate', () => {
  it('answer equals coeff*varValue + constant', () => {
    const qs = generateAlgebraQuestions(baseSettings({ skills: ['expression-evaluate'] }), 50);
    qs.forEach(q => {
      if (!isExpressionEvaluateQuestion(q)) throw new Error('wrong shape');
      expect(q.answer).toBe(q.coeff * q.varValue + q.constant);
    });
  });

  it('expression display uses "+ k" or "- k" based on sign', () => {
    const qs = generateAlgebraQuestions(baseSettings({ skills: ['expression-evaluate'] }), 50);
    qs.forEach(q => {
      if (!isExpressionEvaluateQuestion(q)) throw new Error('wrong shape');
      if (q.constant >= 0) {
        expect(q.expression).toContain(`+ ${q.constant}`);
      } else {
        expect(q.expression).toContain(`- ${Math.abs(q.constant)}`);
      }
    });
  });
});

describe('parsePair', () => {
  it('accepts "a, b", "a b", "a,b"', () => {
    expect(parsePair('14, 17')).toEqual([14, 17]);
    expect(parsePair('14 17')).toEqual([14, 17]);
    expect(parsePair('14,17')).toEqual([14, 17]);
    expect(parsePair('foo')).toBeNull();
    expect(parsePair('14')).toBeNull();
    expect(parsePair('14.5, 17')).toBeNull();
  });
});

describe('normaliseRule', () => {
  it('canonicalises add/plus/+ and subtract/sub/minus/-', () => {
    expect(normaliseRule('add 4')).toBe('add 4');
    expect(normaliseRule('plus 4')).toBe('add 4');
    expect(normaliseRule('+4')).toBe('add 4');
    expect(normaliseRule('+ 4')).toBe('add 4');
    expect(normaliseRule('subtract 3')).toBe('subtract 3');
    expect(normaliseRule('-3')).toBe('subtract 3');
    expect(normaliseRule('minus 3')).toBe('subtract 3');
    expect(normaliseRule('garbage')).toBeNull();
    expect(normaliseRule('')).toBeNull();
  });
});

describe('questionPromptText / answerText round-trip', () => {
  it('canonical answer always validates across the full skill set', () => {
    const settings = baseSettings({ skills: ALL_SKILLS, difficulty: 'medium' });
    const qs = generateAlgebraQuestions(settings, 250);
    qs.forEach(q => {
      expect(checkAlgebraAnswer(q, answerText(q)), `${q.skill} rejected: ${answerText(q)}`).toBe(true);
    });
  });

  it('prompts contain WinAnsi-safe characters only', () => {
    const qs = generateAlgebraQuestions(baseSettings({ skills: ALL_SKILLS, difficulty: 'hard' }), 80);
    const UNSAFE = /[∀-⋿−]/u;
    qs.forEach(q => {
      const t = questionPromptText(q);
      expect(UNSAFE.test(t), `unsafe in "${t}"`).toBe(false);
    });
  });
});

describe('checkAlgebraAnswer — rejections', () => {
  it('rejects empty / non-numeric / wrong values for numeric skills', () => {
    const q = { skill: 'missing-number' as const, varName: 'a', coeff: 3, constant: 4, rhs: 10, answer: 2 };
    expect(checkAlgebraAnswer(q, '')).toBe(false);
    expect(checkAlgebraAnswer(q, 'x')).toBe(false);
    expect(checkAlgebraAnswer(q, '2.5')).toBe(false);
    expect(checkAlgebraAnswer(q, '3')).toBe(false);
    expect(checkAlgebraAnswer(q, '2')).toBe(true);
  });
});
