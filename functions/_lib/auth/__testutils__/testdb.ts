import { readFileSync } from 'node:fs';
import type { Db, Stmt } from '../types';

// node:sqlite prints a one-time ExperimentalWarning the first time the module
// is loaded. We patch process.emitWarning HERE (before the dynamic import
// below) so the warning is silenced and integration-test output stays pristine.
// Static `import` statements are hoisted above module body code, so we use a
// top-level-await dynamic import to guarantee the patch fires first.
const originalEmit = process.emitWarning.bind(process);
process.emitWarning = ((warning: string | Error, ...rest: unknown[]) => {
  const msg = typeof warning === 'string' ? warning : warning?.message ?? '';
  if (msg.includes('SQLite is an experimental feature')) return;
  return (originalEmit as (w: string | Error, ...r: unknown[]) => void)(warning, ...rest);
}) as typeof process.emitWarning;

// Dynamic import so the patch above is installed before node:sqlite loads.
const { DatabaseSync } = await import('node:sqlite');
type DatabaseSyncType = InstanceType<typeof DatabaseSync>;

function stmt(db: DatabaseSyncType, sql: string, bound: unknown[]): Stmt {
  return {
    bind(...args: unknown[]): Stmt {
      return stmt(db, sql, args);
    },
    async first<T = unknown>(): Promise<T | null> {
      const row = db.prepare(sql).get(...(bound as never[]));
      return (row ?? null) as T | null;
    },
    async run(): Promise<{ success: boolean }> {
      db.prepare(sql).run(...(bound as never[]));
      return { success: true };
    },
    async all<T = unknown>(): Promise<{ results: T[] }> {
      const rows = db.prepare(sql).all(...(bound as never[]));
      return { results: rows as T[] };
    },
  };
}

export function createTestDb(migrationPaths: string[]): Db {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  for (const p of migrationPaths) db.exec(readFileSync(p, 'utf8'));
  return {
    prepare(sql: string): Stmt {
      return stmt(db, sql, []);
    },
  };
}
