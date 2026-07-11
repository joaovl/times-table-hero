import type { Db } from '../auth/types';
import type { PracticeSession } from '../rewards/types';

export interface SessionInput {
  id: string;
  startedAt: string;
  endedAt: string;
  durationSec: number;
  module: string;
  correct: number;
  total: number;
  topics: string[];
}

interface SessionRow {
  id: string;
  kid_id: string;
  started_at: string;
  duration_sec: number;
  module: string;
  correct: number;
  total: number;
  topics_json: string;
}

/** Insert practice sessions for a kid, idempotent by the client-provided id. */
export async function insertSessions(db: Db, kidId: string, sessions: SessionInput[]): Promise<number> {
  let inserted = 0;
  for (const s of sessions) {
    await db
      .prepare(
        `INSERT OR IGNORE INTO practice_sessions
           (id, kid_id, started_at, ended_at, duration_sec, module, correct, total, topics_json, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
      )
      .bind(
        s.id, kidId, s.startedAt, s.endedAt, s.durationSec, s.module,
        s.correct, s.total, JSON.stringify(s.topics ?? []), new Date().toISOString(),
      )
      .run();
    inserted++;
  }
  return inserted;
}

/** All of a kid's sessions, mapped to the engine's PracticeSession shape. */
export async function listSessions(db: Db, kidId: string): Promise<PracticeSession[]> {
  const { results } = await db
    .prepare('SELECT * FROM practice_sessions WHERE kid_id = ? ORDER BY started_at ASC')
    .bind(kidId)
    .all<SessionRow>();
  return results.map(r => ({
    kidId: r.kid_id,
    startedAt: r.started_at,
    durationSec: r.duration_sec,
    module: r.module,
    correct: r.correct,
    total: r.total,
    topics: JSON.parse(r.topics_json) as string[],
  }));
}
