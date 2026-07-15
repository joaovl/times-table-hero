import { describe, it, expect } from 'vitest';
import {
  axisMax,
  buildPieSlices,
  chartTypeFor,
  CURRICULUM_TAGS,
  CHART_SKILL_OPTIONS,
  formatHHMM,
  generateChartChoices,
  generateChartQuestions,
  isAnswerCorrect,
  isLineSkill,
  isTimetableSkill,
  parseChartAnswer,
  parseFractionAnswer,
  parseTimeAnswer,
  reduceFraction,
} from './logic';
import type { ChartSettings, ChartSkill } from './logic';
import { NONE_OF_THESE, isChoiceCorrect } from '@/lib/game/choices';

const baseSettings = (over: Partial<ChartSettings>): ChartSettings => ({
  skills: ['read-bar'],
  maxValue: 50,
  numCategories: 5,
  gameMode: 'questions',
  questionCount: 10,
  timeLimit: 60,
  ...over,
});

describe('generateChartQuestions — count and structure', () => {
  it('returns the requested number of questions', () => {
    const qs = generateChartQuestions(baseSettings({}), 25);
    expect(qs).toHaveLength(25);
  });

  it('returns 0 questions when asked for 0', () => {
    const qs = generateChartQuestions(baseSettings({}), 0);
    expect(qs).toHaveLength(0);
  });

  it.each([4, 5, 6, 7])('every chart has exactly numCategories=%i categories', (n) => {
    const qs = generateChartQuestions(baseSettings({ numCategories: n }), 30);
    qs.forEach(q => expect(q.categories).toHaveLength(n));
  });

  it('every category value is an integer in 1..maxValue', () => {
    const maxValue = 100;
    const qs = generateChartQuestions(baseSettings({ maxValue }), 50);
    qs.forEach(q =>
      q.categories.forEach(c => {
        expect(Number.isInteger(c.value)).toBe(true);
        expect(c.value).toBeGreaterThanOrEqual(1);
        expect(c.value).toBeLessThanOrEqual(maxValue);
      })
    );
  });

  it('category labels are non-empty strings (used in PDF)', () => {
    const qs = generateChartQuestions(baseSettings({}), 20);
    qs.forEach(q =>
      q.categories.forEach(c => {
        expect(typeof c.label).toBe('string');
        expect(c.label.length).toBeGreaterThan(0);
      })
    );
  });

  it('within a single chart, category labels are unique', () => {
    const qs = generateChartQuestions(baseSettings({ numCategories: 7 }), 30);
    qs.forEach(q => {
      const labels = q.categories.map(c => c.label);
      expect(new Set(labels).size).toBe(labels.length);
    });
  });

  it('prompt is a non-empty string', () => {
    const qs = generateChartQuestions(baseSettings({ skills: ['read-bar', 'compare-bar', 'total-bar'] }), 30);
    qs.forEach(q => {
      expect(typeof q.prompt).toBe('string');
      expect(q.prompt.length).toBeGreaterThan(0);
    });
  });
});

describe('generateChartQuestions — read-bar skill', () => {
  it('targets is exactly one index, answer is that bar value', () => {
    const qs = generateChartQuestions(baseSettings({ skills: ['read-bar'] }), 50);
    qs.forEach(q => {
      expect(q.skill).toBe('read-bar');
      expect(q.targets).toHaveLength(1);
      const idx = q.targets[0];
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(q.categories.length);
      expect(q.answer).toBe(q.categories[idx].value);
    });
  });

  it('prompt references the target label', () => {
    const qs = generateChartQuestions(baseSettings({ skills: ['read-bar'] }), 20);
    qs.forEach(q => {
      const label = q.categories[q.targets[0]].label;
      expect(q.prompt.includes(label)).toBe(true);
    });
  });
});

