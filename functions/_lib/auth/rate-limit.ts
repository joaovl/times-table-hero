import type { Db } from './types';

const DEFAULT_MAX = 10;
const DEFAULT_WINDOW_MS = 900_000; // 15 minutes

/** Start-of-window ISO key: floor(now / windowMs) * windowMs. */
export function windowKey(now: Date, windowMs: number): string {
  return new Date(Math.floor(now.getTime() / windowMs) * windowMs).toISOString();
}

export async function recordAndCheck(
  db: Db,
  email: string,
  now: Date,
  opts: { maxAttempts?: number; windowMs?: number } = {},
): Promise<{ blocked: boolean }> {
  const max = opts.maxAttempts ?? DEFAULT_MAX;
  const windowMs = opts.windowMs ?? DEFAULT_WINDOW_MS;
  const key = windowKey(now, windowMs);

  await db
    .prepare(
      `INSERT INTO login_attempts (email, window_start, count) VALUES (?, ?, 1)
       ON CONFLICT(email, window_start) DO UPDATE SET count = count + 1`,
    )
    .bind(email, key)
    .run();

  const row = await db
    .prepare('SELECT count FROM login_attempts WHERE email = ? AND window_start = ?')
    .bind(email, key)
    .first<{ count: number }>();

  return { blocked: (row?.count ?? 0) > max };
}
