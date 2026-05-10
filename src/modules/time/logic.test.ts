import { describe, it, expect } from 'vitest';
import {
  allowedMinutes,
  format12h,
  format24h,
  generateTimeQuestions,
  isAnswerCorrect,
  parseTimeInput,
  to12hHour,
} from './logic';
import type { TimePrecision, TimeSettings } from './logic';

const baseSettings = (over: Partial<TimeSettings>): TimeSettings => ({
  precisions: ['hour'],
  format: '12h',
  gameMode: 'questions',
  questionCount: 10,
  timeLimit: 60,
  ...over,
});

describe('allowedMinutes', () => {
  it.each<[TimePrecision, number[]]>([
    ['hour', [0]],
    ['half', [0, 30]],
    ['quarter', [0, 15, 30, 45]],
    ['5min', [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]],
  ])('returns the canonical set for %s', (p, expected) => {
    expect(allowedMinutes(p)).toEqual(expected);
  });

  it('1min returns every minute 0..59', () => {
    expect(allowedMinutes('1min')).toEqual(Array.from({ length: 60 }, (_, i) => i));
  });
});

describe('to12hHour', () => {
  it.each([
    [0, 12],
    [1, 1],
    [11, 11],
    [12, 12],
    [13, 1],
    [23, 11],
    [24, 12],
  ])('to12hHour(%i) = %i', (h, expected) => {
    expect(to12hHour(h)).toBe(expected);
  });
});

describe('format12h / format24h', () => {
  it('format12h pads minutes only', () => {
    expect(format12h(3, 5)).toBe('3:05');
    expect(format12h(12, 30)).toBe('12:30');
    expect(format12h(0, 0)).toBe('12:00'); // 24h hour 0 → 12h hour 12
  });

  it('format24h pads both hour and minute', () => {
    expect(format24h(3, 5)).toBe('03:05');
    expect(format24h(14, 30)).toBe('14:30');
    expect(format24h(0, 0)).toBe('00:00');
  });
});

describe('parseTimeInput', () => {
  it('parses canonical h:mm', () => {
    expect(parseTimeInput('3:45')).toEqual({ hours: 3, minutes: 45 });
  });

  it('parses padded hh:mm', () => {
    expect(parseTimeInput('03:45')).toEqual({ hours: 3, minutes: 45 });
  });

  it('parses 24h hours up to 23', () => {
    expect(parseTimeInput('23:59')).toEqual({ hours: 23, minutes: 59 });
  });

  it('rejects empty/whitespace input', () => {
    expect(parseTimeInput('')).toBeNull();
    expect(parseTimeInput('   ')).toBeNull();
  });

  it('rejects malformed input', () => {
    expect(parseTimeInput('foo')).toBeNull();
    expect(parseTimeInput('3-45')).toBeNull();
    expect(parseTimeInput('3:60')).toBeNull();
    expect(parseTimeInput('24:00')).toBeNull();
    expect(parseTimeInput(':45')).toBeNull();
    expect(parseTimeInput('3:')).toBeNull();
  });
});

describe('isAnswerCorrect', () => {
  it('12h question accepts unpadded and padded forms', () => {
    const q = {
      hours: 3,
      minutes: 45,
      answer12h: '3:45',
      answer24h: '03:45',
      format: '12h' as const,
    };
    expect(isAnswerCorrect(q, '3:45')).toBe(true);
    expect(isAnswerCorrect(q, '03:45')).toBe(true);
    expect(isAnswerCorrect(q, '4:45')).toBe(false);
    expect(isAnswerCorrect(q, '3:46')).toBe(false);
  });

  it('12h question rejects 13+ or 0 as the typed hour', () => {
    const q = {
      hours: 3,
      minutes: 0,
      answer12h: '3:00',
      answer24h: '03:00',
      format: '12h' as const,
    };
    expect(isAnswerCorrect(q, '13:00')).toBe(false);
    expect(isAnswerCorrect(q, '0:00')).toBe(false);
  });

  it('24h question requires the 24h hour', () => {
    const q = {
      hours: 14,
      minutes: 30,
      answer12h: '2:30',
      answer24h: '14:30',
      format: '24h' as const,
    };
    expect(isAnswerCorrect(q, '14:30')).toBe(true);
    expect(isAnswerCorrect(q, '2:30')).toBe(false); // 12h form not allowed
  });

  it('matches noon and midnight cases for 12h', () => {
    const noon = {
      hours: 12,
      minutes: 0,
      answer12h: '12:00',
      answer24h: '12:00',
      format: '12h' as const,
    };
    expect(isAnswerCorrect(noon, '12:00')).toBe(true);
  });
});