describe('generateChartQuestions — compare-bar skill', () => {
  it('targets is exactly two distinct indices', () => {
    const qs = generateChartQuestions(baseSettings({ skills: ['compare-bar'] }), 50);
    qs.forEach(q => {
      expect(q.skill).toBe('compare-bar');
      expect(q.targets).toHaveLength(2);
      const [a, b] = q.targets;
      expect(a).not.toBe(b);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(q.categories.length);
      expect(b).toBeLessThan(q.categories.length);
    });
  });

  it('answer equals |a.value - b.value|', () => {
    const qs = generateChartQuestions(baseSettings({ skills: ['compare-bar'] }), 50);
    qs.forEach(q => {
      const [a, b] = q.targets;
      const expected = Math.abs(q.categories[a].value - q.categories[b].value);
      expect(q.answer).toBe(expected);
    });
  });

  it('answer is non-negative', () => {
    const qs = generateChartQuestions(baseSettings({ skills: ['compare-bar'] }), 50);
    qs.forEach(q => expect(q.answer).toBeGreaterThanOrEqual(0));
  });
});

describe('generateChartQuestions — total-bar skill', () => {
  it('targets covers every index', () => {
    const qs = generateChartQuestions(baseSettings({ skills: ['total-bar'], numCategories: 6 }), 30);
    qs.forEach(q => {
      expect(q.skill).toBe('total-bar');
      const sorted = [...q.targets].sort((a, b) => a - b);
      expect(sorted).toEqual(q.categories.map((_, i) => i));
    });
  });

  it('answer equals sum of all category values', () => {
    const qs = generateChartQuestions(baseSettings({ skills: ['total-bar'] }), 30);
    qs.forEach(q => {
      const sum = q.categories.reduce((s, c) => s + c.value, 0);
      expect(q.answer).toBe(sum);
    });
  });
});

describe('generateChartQuestions — multi-skill mix', () => {
  it('mixes skills when more than one is selected', () => {
    const allSkills: ChartSkill[] = ['read-bar', 'compare-bar', 'total-bar'];
    const qs = generateChartQuestions(baseSettings({ skills: allSkills }), 200);
    const observed = new Set(qs.map(q => q.skill));
    // With 200 samples across 3 uniform skills, all three must appear.
    expect(observed.has('read-bar')).toBe(true);
    expect(observed.has('compare-bar')).toBe(true);
    expect(observed.has('total-bar')).toBe(true);
  });

  it('every emitted skill is one of the requested skills', () => {
    const qs = generateChartQuestions(
      baseSettings({ skills: ['read-bar', 'total-bar'] }),
      100,
    );
    qs.forEach(q => {
      expect(['read-bar', 'total-bar']).toContain(q.skill);
    });
  });
});

describe('generateChartQuestions — empty/default fallbacks', () => {
  it('empty skills array falls back to read-bar', () => {
    const qs = generateChartQuestions(baseSettings({ skills: [] }), 10);
    expect(qs).toHaveLength(10);
    qs.forEach(q => expect(q.skill).toBe('read-bar'));
  });
});

describe('parseChartAnswer', () => {
  it('parses positive integers', () => {
    expect(parseChartAnswer('0')).toBe(0);
    expect(parseChartAnswer('42')).toBe(42);
    expect(parseChartAnswer('1000')).toBe(1000);
  });

  it('strips whitespace', () => {
    expect(parseChartAnswer('  7  ')).toBe(7);
  });

  it('rejects empty / whitespace-only / non-numeric', () => {
    expect(parseChartAnswer('')).toBeNull();
    expect(parseChartAnswer('   ')).toBeNull();
    expect(parseChartAnswer('foo')).toBeNull();
    expect(parseChartAnswer('3.5')).toBeNull();
    expect(parseChartAnswer('3a')).toBeNull();
  });

  it('accepts negative sign syntactically (matcher will fail mismatch)', () => {
    expect(parseChartAnswer('-3')).toBe(-3);
  });
});

describe('isAnswerCorrect', () => {
  it('matches exact integer', () => {
    const q = {
      skill: 'read-bar' as const,
      categories: [{ label: 'Mon', value: 7 }],
      targets: [0],
      prompt: 'How many?',
      answer: 7,
      unit: 'votes',
    };
    expect(isAnswerCorrect(q, '7')).toBe(true);
    expect(isAnswerCorrect(q, ' 7 ')).toBe(true);
    expect(isAnswerCorrect(q, '8')).toBe(false);
    expect(isAnswerCorrect(q, 'seven')).toBe(false);
  });
});

