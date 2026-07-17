// Minimal async subset of the D1 API our repo uses. Cloudflare's real
// D1Database satisfies this structurally; the test adapter implements it over
// node:sqlite. Keeping our own interface (instead of importing D1Database)
// keeps the repo unit-testable without the Workers runtime.
export interface Stmt {
  bind(...args: unknown[]): Stmt;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<{ success: boolean }>;
  all<T = unknown>(): Promise<{ results: T[] }>;
}
export interface Db {
  prepare(sql: string): Stmt;
}

export interface Env {
  DB: Db;
}

export interface Account {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  tzOffsetMin: number;
  createdAt: string;
  pairingPinHash: string | null;
  pairingPinSalt: string | null;
}
