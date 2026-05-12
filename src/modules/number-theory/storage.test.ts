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
(globalThis as unknown as { localStorage: MemoryStorage }).localStorage =
  new MemoryStorage();

import {
  getNumberTheorySessions,
  getSavedNumberTheoryPrintConfig,
  getSavedNumberTheorySettings,
  saveNumberTheoryPrintConfig,
  saveNumberTheorySession,
  saveNumberTheorySettings,
} from './storage';

beforeEach(() => {
  localStorage.clear();
});

describe('getSavedNumberTheorySettings — defaults', () => {
  it('returns sensible defaults when nothing is saved', () => {
    const s = getSavedNumberTheorySettings();
    expect(s.skills).toEqual(['factors']);
    expect(s.difficulty).toBe('easy');
    expect(s.gameMode).toBe('questions');
    expect(s.questionCount).toBeGreaterThan(0);
    expect(s.timeLimit).toBeGreaterThan(0);
  });
});

describe('saveNumberTheorySettings / getSavedNumberTheorySettings round-trip', () => {
  it('persists the full settings shape', () => {
    saveNumberTheorySettings({
      skills: ['square', 'cube'],
      difficulty: 'hard',
      gameMode: 'time',
      questionCount: 25,
      timeLimit: 300,
    });
    const s = getSavedNumberTheorySettings();
    expect(s.skills).toEqual(['square', 'cube']);
    expect(s.difficulty).toBe('hard');
    expect(s.gameMode).toBe('time');
    expect(s.questionCount).toBe(25);
    expect(s.timeLimit).toBe(300);
  });

  it('namespaces by userId', () => {
    saveNumberTheorySettings(
      {
        skills: ['factors'],
        difficulty: 'easy',
        gameMode: 'questions',
        questionCount: 10,
        timeLimit: 60,
      },
      'alice'
    );
    saveNumberTheorySettings(
      {
        skills: ['cube'],
        difficulty: 'hard',
        gameMode: 'time',
        questionCount: 50,
        timeLimit: 600,
      },
      'bob'
    );
    expect(getSavedNumberTheorySettings('alice').skills).toEqual(['factors']);
    expect(getSavedNumberTheorySettings('bob').skills).toEqual(['cube']);
  });

  it('falls back to defaults when stored skills are invalid', () => {
    localStorage.setItem(
      'number-theory-settings',
      JSON.stringify({ skills: ['nonsense'], difficulty: 'easy' })
    );
    expect(getSavedNumberTheorySettings().skills).toEqual(['factors']);
  });

  it('falls back when stored JSON is corrupt', () => {
    localStorage.setItem('number-theory-settings', '{not valid json');
    const s = getSavedNumberTheorySettings();
    expect(s.skills).toEqual(['factors']);
  });
});

describe('print config round-trip', () => {
  it('persists pageCount and questionsPerPage', () => {
    saveNumberTheoryPrintConfig({ pageCount: 5, questionsPerPage: 20 });
    const c = getSavedNumberTheoryPrintConfig();
    expect(c.pageCount).toBe(5);
    expect(c.questionsPerPage).toBe(20);
  });

  it('returns defaults when nothing saved', () => {
    const c = getSavedNumberTheoryPrintConfig();
    expect(c.pageCount).toBeGreaterThan(0);
    expect(c.questionsPerPage).toBeGreaterThan(0);
  });
});

describe('saveNumberTheorySession', () => {
  it('appends sessions and keeps the most recent 50', () => {
    for (let i = 0; i < 55; i++) {
      saveNumberTheorySession({
        date: new Date(2026, 0, 1 + i).toISOString(),
        score: i,
        total: 10,
        skills: ['factors'],
        difficulty: 'easy',
      });
    }
    const list = getNumberTheorySessions();
    expect(list.length).toBe(50);
    // Last entry should be the highest score (54).
    expect(list[list.length - 1].score).toBe(54);
  });

  it('namespaces by userId', () => {
    saveNumberTheorySession(
      {
        date: '2026-01-01',
        score: 5,
        total: 10,
        skills: ['factors'],
        difficulty: 'easy',
      },
      'alice'
    );
    saveNumberTheorySession(
      {
        date: '2026-01-02',
        score: 7,
        total: 10,
        skills: ['cube'],
        difficulty: 'hard',
      },
      'bob'
    );
    expect(getNumberTheorySessions('alice')).toHaveLength(1);
    expect(getNumberTheorySessions('bob')).toHaveLength(1);
    expect(getNumberTheorySessions('alice')[0].score).toBe(5);
    expect(getNumberTheorySessions('bob')[0].score).toBe(7);
  });
});