describe('generateChartQuestions — read-pie skill', () => {
  it('always returns exactly 4 categories', () => {
    const qs = generateChartQuestions(baseSettings({ skills: ['read-pie'] }), 30);
    qs.forEach(q => {
      expect(q.skill).toBe('read-pie');
      expect(q.categories).toHaveLength(4);
    });
  });

  it('targets is exactly one index pointing to the unique extremum', () => {
    const qs = generateChartQuestions(baseSettings({ skills: ['read-pie'] }), 50);
    qs.forEach(q => {
      expect(q.targets).toHaveLength(1);
      const values = q.categories.map(c => c.value);
      const target = q.categories[q.targets[0]].value;
      // The picked target is either the strict max OR the strict min.
      const isMax = values.every(v => v <= target);
      const isMin = values.every(v => v >= target);
      expect(isMax || isMin).toBe(true);
    });
  });

  it('expectedLabel matches the targeted category label', () => {
    const qs = generateChartQuestions(baseSettings({ skills: ['read-pie'] }), 30);
    qs.forEach(q => {
      expect(q.expectedKind).toBe('label');
      expect(q.expectedLabel).toBe(q.categories[q.targets[0]].label);
    });
  });

  it('slice values are positive integers summing to a denominator in {8,10,12}', () => {
    const qs = generateChartQuestions(baseSettings({ skills: ['read-pie'] }), 40);
    qs.forEach(q => {
      q.categories.forEach(c => {
        expect(Number.isInteger(c.value)).toBe(true);
        expect(c.value).toBeGreaterThanOrEqual(1);
      });
      const sum = q.categories.reduce((a, c) => a + c.value, 0);
      expect([8, 10, 12]).toContain(sum);
    });
  });
});

describe('generateChartQuestions — pie-fraction skill', () => {
  it('always returns exactly 4 categories', () => {
    const qs = generateChartQuestions(baseSettings({ skills: ['pie-fraction'] }), 30);
    qs.forEach(q => {
      expect(q.skill).toBe('pie-fraction');
      expect(q.categories).toHaveLength(4);
    });
  });

  it('expectedFraction is reduced and matches target slice / total', () => {
    const qs = generateChartQuestions(baseSettings({ skills: ['pie-fraction'] }), 40);
    qs.forEach(q => {
      expect(q.expectedKind).toBe('fraction');
      expect(q.expectedFraction).toBeDefined();
      const idx = q.targets[0];
      const total = q.categories.reduce((a, c) => a + c.value, 0);
      const expected = reduceFraction(q.categories[idx].value, total);
      expect(q.expectedFraction).toEqual(expected);
    });
  });

  it('one and only one target', () => {
    const qs = generateChartQuestions(baseSettings({ skills: ['pie-fraction'] }), 30);
    qs.forEach(q => expect(q.targets).toHaveLength(1));
  });
});

describe('isAnswerCorrect — pie skills', () => {
  it('read-pie: string label matches expectedLabel', () => {
    const q = {
      skill: 'read-pie' as const,
      categories: [
        { label: 'Apple', value: 6 },
        { label: 'Banana', value: 3 },
        { label: 'Cherry', value: 2 },
        { label: 'Date', value: 1 },
      ],
      targets: [0],
      prompt: 'Which slice is the biggest?',
      answer: 6,
      expectedKind: 'label' as const,
      expectedLabel: 'Apple',
      unit: 'fruit',
    };
    expect(isAnswerCorrect(q, 'Apple')).toBe(true);
    expect(isAnswerCorrect(q, 'Banana')).toBe(false);
    expect(isAnswerCorrect(q, '  Apple  ')).toBe(true);
  });

  it('pie-fraction: "n/d" matches reduced expected fraction', () => {
    const q = {
      skill: 'pie-fraction' as const,
      categories: [
        { label: 'Red', value: 3 },
        { label: 'Blue', value: 3 },
        { label: 'Green', value: 4 },
        { label: 'Yellow', value: 2 },
      ],
      targets: [0],
      prompt: 'What fraction?',
      answer: 3,
      expectedKind: 'fraction' as const,
      expectedFraction: { num: 1, den: 4 }, // 3/12 reduced
      unit: 'votes',
    };
    expect(isAnswerCorrect(q, '1/4')).toBe(true);
    expect(isAnswerCorrect(q, '3/12')).toBe(true); // accepts unreduced
    expect(isAnswerCorrect(q, '2/8')).toBe(true); // also reduces to 1/4
    expect(isAnswerCorrect(q, '1/3')).toBe(false);
    expect(isAnswerCorrect(q, 'foo')).toBe(false);
    expect(isAnswerCorrect(q, '')).toBe(false);
  });
});

