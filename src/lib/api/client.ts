import type { RewardRulesConfig } from '@/lib/rewards-types';

const TOKEN_KEY = 'tth_token';
const PAIRING_TOKEN_KEY = 'tth_pairing_token';
const KID_TOKEN_KEY = 'tth_kid_token';
const CURRENT_KID_KEY = 'tth_current_kid';

export const tokenStore = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (t: string): void => localStorage.setItem(TOKEN_KEY, t),
  clear: (): void => localStorage.removeItem(TOKEN_KEY),
};

export const pairingTokenStore = {
  get: (): string | null => localStorage.getItem(PAIRING_TOKEN_KEY),
  set: (t: string): void => localStorage.setItem(PAIRING_TOKEN_KEY, t),
  clear: (): void => localStorage.removeItem(PAIRING_TOKEN_KEY),
};

// The kid session token + the currently signed-in kid, on a paired device.
export const kidTokenStore = {
  get: (): string | null => localStorage.getItem(KID_TOKEN_KEY),
  set: (t: string): void => localStorage.setItem(KID_TOKEN_KEY, t),
  clear: (): void => localStorage.removeItem(KID_TOKEN_KEY),
};

export interface PairKid { id: string; name: string; color: string; icon: string }

export function currentKid(): PairKid | null {
  try {
    const raw = localStorage.getItem(CURRENT_KID_KEY);
    return raw ? (JSON.parse(raw) as PairKid) : null;
  } catch {
    return null;
  }
}

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
  opts: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  // `token` overrides the default parent-session token when provided (even null)
  // — used to send a device-pairing token or a kid session token instead.
  const token = opts.token !== undefined ? opts.token : tokenStore.get();
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

async function authCall(path: string, email: string, password: string, pin?: string): Promise<AccountInfo> {
  const { status, data } = await apiFetch<{ token: string; account: AccountInfo }>(path, {
    method: 'POST',
    body: pin !== undefined ? { email, password, pin } : { email, password },
  });
  if (status >= 400 || !data) throw new ApiError(codeOf(data), status);
  tokenStore.set(data.token);
  return data.account;
}

export function authSignup(email: string, password: string, pin?: string): Promise<AccountInfo> {
  return authCall('/api/auth/signup', email, password, pin);
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
export interface KidInput { name: string; color: string; icon: string; pin?: string }
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

export async function kidsUpdate(id: string, input: KidInput): Promise<Kid> {
  const { status, data } = await apiFetch<{ kid: Kid }>(`/api/kids/${id}`, { method: 'PUT', body: input });
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
  // Prefer the kid session token when a kid is signed in (practice logs directly
  // to that kid); otherwise fall back to the parent-session token (legacy path).
  const kidTok = kidTokenStore.get();
  const { status, data } = await apiFetch<{ inserted: number }>(
    '/api/sessions',
    { method: 'POST', body: { kidId, sessions }, token: kidTok ?? undefined },
  );
  if (status >= 400) throw new ApiError(codeOf(data), status);
}

export interface DashboardDay { date: string; status: string }
export interface DashboardTier { threshold: number; reward: string; earned: boolean }
interface DashboardBase {
  totalSuccessfulDays: number;
  tiers: DashboardTier[];
  days: DashboardDay[];
  paused: boolean;
}
export type DashboardData =
  | ({ mode: 'balance'; unitLabel: string; balanceUnits: number } & DashboardBase)
  | ({ mode: 'fixed'; dailyReward: string } & DashboardBase)
  | { mode: 'none' };

export async function dashboardGet(kidId: string): Promise<DashboardData> {
  const { status, data } = await apiFetch<DashboardData>(`/api/dashboard?kidId=${encodeURIComponent(kidId)}`);
  if (status !== 200 || !data) throw new ApiError(codeOf(data), status);
  return data;
}

export interface BugReportInput {
  title: string;
  body: string;
  severity: 'low' | 'medium' | 'high';
  url?: string;
  reporter?: string | null;
  context?: unknown;
}

export async function bugReport(input: BugReportInput): Promise<number> {
  const { status, data } = await apiFetch<{ id: number }>('/api/bugs', { method: 'POST', body: input });
  if (status >= 400 || !data) throw new ApiError(codeOf(data), status);
  return data.id;
}

export interface PairedDevice {
  tokenHashPrefix: string;
  label: string;
  createdAt: string;
  expiresAt: string;
}

export async function pairDevice(email: string, pin: string): Promise<{ token: string }> {
  const { status, data } = await apiFetch<{ token: string }>('/api/pair', { method: 'POST', body: { email, pin } });
  if (status >= 400 || !data) throw new ApiError(codeOf(data), status);
  pairingTokenStore.set(data.token);
  return data;
}

export async function pairList(): Promise<PairedDevice[]> {
  const { status, data } = await apiFetch<{ devices: PairedDevice[] }>('/api/pair/list');
  if (status !== 200 || !data) throw new ApiError(codeOf(data), status);
  return data.devices;
}

export async function pairRevoke(tokenHashPrefix: string): Promise<void> {
  const { status, data } = await apiFetch<{ ok: true }>('/api/pair/revoke', { method: 'POST', body: { tokenHashPrefix } });
  if (status >= 400) throw new ApiError(codeOf(data), status);
}

// List the paired account's kids for the "Who's playing?" screen — authenticated
// by the device-pairing token, not a parent session.
export async function pairKids(): Promise<PairKid[]> {
  const { status, data } = await apiFetch<{ kids: PairKid[] }>('/api/pair/kids', { token: pairingTokenStore.get() });
  if (status !== 200 || !data) throw new ApiError(codeOf(data), status);
  return data.kids;
}

// Sign a kid in with their PIN on a paired device; stores the kid session token
// and the current kid so practice logs straight to that kid's cloud record.
export async function kidSignin(kid: PairKid, pin: string): Promise<void> {
  const { status, data } = await apiFetch<{ token: string }>(
    '/api/kid/signin',
    { method: 'POST', body: { kidId: kid.id, pin }, token: pairingTokenStore.get() },
  );
  if (status >= 400 || !data) throw new ApiError(codeOf(data), status);
  kidTokenStore.set(data.token);
  localStorage.setItem(CURRENT_KID_KEY, JSON.stringify(kid));
}

export function kidSignout(): void {
  kidTokenStore.clear();
  localStorage.removeItem(CURRENT_KID_KEY);
}
