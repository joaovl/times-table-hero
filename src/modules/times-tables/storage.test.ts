import { describe, it, expect, beforeEach } from 'vitest';

// Minimal in-memory localStorage shim for the Node test environment.
class MemoryStorage {
  private store = new Map<string, string>();
  get length() { return this.store.size; }
  clear() { this.store.clear(); }
  getItem(k: string) { return this.store.has(k) ? this.store.get(k)! : null; }
  setItem(k: string, v: string) { this.store.set(k, String(v)); }
  removeItem(k: string) { this.store.delete(k); }
  key(i: number) { return Array.from(this.store.keys())[i] ?? null; }
}
(globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();

import {
  getSavedSettings,
  getSavedPrintSettings,
  getQuestionKey,
  recordAnswer,
  getProgress,
} from './storage';
import type { Question } from './logic';

beforeEach(() => {
  localStorage.clear();
});

describe('getSavedSettings migration', () => {
  it("rewrites legacy 'both' to 'all'", () => {
    localStorage.setItem(
      'maths-challenge-settings',
      JSON.stringify({
        tables: [1, 2],
        difficulty: 'medium',
        gameMode: 'time',
        operation: 'both',
        questionCount: 10,
        timeLimit: 180,
      })
    );
    const s = getSavedSettings();
    expect(s.operation).toBe('all');
  });

  it('passes through non-legacy values unchanged', () => {
    localStorage.setItem(
      'maths-challenge-settings',
      JSON.stringify({
        tables: [1],
        difficulty: 'easy',
        gameMode: 'questions',
        operation: 'square',
        questionCount: 5,
        timeLimit: 60,
      })
    );
    expect(getSavedSettings().operation).toBe('square');
  });
});

describe('getSavedPrintSettings migration', () => {
  it("rewrites legacy 'both' to 'all'", () => {
    localStorage.setItem(
      'maths-challenge-printSettings',
      JSON.stringify({ tables: [1], operation: 'both', questionCount: 40, pageCount: 1 })
    );
    expect(getSavedPrintSettings().operation).toBe('all');
  });
});

describe('getQuestionKey', () => {
  it('multiply uses NxN', () => {
    const q: Question = { kind: 'binary', op: 'multiply', operand1: 7, operand2: 8, answer: 56 };
    expect(getQuestionKey(q)).toBe('7x8');
  });

  it('divide uses NdN', () => {
    const q: Question = { kind: 'binary', op: 'divide', operand1: 56, operand2: 7, answer: 8 };
    expect(getQuestionKey(q)).toBe('56d7');
  });

  it('square uses Nsq', () => {
    const q: Question = { kind: 'unary', op: 'square', operand: 7, answer: 49 };
    expect(getQuestionKey(q)).toBe('7sq');
  });

  it('sqrt uses Nrt (radicand)', () => {
    const q: Question = { kind: 'unary', op: 'sqrt', operand: 49, answer: 7 };
    expect(getQuestionKey(q)).toBe('49rt');
  });
});

describe('recordAnswer', () => {
  it('increments timesCorrect for correct answers', () => {
    const q: Question = { kind: 'unary', op: 'square', operand: 7, answer: 49 };
    recordAnswer(q, true);
    recordAnswer(q, true);
    const progress = getProgress();
    expect(progress['7sq'].timesCorrect).toBe(2);
    expect(progress['7sq'].timesWrong).toBe(0);
  });

  it('increments timesWrong for incorrect answers', () => {
    const q: Question = { kind: 'unary', op: 'sqrt', operand: 49, answer: 7 };
    recordAnswer(q, false);
    expect(getProgress()['49rt'].timesWrong).toBe(1);
  });
});