describe('parseFractionAnswer', () => {
  it('parses simple fractions and reduces them', () => {
    expect(parseFractionAnswer('1/4')).toEqual({ num: 1, den: 4 });
    expect(parseFractionAnswer('3/12')).toEqual({ num: 1, den: 4 });
    expect(parseFractionAnswer(' 2 / 8 ')).toEqual({ num: 1, den: 4 });
  });

  it('rejects garbage and zero-denominator', () => {
    expect(parseFractionAnswer('')).toBeNull();
    expect(parseFractionAnswer('foo')).toBeNull();
    expect(parseFractionAnswer('1/0')).toBeNull();
    expect(parseFractionAnswer('1.5/4')).toBeNull();
    expect(parseFractionAnswer('-1/4')).toBeNull(); // we only accept non-negative
  });
});

describe('reduceFraction', () => {
  it('reduces common fractions', () => {
    expect(reduceFraction(2, 4)).toEqual({ num: 1, den: 2 });
    expect(reduceFraction(6, 8)).toEqual({ num: 3, den: 4 });
    expect(reduceFraction(5, 10)).toEqual({ num: 1, den: 2 });
  });

  it('zero denominator returns zero fraction safely', () => {
    expect(reduceFraction(0, 0)).toEqual({ num: 0, den: 1 });
  });
});

describe('buildPieSlices', () => {
  it('emits as many slices as values', () => {
    const slices = buildPieSlices([1, 2, 3, 4]);
    expect(slices).toHaveLength(4);
  });

  it('slice spans sum to 2*PI', () => {
    const slices = buildPieSlices([3, 3, 2, 4]);
    const sumSpan = slices.reduce((acc, s) => acc + (s.endAngle - s.startAngle), 0);
    expect(sumSpan).toBeCloseTo(Math.PI * 2);
  });

  it('first slice starts at -PI/2 (top of the circle)', () => {
    const slices = buildPieSlices([1, 1, 1, 1]);
    expect(slices[0].startAngle).toBeCloseTo(-Math.PI / 2);
  });

  it('slices are contiguous (end of i == start of i+1)', () => {
    const slices = buildPieSlices([2, 5, 1, 4]);
    for (let i = 1; i < slices.length; i++) {
      expect(slices[i].startAngle).toBeCloseTo(slices[i - 1].endAngle);
    }
  });

  it('mid-angle is between start and end', () => {
    const slices = buildPieSlices([3, 3, 3, 3]);
    slices.forEach(s => {
      expect(s.midAngle).toBeGreaterThan(s.startAngle - 1e-9);
      expect(s.midAngle).toBeLessThan(s.endAngle + 1e-9);
    });
  });
});

describe('axisMax', () => {
  it('rounds 1..10 range to nearest even (>= 2)', () => {
    expect(axisMax(1)).toBeGreaterThanOrEqual(2);
    expect(axisMax(7)).toBeGreaterThanOrEqual(7);
    expect(axisMax(10)).toBe(10);
  });

  it('rounds 11..100 range up to nearest 10', () => {
    expect(axisMax(11)).toBe(20);
    expect(axisMax(50)).toBe(50);
    expect(axisMax(99)).toBe(100);
  });

  it('rounds 101..1000 range up to nearest 100', () => {
    expect(axisMax(101)).toBe(200);
    expect(axisMax(457)).toBe(500);
    expect(axisMax(1000)).toBe(1000);
  });

  it('handles zero gracefully', () => {
    expect(axisMax(0)).toBe(10);
  });
});

// =============================================================================
// v3: line graphs, timetables, multi-step bars

