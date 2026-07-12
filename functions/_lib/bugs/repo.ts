import type { Db } from '../auth/types';

export interface BugInput {
  title: string;
  body: string;
  contextJson?: string | null;
  url?: string | null;
  reporter?: string | null;
  severity: 'low' | 'medium' | 'high';
}

export interface PublicBug {
  id: number;
  title: string;
  severity: string;
  status: string;
  created_at: string;
  resolution_md: string | null;
  resolved_at: string | null;
}

/** Insert a bug report; returns its new id. */
export async function createBug(db: Db, b: BugInput, createdAt: string): Promise<number> {
  await db
    .prepare(
      `INSERT INTO bugs (title, body, context_json, url, reporter, severity, status, created_at)
       VALUES (?,?,?,?,?,?, 'open', ?)`,
    )
    .bind(b.title, b.body, b.contextJson ?? null, b.url ?? null, b.reporter ?? null, b.severity, createdAt)
    .run();
  const row = await db.prepare('SELECT last_insert_rowid() AS id').first<{ id: number }>();
  return row?.id ?? 0;
}

/** Public status view — deliberately omits body/reporter/context for privacy. */
export async function getPublicBug(db: Db, id: number): Promise<PublicBug | null> {
  return db
    .prepare('SELECT id, title, severity, status, created_at, resolution_md, resolved_at FROM bugs WHERE id = ?')
    .bind(id)
    .first<PublicBug>();
}

export async function listOpenBugs(db: Db): Promise<unknown[]> {
  const { results } = await db
    .prepare('SELECT id, title, body, context_json, url, reporter, severity, created_at FROM bugs WHERE status = ? ORDER BY id')
    .bind('open')
    .all();
  return results;
}

export async function resolveBug(
  db: Db,
  id: number,
  status: 'fixed' | 'wontfix',
  resolutionMd: string,
  resolvedAt: string,
): Promise<boolean> {
  await db
    .prepare("UPDATE bugs SET status = ?, resolution_md = ?, resolved_at = ? WHERE id = ? AND status = 'open'")
    .bind(status, resolutionMd, resolvedAt, id)
    .run();
  const row = await db.prepare('SELECT status FROM bugs WHERE id = ?').bind(id).first<{ status: string }>();
  return row?.status === status;
}