describe('generateTimeQuestions — count', () => {
  it('returns the requested number of questions', () => {
    const qs = generateTimeQuestions(baseSettings({}), 25);
    expect(qs).toHaveLength(25);
  });

  it('returns 0 questions when asked for 0', () => {
    const qs = generateTimeQuestions(baseSettings({}), 0);
    expect(qs).toHaveLength(0);
  });
});

describe('generateTimeQuestions — minutes always in precision set', () => {
  it.each<[TimePrecision]>([
    ['hour'],
    ['half'],
    ['quarter'],
    ['5min'],
    ['1min'],
  ])('every minute value belongs to the precision set (%s)', precision => {
    const qs = generateTimeQuestions(baseSettings({ precisions: [precision] }), 100);
    const allowed = new Set(allowedMinutes(precision));
    qs.forEach(q => expect(allowed.has(q.minutes)).toBe(true));
  });

  it('multi-precision: every minute belongs to the union of the chosen sets', () => {
    const qs = generateTimeQuestions(
      baseSettings({ precisions: ['hour', 'quarter'] }),
      150
    );
    const allowed = new Set([...allowedMinutes('hour'), ...allowedMinutes('quarter')]);
    qs.forEach(q => expect(allowed.has(q.minutes)).toBe(true));
  });
});

describe('generateTimeQuestions — hour ranges per format', () => {
  it('12h: every question has hours in 1..12', () => {
    const qs = generateTimeQuestions(
      baseSettings({ format: '12h', precisions: ['5min'] }),
      200
    );
    qs.forEach(q => {
      expect(q.format).toBe('12h');
      expect(q.hours).toBeGreaterThanOrEqual(1);
      expect(q.hours).toBeLessThanOrEqual(12);
    });
  });

  it('24h: every question has hours in 0..23', () => {
    const qs = generateTimeQuestions(
      baseSettings({ format: '24h', precisions: ['5min'] }),
      200
    );
    qs.forEach(q => {
      expect(q.format).toBe('24h');
      expect(q.hours).toBeGreaterThanOrEqual(0);
      expect(q.hours).toBeLessThanOrEqual(23);
    });
  });

  it('both: yields a mix of 12h and 24h questions', () => {
    const qs = generateTimeQuestions(
      baseSettings({ format: 'both', precisions: ['hour'] }),
      300
    );
    const formats = new Set(qs.map(q => q.format));
    expect(formats.has('12h')).toBe(true);
    expect(formats.has('24h')).toBe(true);
  });

  it('both: the 24h portion can include hours ≥ 13 (proves the picker really diverges from 12h)', () => {
    const qs = generateTimeQuestions(
      baseSettings({ format: 'both', precisions: ['5min'] }),
      400
    );
    const observed = qs.some(q => q.format === '24h' && q.hours >= 13);
    expect(observed).toBe(true);
  });
});

describe('generateTimeQuestions — answer strings are pre-computed', () => {
  it('answer12h is "h:mm" with 1..12 hour', () => {
    const qs = generateTimeQuestions(
      baseSettings({ format: '12h', precisions: ['quarter'] }),
      60
    );
    qs.forEach(q => {
      expect(q.answer12h).toMatch(/^([1-9]|1[0-2]):[0-5][0-9]$/);
    });
  });

  it('answer24h is "hh:mm" with 00..23 hour', () => {
    const qs = generateTimeQuestions(
      baseSettings({ format: '24h', precisions: ['quarter'] }),
      60
    );
    qs.forEach(q => {
      expect(q.answer24h).toMatch(/^([01][0-9]|2[0-3]):[0-5][0-9]$/);
    });
  });
});

describe('generateTimeQuestions — empty/default fallbacks', () => {
  it('empty precisions array falls back to hour-precision (no crash)', () => {
    const qs = generateTimeQuestions(baseSettings({ precisions: [] }), 5);
    expect(qs).toHaveLength(5);
    qs.forEach(q => expect(q.minutes).toBe(0));
  });
});