describe('CHART_SKILL_OPTIONS and CURRICULUM_TAGS — v3 coverage', () => {
  const newSkills: ChartSkill[] = [
    'read-line',
    'line-trend',
    'line-max',
    'timetable-read',
    'timetable-duration',
    'multi-step-bar',
  ];

  it('all new skills appear in the chip list', () => {
    newSkills.forEach(s => expect(CHART_SKILL_OPTIONS).toContain(s));
  });

  it('every skill has a curriculum tag', () => {
    CHART_SKILL_OPTIONS.forEach(s => {
      expect(CURRICULUM_TAGS[s]).toBeDefined();
      expect(CURRICULUM_TAGS[s].strand).toBe('Statistics');
      expect(['Y3', 'Y4', 'Y5']).toContain(CURRICULUM_TAGS[s].year);
    });
  });

  it('chartTypeFor maps skills to renderer family', () => {
    expect(chartTypeFor('read-line')).toBe('line');
    expect(chartTypeFor('line-trend')).toBe('line');
    expect(chartTypeFor('line-max')).toBe('line');
    expect(chartTypeFor('timetable-read')).toBe('timetable');
    expect(chartTypeFor('timetable-duration')).toBe('timetable');
    expect(chartTypeFor('multi-step-bar')).toBe('bar');
    expect(chartTypeFor('read-bar')).toBe('bar');
    expect(chartTypeFor('read-pie')).toBe('pie');
  });

  it('isLineSkill / isTimetableSkill identify families correctly', () => {
    expect(isLineSkill('read-line')).toBe(true);
    expect(isLineSkill('line-trend')).toBe(true);
    expect(isLineSkill('line-max')).toBe(true);
    expect(isLineSkill('read-bar')).toBe(false);
    expect(isTimetableSkill('timetable-read')).toBe(true);
    expect(isTimetableSkill('timetable-duration')).toBe(true);
    expect(isTimetableSkill('read-line')).toBe(false);
  });
});

const baseV3 = (over: Partial<ChartSettings>): ChartSettings => ({
  skills: ['read-line'],
  maxValue: 50,
  numCategories: 5,
  gameMode: 'questions',
  questionCount: 10,
  timeLimit: 60,
  ...over,
});

describe('generateChartQuestions — read-line skill', () => {
  it('emits 5..7 data points and chartType=line', () => {
    const qs = generateChartQuestions(baseV3({ skills: ['read-line'] }), 30);
    qs.forEach(q => {
      expect(q.skill).toBe('read-line');
      expect(q.chartType).toBe('line');
      expect(q.categories.length).toBeGreaterThanOrEqual(5);
      expect(q.categories.length).toBeLessThanOrEqual(7);
    });
  });

  it('targets is exactly one index, answer matches that point value', () => {
    const qs = generateChartQuestions(baseV3({ skills: ['read-line'] }), 30);
    qs.forEach(q => {
      expect(q.targets).toHaveLength(1);
      const idx = q.targets[0];
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(q.categories.length);
      expect(q.answer).toBe(q.categories[idx].value);
    });
  });

  it('prompt references the target label', () => {
    const qs = generateChartQuestions(baseV3({ skills: ['read-line'] }), 20);
    qs.forEach(q => {
      const label = q.categories[q.targets[0]].label;
      expect(q.prompt.includes(label)).toBe(true);
    });
  });
});

describe('generateChartQuestions — line-trend skill', () => {
  it('expectedTrend is rising/falling/flat', () => {
    const qs = generateChartQuestions(baseV3({ skills: ['line-trend'] }), 40);
    const trendsSeen = new Set<string>();
    qs.forEach(q => {
      expect(q.expectedKind).toBe('trend');
      expect(q.expectedTrend).toBeDefined();
      expect(['rising', 'falling', 'flat']).toContain(q.expectedTrend!);
      trendsSeen.add(q.expectedTrend!);
    });
    // With 40 samples and uniform skill choice, all three trends should appear.
    expect(trendsSeen.size).toBeGreaterThanOrEqual(2);
  });

  it('rising data is non-decreasing with a net rise; falling vice-versa; flat is constant', () => {
    const qs = generateChartQuestions(baseV3({ skills: ['line-trend'], maxValue: 50 }), 60);
    qs.forEach(q => {
      const values = q.categories.map(c => c.value);
      if (q.expectedTrend === 'rising') {
        expect(values[values.length - 1]).toBeGreaterThan(values[0]);
      } else if (q.expectedTrend === 'falling') {
        expect(values[values.length - 1]).toBeLessThan(values[0]);
      } else {
        // flat: all equal
        const unique = new Set(values);
        expect(unique.size).toBe(1);
      }
    });
  });
});

