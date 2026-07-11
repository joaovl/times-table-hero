import type { RewardRulesConfig } from '@/lib/rewards-types';

const TOKEN_KEY = 'tth_token';

export const tokenStore = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (t: string): void => localStorage.setItem(TOKEN_KEY, t),
  clear: (): void => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, status: number) {
    super(code);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

export interface AccountInfo {
  id: string;
  email: string;
}

interface ApiResult<T> {
  status: number;
  data: T | null;
}

async function apiFetch<T>(
  path: string,
  opts: { method?: string; body?: unknown } = {},
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(path, {
    method: opts.method ?? 'GET',
    headers,
    credentials: 'include',
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  let data: T | null = null;
  try {
    data = (await res.json()) as T;
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

function codeOf(data: unknown): string {
  return typeof data === 'object' && data !== null && 'error' in data
    ? String((data as { error: unknown }).error)
    : 'request_failed';
}

async function authCall(path: string, email: string, password: string): Promise<AccountInfo> {
  const { status, data } = await apiFetch<{ token: string; account: AccountInfo }>(path, {
    method: 'POST',
    body: { email, password },
  });
  if (status >= 400 || !data) throw new ApiError(codeOf(data), status);
  tokenStore.set(data.token);
  return data.account;
}

export function authSignup(email: string, password: string): Promise<AccountInfo> {
  return authCall('/api/auth/signup', email, password);
}

export function authLogin(email: string, password: string): Promise<AccountInfo> {
  return authCall('/api/auth/login', email, password);
}

export async function authLogout(): Promise<void> {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' });
  } finally {
    tokenStore.clear();
  }
}

export async function authMe(): Promise<AccountInfo | null> {
  const { status, data } = await apiFetch<{ account: AccountInfo }>('/api/auth/me');
  if (status !== 200 || !data) return null;
  return data.account;
}

export interface Kid { id: string; name: string; color: string; icon: string }
export interface KidInput { name: string; color: string; icon: string }
export interface RulesRow { kidId: string | null; config: RewardRulesConfig; updatedAt: string }

export async function kidsList(): Promise<Kid[]> {
  const { status, data } = await apiFetch<{ kids: Kid[] }>('/api/kids');
  if (status !== 200 || !data) throw new ApiError(codeOf(data), status);
  return data.kids;
}

export async function kidsCreate(input: KidInput): Promise<Kid> {
  const { status, data } = await apiFetch<{ kid: Kid }>('/api/kids', { method: 'POST', body: input });
  if (status >= 400 || !data) throw new ApiError(codeOf(data), status);
  return data.kid;
}

export async function kidsDelete(id: string): Promise<void> {
  const { status, data } = await apiFetch<{ ok: true }>(`/api/kids/${id}`, { method: 'DELETE' });
  if (status >= 400) throw new ApiError(codeOf(data), status);
}

export async function rulesList(): Promise<RulesRow[]> {
  const { status, data } = await apiFetch<{ rules: RulesRow[] }>('/api/rules');
  if (status !== 200 || !data) throw new ApiError(codeOf(data), status);
  return data.rules;
}

export async function rulesPut(kidId: string | null, config: RewardRulesConfig): Promise<void> {
  const { status, data } = await apiFetch<{ ok: true }>('/api/rules', { method: 'PUT', body: { kidId, rules: config } });
  if (status >= 400) throw new ApiError(codeOf(data), status);
}

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

export async function sessionsLog(kidId: string, sessions: SessionInput[]): Promise<void> {
  const { status, data } = await apiFetch<{ inserted: number }>('/api/sessions', { method: 'POST', body: { kidId, sessions } });
  if (status >= 400) throw new ApiError(codeOf(data), status);
}

export interface DashboardDay { date: string; units?: number; status: string }
export type DashboardData =
  | { mode: 'balance'; unitLabel: string; balanceUnits: number; days: DashboardDay[] }
  | { mode: 'fixed'; earned: { periodType: string; periodKey: string; rewardLabel: string }[]; days: DashboardDay[] }
  | { mode: 'none' };

export async function dashboardGet(kidId: string): Promise<DashboardData> {
  const { status, data } = await apiFetch<DashboardData>(`/api/dashboard?kidId=${encodeURIComponent(kidId)}`);
  if (status !== 200 || !data) throw new ApiError(codeOf(data), status);
  return data;
}
