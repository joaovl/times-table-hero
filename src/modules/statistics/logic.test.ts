import { describe, it, expect } from 'vitest';
import {
  ALL_SKILLS,
  SKILL_LABELS,
  CURRICULUM_TAGS,
  answerText,
  checkStatsAnswer,
  generateStatsQuestions,
  isMeanCalcQuestion,
  isMeanFindMissingQuestion,
  isMedianQuestion,
  isModeQuestion,
  isRangeQuestion,
  questionPromptText,
} from './logic';
import type { StatsSettings } from './logic';

const baseSettings = (over: Partial<StatsSettings> = {}): StatsSettings => ({
  skills: ['mean-calc'],
  difficulty: 'medium',
  gameMode: 'questions',
  questionCount: 10,
  timeLimit: 60,
  ...over,
});

describe('ALL_SKILLS / SKILL_LABELS', () => {
  it('has the 5 required statistics skills', () => {
    expect(ALL_SKILLS).toEqual([
      'mean-calc',
      'mean-find-missing',
      'median',
      'mode',
      'range',
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
  it('every skill has at least one Y6 tag', () => {
    ALL_SKILLS.forEach(s => {
      const tags = CURRICULUM_TAGS[s];
      expect(tags.length).toBeGreaterThanOrEqual(1);
      expect(tags.some(t => t.year === 6)).toBe(true);
    });
  });
});

describe('generateStatsQuestions — count', () => {
  it('returns the requested number of questions', () => {
    const qs = generateStatsQuestions(baseSettings(), 30);
    expect(qs).toHaveLength(30);
  });

  it('mixing all 5 skills emits each at least once in 500 samples', () => {
    const qs = generateStatsQuestions(baseSettings({ skills: ALL_SKILLS }), 500);
    const seen = new Set(qs.map(q => q.skill));
    ALL_SKILLS.forEach(s => expect(seen.has(s), `${s} never emitted`).toBe(true));
  });
});

describe('mean-calc', () => {
  it('answer = sum(values) / values.length, integer', () => {
    const qs = generateStatsQuestions(baseSettings({ skills: ['mean-calc'] }), 80);
    qs.forEach(q => {
      if (!isMeanCalcQuestion(q)) throw new Error('wrong shape');
      const sum = q.values.reduce((a, b) => a + b, 0);
      expect(sum).toBe(q.answer * q.values.length);
      expect(Number.isInteger(q.answer)).toBe(true);
      expect(q.values.length).toBeGreaterThanOrEqual(3);
    });
  });

  it('round-trips through checkStatsAnswer', () => {
    const qs = generateStatsQuestions(baseSettings({ skills: ['mean-calc'] }), 30);
    qs.forEach(q => expect(checkStatsAnswer(q, String(q.answer))).toBe(true));
  });
});

describe('mean-find-missing', () => {
  it('the missing slot has the canonical value', () => {
    const qs = generateStatsQuestions(baseSettings({ skills: ['mean-find-missing'] }), 60);
    qs.forEach(q => {
      if (!isMeanFindMissingQuestion(q)) throw new Error('wrong shape');
      expect(q.values[q.missingIndex]).toBe(q.answer);
      // Verify the stated mean is the actual mean of the full set.
      const sum = q.values.reduce((a, b) => a + b, 0);
      expect(sum).toBe(q.givenMean * q.values.length);
    });
  });

  it('prompt hides the missing value with "?"', () => {
    const qs = generateStatsQuestions(baseSettings({ skills: ['mean-find-missing'] }), 20);
    qs.forEach(q => {
      const t = questionPromptText(q);
      expect(t).toContain('?');
      if (isMeanFindMissingQuestion(q)) {
        expect(t).toContain(String(q.givenMean));
      }
    });
  });
});

describe('median', () => {
  it('answer is the middle value of sorted set (odd length)', () => {
    const qs = generateStatsQuestions(baseSettings({ skills: ['median'] }), 60);
    qs.forEach(q => {
      if (!isMedianQuestion(q)) throw new Error('wrong shape');
      expect(q.values.length % 2).toBe(1); // odd length per generator
      const sorted = [...q.values].sort((a, b) => a - b);
      expect(sorted[Math.floor(q.values.length / 2)]).toBe(q.answer);
    });
  });
});

describe('mode', () => {
  it('answer is the unique most-frequent value', () => {
    const qs = generateStatsQuestions(baseSettings({ skills: ['mode'] }), 50);
    qs.forEach(q => {
      if (!isModeQuestion(q)) throw new Error('wrong shape');
      const freq = new Map<number, number>();
      q.values.forEach(v => freq.set(v, (freq.get(v) ?? 0) + 1));
      const maxFreq = Math.max(...freq.values());
      const modes = Array.from(freq.entries()).filter(([, c]) => c === maxFreq).map(([v]) => v);
      expect(modes).toHaveLength(1);
      expect(modes[0]).toBe(q.answer);
    });
  });
});

describe('range', () => {
  it('answer = max - min', () => {
    const qs = generateStatsQuestions(baseSettings({ skills: ['range'] }), 60);
    qs.forEach(q => {
      if (!isRangeQuestion(q)) throw new Error('wrong shape');
      const lo = Math.min(...q.values);
      const hi = Math.max(...q.values);
      expect(q.answer).toBe(hi - lo);
      expect(q.answer).toBeGreaterThan(0);
    });
  });
});

describe('questionPromptText / answerText round-trip', () => {
  it('canonical answer always validates across the full skill set', () => {
    const qs = generateStatsQuestions(baseSettings({ skills: ALL_SKILLS, difficulty: 'medium' }), 200);
    qs.forEach(q => {
      expect(checkStatsAnswer(q, answerText(q))).toBe(true);
    });
  });

  it('prompts contain WinAnsi-safe characters only', () => {
    const qs = generateStatsQuestions(baseSettings({ skills: ALL_SKILLS, difficulty: 'hard' }), 80);
    const UNSAFE = /[∀-⋿−]/u;
    qs.forEach(q => {
      const t = questionPromptText(q);
      expect(UNSAFE.test(t), `unsafe in "${t}"`).toBe(false);
    });
  });
});

describe('checkStatsAnswer — rejections', () => {
  it('rejects empty / non-numeric / wrong values', () => {
    const q = { skill: 'mean-calc' as const, values: [3, 7, 5, 9], answer: 6 };
    expect(checkStatsAnswer(q, '')).toBe(false);
    expect(checkStatsAnswer(q, 'six')).toBe(false);
    expect(checkStatsAnswer(q, '6.0')).toBe(false);
    expect(checkStatsAnswer(q, '5')).toBe(false);
    expect(checkStatsAnswer(q, '6')).toBe(true);
  });
});

describe('canonical examples from the spec', () => {
  it('mean of 3, 7, 5, 9 is 6', () => {
    const q = { skill: 'mean-calc' as const, values: [3, 7, 5, 9], answer: 6 };
    expect(answerText(q)).toBe('6');
    expect(checkStatsAnswer(q, '6')).toBe(true);
  });

  it('median of 1, 3, 5, 7, 9 is 5', () => {
    const q = { skill: 'median' as const, values: [3, 7, 1, 9, 5], answer: 5 };
    expect(answerText(q)).toBe('5');
  });

  it('mode of 2, 5, 2, 7, 5, 5, 9 is 5', () => {
    const q = { skill: 'mode' as const, values: [2, 5, 2, 7, 5, 5, 9], answer: 5 };
    expect(answerText(q)).toBe('5');
  });

  it('range of 3, 7, 1, 9, 5 is 8', () => {
    const q = { skill: 'range' as const, values: [3, 7, 1, 9, 5], answer: 8 };
    expect(answerText(q)).toBe('8');
  });

  it('mean-find-missing: mean of 4,6,?,8 is 6 → answer is 6', () => {
    // sum = 6*4 = 24; 4+6+8 = 18; missing = 6.
    const q = {
      skill: 'mean-find-missing' as const,
      values: [4, 6, 6, 8],
      missingIndex: 2,
      givenMean: 6,
      answer: 6,
    };
    expect(checkStatsAnswer(q, '6')).toBe(true);
  });
});