describe('generateChartQuestions — line-max skill', () => {
  it('expectedLabel matches the unique-max point', () => {
    const qs = generateChartQuestions(baseV3({ skills: ['line-max'] }), 30);
    qs.forEach(q => {
      expect(q.expectedKind).toBe('label');
      const values = q.categories.map(c => c.value);
      const max = Math.max(...values);
      const maxCount = values.filter(v => v === max).length;
      expect(maxCount).toBe(1);
      const maxIdx = values.indexOf(max);
      expect(q.expectedLabel).toBe(q.categories[maxIdx].label);
    });
  });
});

describe('generateChartQuestions — timetable-read skill', () => {
  it('emits stations and times with the expected shape', () => {
    const qs = generateChartQuestions(baseV3({ skills: ['timetable-read'] }), 20);
    qs.forEach(q => {
      expect(q.chartType).toBe('timetable');
      expect(q.stations).toBeDefined();
      expect(q.times).toBeDefined();
      expect(q.stations!.length).toBeGreaterThanOrEqual(3);
      q.times!.forEach(row => expect(row.length).toBeGreaterThanOrEqual(3));
      // Every time is HH:MM.
      q.times!.forEach(row =>
        row.forEach(t => expect(/^\d{2}:\d{2}$/.test(t)).toBe(true))
      );
    });
  });

  it('expectedTime matches the to-station row for the chosen service', () => {
    const qs = generateChartQuestions(baseV3({ skills: ['timetable-read'] }), 20);
    qs.forEach(q => {
      expect(q.expectedKind).toBe('time');
      const { toIdx, serviceIdx } = q.timetableQuery!;
      expect(q.expectedTime).toBe(q.times![toIdx][serviceIdx]);
    });
  });

  it('prompt mentions both station names', () => {
    const qs = generateChartQuestions(baseV3({ skills: ['timetable-read'] }), 10);
    qs.forEach(q => {
      const { fromIdx, toIdx } = q.timetableQuery!;
      expect(q.prompt.includes(q.stations![fromIdx])).toBe(true);
      expect(q.prompt.includes(q.stations![toIdx])).toBe(true);
    });
  });
});

describe('generateChartQuestions — timetable-duration skill', () => {
  it('answer equals the minute diff of to-time and from-time on chosen service', () => {
    const qs = generateChartQuestions(baseV3({ skills: ['timetable-duration'] }), 20);
    qs.forEach(q => {
      expect(q.expectedKind).toBe('number');
      const { fromIdx, toIdx, serviceIdx } = q.timetableQuery!;
      const from = q.times![fromIdx][serviceIdx];
      const to = q.times![toIdx][serviceIdx];
      const [fh, fm] = from.split(':').map(Number);
      const [th, tm] = to.split(':').map(Number);
      expect(q.answer).toBe((th * 60 + tm) - (fh * 60 + fm));
      expect(q.answer).toBeGreaterThan(0);
    });
  });
});

describe('generateChartQuestions — multi-step-bar skill', () => {
  it('emits chartType=bar with numCategories bars', () => {
    const qs = generateChartQuestions(baseV3({ skills: ['multi-step-bar'], numCategories: 5 }), 20);
    qs.forEach(q => {
      expect(q.chartType).toBe('bar');
      expect(q.categories).toHaveLength(5);
    });
  });

  it('answer is correct for add/sub/diff op', () => {
    const qs = generateChartQuestions(baseV3({ skills: ['multi-step-bar'] }), 50);
    qs.forEach(q => {
      const { op, aIdx, bIdx } = q.multiStepQuery!;
      const A = q.categories[aIdx].value;
      const B = q.categories[bIdx].value;
      if (op === 'add') expect(q.answer).toBe(A + B);
      else if (op === 'sub') expect(q.answer).toBe(A - B); // sub uses ordered targets so A>=B
      else expect(q.answer).toBe(Math.abs(A - B));
      // Answer is always non-negative.
      expect(q.answer).toBeGreaterThanOrEqual(0);
    });
  });

  it('targets is exactly 2 distinct indices', () => {
    const qs = generateChartQuestions(baseV3({ skills: ['multi-step-bar'] }), 20);
    qs.forEach(q => {
      expect(q.targets).toHaveLength(2);
      expect(q.targets[0]).not.toBe(q.targets[1]);
    });
  });
});

