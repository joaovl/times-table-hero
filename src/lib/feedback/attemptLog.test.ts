// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { recordAttempt, getRecentAttempts, clearRecentAttempts } from './attemptLog';

beforeEach(() => { clearRecentAttempts(); });

const mk = (typed: string) => ({ module: 'times-tables', question: '7 × 8', typed, correct: false, expected: '56' });

describe('attemptLog', () => {
  it('records and returns attempts', () => {
    recordAttempt(mk('54'));
    const list = getRecentAttempts();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ module: 'times-tables', typed: '54', expected: '56' });
    expect(list[0].at).toBeTruthy();
  });

  it('keeps only the last 5', () => {
    for (let i = 1; i <= 7; i++) recordAttempt(mk(String(i)));
    const list = getRecentAttempts();
    expect(list).toHaveLength(5);
    // oldest kept is the 3rd recorded ("3"), newest is "7"
    expect(list[0].typed).toBe('3');
    expect(list[4].typed).toBe('7');
  });
});
