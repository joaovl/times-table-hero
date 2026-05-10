import { describe, it, expect } from 'vitest';
import {
  allowedMinutes,
  format12h,
  format12hAmPm,
  format24h,
  formatArithEquation,
  generateTimeQuestions,
  isAnswerCorrect,
  parseTimeInput,
  to12hHour,
  expectedAnswerString,
} from './logic';
import type {
  TimePrecision,
  TimeReadQuestion,
  TimeArithQuestion,
  TimeSettings,
} from './logic';

const baseSettings = (over: Partial<TimeSettings>): TimeSettings => ({
  skills: ['read'],
  precisions: ['hour'],
  format: '12h',
  arithDifficulty: 'easy',
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

describe('format12hAmPm', () => {
  it('marks midnight as 12:00 AM', () => {
    expect(format12hAmPm(0, 0)).toBe('12:00 AM');
  });
  it('marks noon as 12:00 PM', () => {
    expect(format12hAmPm(12, 0)).toBe('12:00 PM');
  });
  it('uses AM for hours < 12', () => {
    expect(format12hAmPm(3, 45)).toBe('3:45 AM');
    expect(format12hAmPm(11, 59)).toBe('11:59 AM');
  });
  it('uses PM for hours >= 12', () => {
    expect(format12hAmPm(13, 5)).toBe('1:05 PM');
    expect(format12hAmPm(23, 30)).toBe('11:30 PM');
  });
});

describe('parseTimeInput', () => {
  it('parses canonical h:mm', () => {
    expect(parseTimeInput('3:45')).toEqual({ hours: 3, minutes: 45, ampm: null });
  });

  it('parses padded hh:mm', () => {
    expect(parseTimeInput('03:45')).toEqual({ hours: 3, minutes: 45, ampm: null });
  });

  it('parses 24h hours up to 23', () => {
    expect(parseTimeInput('23:59')).toEqual({ hours: 23, minutes: 59, ampm: null });
  });

  it('parses AM/PM suffix (case-insensitive, with optional dots/space)', () => {
    expect(parseTimeInput('3:45 PM')).toEqual({ hours: 3, minutes: 45, ampm: 'pm' });
    expect(parseTimeInput('3:45pm')).toEqual({ hours: 3, minutes: 45, ampm: 'pm' });
    expect(parseTimeInput('3:45 am')).toEqual({ hours: 3, minutes: 45, ampm: 'am' });
    expect(parseTimeInput('3:45 A.M.')).toEqual({ hours: 3, minutes: 45, ampm: 'am' });
    expect(parseTimeInput('3:45  p.m.')).toEqual({ hours: 3, minutes: 45, ampm: 'pm' });
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

describe('isAnswerCorrect — read-clock', () => {
  it('12h question accepts unpadded and padded forms', () => {
    const q: TimeReadQuestion = {
      skill: 'read',
      hours: 3,
      minutes: 45,
      answer12h: '3:45',
      answer24h: '03:45',
      format: '12h',
    };
    expect(isAnswerCorrect(q, '3:45')).toBe(true);
    expect(isAnswerCorrect(q, '03:45')).toBe(true);
    expect(isAnswerCorrect(q, '4:45')).toBe(false);
    expect(isAnswerCorrect(q, '3:46')).toBe(false);
  });

  it('12h question rejects 13+ or 0 as the typed hour', () => {
    const q: TimeReadQuestion = {
      skill: 'read',
      hours: 3,
      minutes: 0,
      answer12h: '3:00',
      answer24h: '03:00',
      format: '12h',
    };
    expect(isAnswerCorrect(q, '13:00')).toBe(false);
    expect(isAnswerCorrect(q, '0:00')).toBe(false);
  });

  it('24h question requires the 24h hour', () => {
    const q: TimeReadQuestion = {
      skill: 'read',
      hours: 14,
      minutes: 30,
      answer12h: '2:30',
      answer24h: '14:30',
      format: '24h',
    };
    expect(isAnswerCorrect(q, '14:30')).toBe(true);
    expect(isAnswerCorrect(q, '2:30')).toBe(false); // 12h form not allowed
  });

  it('matches noon and midnight cases for 12h', () => {
    const noon: TimeReadQuestion = {
      skill: 'read',
      hours: 12,
      minutes: 0,
      answer12h: '12:00',
      answer24h: '12:00',
      format: '12h',
    };
    expect(isAnswerCorrect(noon, '12:00')).toBe(true);
  });

  it('read-clock accepts an optional AM/PM marker (clock face is ambiguous)', () => {
    const q: TimeReadQuestion = {
      skill: 'read',
      hours: 3,
      minutes: 45,
      answer12h: '3:45',
      answer24h: '03:45',
      format: '12h',
    };
    expect(isAnswerCorrect(q, '3:45 PM')).toBe(true);
    expect(isAnswerCorrect(q, '3:45 AM')).toBe(true);
  });
});

describe('isAnswerCorrect — time-arith', () => {
  // 3:45 AM + 20 mins = 4:05 AM
  const easyAm: TimeArithQuestion = {
    skill: 'arith',
    startHour: 3,
    startMinute: 45,
    deltaMinutes: 20,
    sign: '+',
    format: '12h',
    answer: '4:05 AM',
    resultHour: 4,
    resultMinute: 5,
    crossesMidnight: false,
  };

  it('12h arith requires AM/PM marker', () => {
    expect(isAnswerCorrect(easyAm, '4:05')).toBe(false);
    expect(isAnswerCorrect(easyAm, '4:05 AM')).toBe(true);
    expect(isAnswerCorrect(easyAm, '4:05 am')).toBe(true);
    expect(isAnswerCorrect(easyAm, '04:05 a.m.')).toBe(true);
  });

  it('12h arith rejects wrong AM/PM', () => {
    expect(isAnswerCorrect(easyAm, '4:05 PM')).toBe(false);
  });

  it('12h arith accepts padded hour', () => {
    expect(isAnswerCorrect(easyAm, '04:05 AM')).toBe(true);
  });

  it('24h arith rejects AM/PM, accepts 0..23 hour', () => {
    const q24: TimeArithQuestion = {
      skill: 'arith',
      startHour: 23,
      startMinute: 30,
      deltaMinutes: 45,
      sign: '+',
      format: '24h',
      answer: '00:15',
      resultHour: 0,
      resultMinute: 15,
      crossesMidnight: true,
    };
    expect(isAnswerCorrect(q24, '00:15')).toBe(true);
    expect(isAnswerCorrect(q24, '0:15')).toBe(true);
    expect(isAnswerCorrect(q24, '00:15 AM')).toBe(false);
  });

  it('PM result rejects AM and vice-versa', () => {
    const pmResult: TimeArithQuestion = {
      skill: 'arith',
      startHour: 14,
      startMinute: 0,
      deltaMinutes: 30,
      sign: '+',
      format: '12h',
      answer: '2:30 PM',
      resultHour: 14,
      resultMinute: 30,
      crossesMidnight: false,
    };
    expect(isAnswerCorrect(pmResult, '2:30 PM')).toBe(true);
    expect(isAnswerCorrect(pmResult, '2:30 AM')).toBe(false);
  });
});

describe('formatArithEquation', () => {
  it('renders 12h equation with AM/PM start time', () => {
    const q: TimeArithQuestion = {
      skill: 'arith',
      startHour: 3,
      startMinute: 45,
      deltaMinutes: 20,
      sign: '+',
      format: '12h',
      answer: '4:05 AM',
      resultHour: 4,
      resultMinute: 5,
      crossesMidnight: false,
    };
    expect(formatArithEquation(q)).toBe('3:45 AM + 20 minutes =');
  });

  it('renders 24h equation without AM/PM', () => {
    const q: TimeArithQuestion = {
      skill: 'arith',
      startHour: 14,
      startMinute: 0,
      deltaMinutes: 90,
      sign: '-',
      format: '24h',
      answer: '12:30',
      resultHour: 12,
      resultMinute: 30,
      crossesMidnight: false,
    };
    expect(formatArithEquation(q)).toBe('14:00 - 90 minutes =');
  });

  it('uses singular "minute" for 1', () => {
    const q: TimeArithQuestion = {
      skill: 'arith',
      startHour: 5,
      startMinute: 0,
      deltaMinutes: 1,
      sign: '+',
      format: '24h',
      answer: '05:01',
      resultHour: 5,
      resultMinute: 1,
      crossesMidnight: false,
    };
    expect(formatArithEquation(q)).toBe('05:00 + 1 minute =');
  });
});

describe('expectedAnswerString', () => {
  it('read-clock 12h returns answer12h', () => {
    const q: TimeReadQuestion = {
      skill: 'read',
      hours: 3,
      minutes: 45,
      answer12h: '3:45',
      answer24h: '03:45',
      format: '12h',
    };
    expect(expectedAnswerString(q)).toBe('3:45');
  });

  it('read-clock 24h returns answer24h', () => {
    const q: TimeReadQuestion = {
      skill: 'read',
      hours: 14,
      minutes: 30,
      answer12h: '2:30',
      answer24h: '14:30',
      format: '24h',
    };
    expect(expectedAnswerString(q)).toBe('14:30');
  });

  it('arith returns its pre-computed answer', () => {
    const q: TimeArithQuestion = {
      skill: 'arith',
      startHour: 3,
      startMinute: 45,
      deltaMinutes: 20,
      sign: '+',
      format: '12h',
      answer: '4:05 AM',
      resultHour: 4,
      resultMinute: 5,
      crossesMidnight: false,
    };
    expect(expectedAnswerString(q)).toBe('4:05 AM');
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

describe('generateTimeQuestions — minutes always in precision set (read-clock)', () => {
  it.each<[TimePrecision]>([
    ['hour'],
    ['half'],
    ['quarter'],
    ['5min'],
    ['1min'],
  ])('every minute value belongs to the precision set (%s)', precision => {
    const qs = generateTimeQuestions(
      baseSettings({ skills: ['read'], precisions: [precision] }),
      100
    );
    const allowed = new Set(allowedMinutes(precision));
    qs.forEach(q => {
      if (q.skill === 'read') expect(allowed.has(q.minutes)).toBe(true);
    });
  });

  it('multi-precision: every minute belongs to the union of the chosen sets', () => {
    const qs = generateTimeQuestions(
      baseSettings({ skills: ['read'], precisions: ['hour', 'quarter'] }),
      150
    );
    const allowed = new Set([...allowedMinutes('hour'), ...allowedMinutes('quarter')]);
    qs.forEach(q => {
      if (q.skill === 'read') expect(allowed.has(q.minutes)).toBe(true);
    });
  });
});

describe('generateTimeQuestions — hour ranges per format (read-clock)', () => {
  it('12h: every read-clock question has hours in 1..12', () => {
    const qs = generateTimeQuestions(
      baseSettings({ skills: ['read'], format: '12h', precisions: ['5min'] }),
      200
    );
    qs.forEach(q => {
      expect(q.skill).toBe('read');
      if (q.skill === 'read') {
        expect(q.format).toBe('12h');
        expect(q.hours).toBeGreaterThanOrEqual(1);
        expect(q.hours).toBeLessThanOrEqual(12);
      }
    });
  });

  it('24h: every read-clock question has hours in 0..23', () => {
    const qs = generateTimeQuestions(
      baseSettings({ skills: ['read'], format: '24h', precisions: ['5min'] }),
      200
    );
    qs.forEach(q => {
      expect(q.skill).toBe('read');
      if (q.skill === 'read') {
        expect(q.format).toBe('24h');
        expect(q.hours).toBeGreaterThanOrEqual(0);
        expect(q.hours).toBeLessThanOrEqual(23);
      }
    });
  });

  it('both: yields a mix of 12h and 24h read-clock questions', () => {
    const qs = generateTimeQuestions(
      baseSettings({ skills: ['read'], format: 'both', precisions: ['hour'] }),
      300
    );
    const formats = new Set(qs.map(q => q.format));
    expect(formats.has('12h')).toBe(true);
    expect(formats.has('24h')).toBe(true);
  });

  it('both: the 24h portion can include hours >= 13 (proves the picker really diverges from 12h)', () => {
    const qs = generateTimeQuestions(
      baseSettings({ skills: ['read'], format: 'both', precisions: ['5min'] }),
      400
    );
    const observed = qs.some(q => q.skill === 'read' && q.format === '24h' && q.hours >= 13);
    expect(observed).toBe(true);
  });
});

describe('generateTimeQuestions — answer strings are pre-computed (read-clock)', () => {
  it('answer12h is "h:mm" with 1..12 hour', () => {
    const qs = generateTimeQuestions(
      baseSettings({ skills: ['read'], format: '12h', precisions: ['quarter'] }),
      60
    );
    qs.forEach(q => {
      if (q.skill === 'read') {
        expect(q.answer12h).toMatch(/^([1-9]|1[0-2]):[0-5][0-9]$/);
      }
    });
  });

  it('answer24h is "hh:mm" with 00..23 hour', () => {
    const qs = generateTimeQuestions(
      baseSettings({ skills: ['read'], format: '24h', precisions: ['quarter'] }),
      60
    );
    qs.forEach(q => {
      if (q.skill === 'read') {
        expect(q.answer24h).toMatch(/^([01][0-9]|2[0-3]):[0-5][0-9]$/);
      }
    });
  });
});

describe('generateTimeQuestions — empty/default fallbacks', () => {
  it('empty precisions array falls back to hour-precision (no crash)', () => {
    const qs = generateTimeQuestions(baseSettings({ precisions: [] }), 5);
    expect(qs).toHaveLength(5);
    qs.forEach(q => {
      if (q.skill === 'read') expect(q.minutes).toBe(0);
    });
  });

  it('empty skills array falls back to read-clock', () => {
    const qs = generateTimeQuestions(
      baseSettings({ skills: [] as never, precisions: ['hour'] }),
      10
    );
    qs.forEach(q => expect(q.skill).toBe('read'));
  });
});

describe('generateTimeQuestions — time-arith skill', () => {
  it('produces only arith questions when only arith skill is selected', () => {
    const qs = generateTimeQuestions(
      baseSettings({ skills: ['arith'], precisions: ['5min'] }),
      30
    );
    qs.forEach(q => expect(q.skill).toBe('arith'));
  });

  it('every arith question has the discriminant fields populated', () => {
    const qs = generateTimeQuestions(
      baseSettings({ skills: ['arith'], precisions: ['5min'] }),
      20
    );
    qs.forEach(q => {
      expect(q.skill).toBe('arith');
      if (q.skill === 'arith') {
        expect(q.deltaMinutes).toBeGreaterThan(0);
        expect(['+', '-']).toContain(q.sign);
        expect(q.startHour).toBeGreaterThanOrEqual(0);
        expect(q.startHour).toBeLessThanOrEqual(23);
        expect(q.startMinute).toBeGreaterThanOrEqual(0);
        expect(q.startMinute).toBeLessThanOrEqual(59);
        expect(q.resultHour).toBeGreaterThanOrEqual(0);
        expect(q.resultHour).toBeLessThanOrEqual(23);
        expect(q.resultMinute).toBeGreaterThanOrEqual(0);
        expect(q.resultMinute).toBeLessThanOrEqual(59);
        expect(typeof q.answer).toBe('string');
        expect(q.answer.length).toBeGreaterThan(0);
      }
    });
  });

  it('pre-computed answer always validates as correct', () => {
    const qs = generateTimeQuestions(
      baseSettings({
        skills: ['arith'],
        precisions: ['5min'],
        arithDifficulty: 'medium',
      }),
      50
    );
    qs.forEach(q => {
      if (q.skill === 'arith') {
        expect(isAnswerCorrect(q, q.answer)).toBe(true);
      }
    });
  });

  it('easy arith stays within the same hour (no roll-over)', () => {
    const qs = generateTimeQuestions(
      baseSettings({
        skills: ['arith'],
        precisions: ['5min'],
        arithDifficulty: 'easy',
      }),
      50
    );
    qs.forEach(q => {
      if (q.skill === 'arith') {
        expect(q.resultHour).toBe(q.startHour);
        expect(q.crossesMidnight).toBe(false);
      }
    });
  });

  it('medium arith crosses an hour boundary but not midnight', () => {
    const qs = generateTimeQuestions(
      baseSettings({
        skills: ['arith'],
        precisions: ['5min'],
        arithDifficulty: 'medium',
      }),
      50
    );
    qs.forEach(q => {
      if (q.skill === 'arith') {
        expect(q.resultHour).not.toBe(q.startHour);
        expect(q.crossesMidnight).toBe(false);
      }
    });
  });

  it('hard arith crosses midnight', () => {
    const qs = generateTimeQuestions(
      baseSettings({
        skills: ['arith'],
        precisions: ['5min'],
        arithDifficulty: 'hard',
      }),
      50
    );
    qs.forEach(q => {
      if (q.skill === 'arith') {
        expect(q.crossesMidnight).toBe(true);
      }
    });
  });

  it('mixed skills yield both arith and read questions over a large sample', () => {
    const qs = generateTimeQuestions(
      baseSettings({
        skills: ['read', 'arith'],
        precisions: ['5min'],
      }),
      200
    );
    const kinds = new Set(qs.map(q => q.skill));
    expect(kinds.has('read')).toBe(true);
    expect(kinds.has('arith')).toBe(true);
  });
});