describe('parseTimeAnswer', () => {
  it('accepts HH:MM and H:MM, normalises to HH:MM', () => {
    expect(parseTimeAnswer('3:45')).toBe('03:45');
    expect(parseTimeAnswer('03:45')).toBe('03:45');
    expect(parseTimeAnswer('  10:05 ')).toBe('10:05');
    expect(parseTimeAnswer('23:59')).toBe('23:59');
    expect(parseTimeAnswer('0:00')).toBe('00:00');
  });

  it('rejects out-of-range / malformed', () => {
    expect(parseTimeAnswer('')).toBeNull();
    expect(parseTimeAnswer('24:00')).toBeNull();
    expect(parseTimeAnswer('12:60')).toBeNull();
    expect(parseTimeAnswer('1234')).toBeNull();
    expect(parseTimeAnswer('foo:bar')).toBeNull();
    expect(parseTimeAnswer('12-30')).toBeNull();
  });
});

describe('formatHHMM', () => {
  it('formats minutes-since-midnight as zero-padded HH:MM', () => {
    expect(formatHHMM(0)).toBe('00:00');
    expect(formatHHMM(60)).toBe('01:00');
    expect(formatHHMM(75)).toBe('01:15');
    expect(formatHHMM(13 * 60 + 7)).toBe('13:07');
  });
});

describe('isAnswerCorrect — v3 kinds', () => {
  it('trend kind: lowercases input, exact match', () => {
    const q = {
      skill: 'line-trend' as const,
      categories: [{ label: 'Mon', value: 1 }],
      targets: [],
      prompt: '',
      answer: 0,
      unit: 'votes',
      expectedKind: 'trend' as const,
      expectedTrend: 'rising' as const,
    };
    expect(isAnswerCorrect(q, 'rising')).toBe(true);
    expect(isAnswerCorrect(q, 'Rising')).toBe(true);
    expect(isAnswerCorrect(q, '  RISING ')).toBe(true);
    expect(isAnswerCorrect(q, 'falling')).toBe(false);
  });

  it('time kind: accepts H:MM and HH:MM', () => {
    const q = {
      skill: 'timetable-read' as const,
      categories: [],
      targets: [],
      prompt: '',
      answer: 0,
      unit: 'time',
      expectedKind: 'time' as const,
      expectedTime: '07:45',
    };
    expect(isAnswerCorrect(q, '07:45')).toBe(true);
    expect(isAnswerCorrect(q, '7:45')).toBe(true);
    expect(isAnswerCorrect(q, '  7:45 ')).toBe(true);
    expect(isAnswerCorrect(q, '07:46')).toBe(false);
    expect(isAnswerCorrect(q, 'foo')).toBe(false);
  });
});

describe('generateChartChoices', () => {
  const grader = (q: Parameters<typeof isAnswerCorrect>[0]) => (c: string) => !isAnswerCorrect(q, c);

  it('numeric bar-reading skills offer choices with exactly one correct (easy)', () => {
    const qs = generateChartQuestions(baseSettings({ skills: ['read-bar', 'total-bar'] }), 40);
    let offered = 0;
    for (const q of qs) {
      const opts = generateChartChoices(q, 'easy');
      if (opts.length === 0) continue;
      offered++;
      expect(opts).toContain(String(q.answer));
      expect(opts).not.toContain(NONE_OF_THESE);
      expect(opts.filter(o => isChoiceCorrect(o, opts, grader(q))).length).toBe(1);
    }
    expect(offered).toBeGreaterThan(0);
  });

  it('medium (hidden) makes None of these the correct pick', () => {
    const qs = generateChartQuestions(baseSettings({ skills: ['read-bar'] }), 20);
    const q = qs[0];
    const opts = generateChartChoices(q, 'medium', true);
    expect(opts).toContain(NONE_OF_THESE);
    expect(opts).not.toContain(String(q.answer));
    expect(isChoiceCorrect(NONE_OF_THESE, opts, grader(q))).toBe(true);
  });

  it('non-numeric skills (pie-fraction, line-trend) fall back to typed (returns [])', () => {
    const fracQs = generateChartQuestions(baseSettings({ skills: ['pie-fraction'] }), 20);
    for (const q of fracQs) expect(generateChartChoices(q, 'easy')).toEqual([]);
    const trendQs = generateChartQuestions(baseSettings({ skills: ['line-trend'] }), 20);
    for (const q of trendQs) expect(generateChartChoices(q, 'medium')).toEqual([]);
  });
});
