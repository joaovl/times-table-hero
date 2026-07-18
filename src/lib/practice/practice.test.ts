// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

const sessionsLog = vi.fn();
const tokenGet = vi.fn(() => 'tok' as string | null);
const kidTokenGet = vi.fn(() => null as string | null);
const currentKidGet = vi.fn(() => null as { id: string; name: string; color: string; icon: string } | null);
vi.mock('@/lib/api/client', () => ({
  sessionsLog: (...a: unknown[]) => sessionsLog(...a),
  tokenStore: { get: () => tokenGet(), set: vi.fn(), clear: vi.fn() },
  kidTokenStore: { get: () => kidTokenGet(), set: vi.fn(), clear: vi.fn() },
  currentKid: () => currentKidGet(),
}));

import { getLink, setLink, clearLink } from './kidLink';
import { enqueue, flush } from './outbox';
import { recordPractice } from './recordPractice';

const outbox = () => JSON.parse(localStorage.getItem('tth_session_outbox') ?? '[]');
const rec = () => ({ module: 'times-tables', correct: 10, total: 10, durationSec: 300, topics: ['table-8'], startedAt: 'a', endedAt: 'b' });

beforeEach(() => {
  localStorage.clear();
  sessionsLog.mockReset().mockResolvedValue(undefined);
  tokenGet.mockReturnValue('tok');
  kidTokenGet.mockReturnValue(null);
  currentKidGet.mockReturnValue(null);
});

describe('kidLink', () => {
  it('sets, gets and clears a link', () => {
    expect(getLink('p1')).toBeNull();
    setLink('p1', 'k1');
    expect(getLink('p1')).toBe('k1');
    clearLink('p1');
    expect(getLink('p1')).toBeNull();
  });
});

describe('outbox', () => {
  it('flushes queued sessions grouped by kid and clears them on success', async () => {
    enqueue({ id: 's1', kidId: 'k1', ...rec() });
    enqueue({ id: 's2', kidId: 'k1', ...rec() });
    await flush();
    expect(sessionsLog).toHaveBeenCalledTimes(1);
    expect(sessionsLog).toHaveBeenCalledWith('k1', expect.arrayContaining([expect.objectContaining({ id: 's1' })]));
    expect(outbox()).toHaveLength(0);
  });

  it('keeps sessions queued when the flush fails, delivering on retry', async () => {
    enqueue({ id: 's1', kidId: 'k1', ...rec() });
    sessionsLog.mockRejectedValueOnce(new Error('offline'));
    await flush();
    expect(outbox()).toHaveLength(1); // still queued
    await flush();                    // retry succeeds
    expect(outbox()).toHaveLength(0);
  });
});

describe('recordPractice (gating)', () => {
  it('enqueues only when the profile is linked AND a parent is signed in', () => {
    setLink('p1', 'k1');
    recordPractice('p1', rec());
    expect(outbox()).toHaveLength(1);
    expect(outbox()[0].kidId).toBe('k1');
  });

  it('is a no-op for an unlinked profile', () => {
    recordPractice('p1', rec()); // no link set
    expect(outbox()).toHaveLength(0);
  });

  it('is a no-op when no parent is signed in', () => {
    setLink('p1', 'k1');
    tokenGet.mockReturnValue(null);
    recordPractice('p1', rec());
    expect(outbox()).toHaveLength(0);
  });

  it('is a no-op with no profile id', () => {
    recordPractice(undefined, rec());
    expect(outbox()).toHaveLength(0);
  });

  it('logs to the signed-in kid (kid session) regardless of local link or profile id', () => {
    // Phase 3: a kid signed in on a paired device logs straight to their cloud
    // record — no manual link, no parent session, no local profile id needed.
    kidTokenGet.mockReturnValue('kid-tok');
    currentKidGet.mockReturnValue({ id: 'kid9', name: 'Ada', color: 'red', icon: 'star' });
    tokenGet.mockReturnValue(null);
    recordPractice(undefined, rec());
    expect(outbox()).toHaveLength(1);
    expect(outbox()[0].kidId).toBe('kid9');
  });
});
