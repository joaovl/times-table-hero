# Gamification Phase 4 — Frontend Parent-Auth Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Give the React app a parent-auth layer — an API client, an auth context, login/signup UI, and a protected `/parent` area — wired to the Phase 2/3 endpoints, without disturbing the existing no-account app.

**Architecture:** A small typed API client (`src/lib/api/`) stores the session token and calls `/api/*`. An `AuthProvider` context exposes `{ status, account, login, signup, logout }`. A `ParentAuth` screen and a `RequireAuth` guard gate a `/parent` shell. Everything is additive: the Hub and all 15 modules are untouched, and the app still works with no account.

**Tech Stack:** React 18 + TypeScript, react-router-dom, Vitest + @testing-library/react (jsdom), the Phase 2/3 Pages Functions.

## Global Constraints

- The auth layer is **additive and optional**: no changes to the Hub or any module; the app must still run with no account and no backend reachable.
- Session token is stored in `localStorage` under key **`tth_token`** and sent as `Authorization: Bearer <token>`; requests also send `credentials: 'include'` so a same-origin cookie works too.
- API error responses `{ "error": "<code>" }` surface to the UI as an `ApiError` carrying `code`; forms show friendly copy for `email_taken`, `invalid_credentials`, `too_many_attempts`, `invalid_input`.
- Parent routes live under **`/parent`**; `/parent/login` is the unauthenticated entry. Visiting a protected `/parent` route while unauthenticated shows the login screen (no crash, no redirect loop).
- Component tests use the `// @vitest-environment jsdom` pragma (first line) and `@testing-library/react` + `@testing-library/jest-dom/vitest`, matching the existing `*.a11y.test.tsx` convention.
- New files only, plus a minimal wrapping edit to `src/App.tsx` (add `AuthProvider` + `/parent` routes). Do not modify module code.

---

### Task 1: API client + token store

**Files:**
- Create: `src/lib/api/client.ts`
- Test: `src/lib/api/client.test.ts`

**Interfaces:**
- Produces:
  - `tokenStore = { get(): string | null; set(t: string): void; clear(): void }` (localStorage key `tth_token`).
  - `class ApiError extends Error { code: string; status: number }`.
  - `interface AccountInfo { id: string; email: string }`.
  - `authSignup(email: string, password: string): Promise<AccountInfo>` (stores token).
  - `authLogin(email: string, password: string): Promise<AccountInfo>` (stores token).
  - `authLogout(): Promise<void>` (clears token).
  - `authMe(): Promise<AccountInfo | null>`.

- [ ] **Step 1: Write the failing test**

`src/lib/api/client.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { tokenStore, authSignup, authLogin, authLogout, authMe, ApiError } from './client';

const okJson = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});
afterEach(() => vi.restoreAllMocks());

describe('authSignup', () => {
  it('stores the token and returns the account', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      okJson(201, { token: 'tok1', account: { id: 'a1', email: 'p@x.com' } }),
    );
    const account = await authSignup('p@x.com', 'longenough');
    expect(account).toEqual({ id: 'a1', email: 'p@x.com' });
    expect(tokenStore.get()).toBe('tok1');
    // sent to the right endpoint with a JSON body
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/signup', expect.objectContaining({ method: 'POST' }));
  });

  it('throws ApiError with the server code on failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(okJson(409, { error: 'email_taken' }));
    await expect(authSignup('p@x.com', 'longenough')).rejects.toMatchObject({ code: 'email_taken', status: 409 });
    expect(tokenStore.get()).toBeNull();
  });
});

describe('authLogin', () => {
  it('attaches the stored token as a Bearer header on later calls', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(okJson(200, { token: 'tok2', account: { id: 'a1', email: 'p@x.com' } }));
    await authLogin('p@x.com', 'longenough');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okJson(200, { account: { id: 'a1', email: 'p@x.com' } }));
    await authMe();
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok2');
  });
});

describe('authMe', () => {
  it('returns null (not throw) when unauthenticated', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(okJson(401, { error: 'unauthorized' }));
    expect(await authMe()).toBeNull();
  });
});

describe('authLogout', () => {
  it('clears the token', async () => {
    tokenStore.set('tok3');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(okJson(200, { ok: true }));
    await authLogout();
    expect(tokenStore.get()).toBeNull();
  });
});

describe('ApiError', () => {
  it('is an Error carrying code + status', () => {
    const e = new ApiError('bad', 400);
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe('bad');
    expect(e.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/api/client.test.ts`
Expected: FAIL — module `./client` not found.

- [ ] **Step 3: Implement `src/lib/api/client.ts`**

```ts
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/api/client.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/
git commit -m "feat(web-auth): API client and token store"
```

---

### Task 2: Auth context

**Files:**
- Create: `src/lib/auth/AuthContext.tsx`
- Test: `src/lib/auth/AuthContext.test.tsx`

**Interfaces:**
- Consumes: `authSignup`, `authLogin`, `authLogout`, `authMe`, `AccountInfo`, `tokenStore` from `@/lib/api/client`.
- Produces:
  - `AuthProvider` (React component).
  - `useAuth(): { status: 'loading' | 'authed' | 'anon'; account: AccountInfo | null; login(email,password): Promise<void>; signup(email,password): Promise<void>; logout(): Promise<void> }`.

- [ ] **Step 1: Write the failing test**

`src/lib/auth/AuthContext.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

vi.mock('@/lib/api/client', () => ({
  tokenStore: { get: vi.fn(() => null), set: vi.fn(), clear: vi.fn() },
  authMe: vi.fn(),
  authLogin: vi.fn(),
  authSignup: vi.fn(),
  authLogout: vi.fn(),
}));

import { AuthProvider, useAuth } from './AuthContext';
import { tokenStore, authMe, authLogin } from '@/lib/api/client';

function Probe() {
  const { status, account, login } = useAuth();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="email">{account?.email ?? ''}</span>
      <button onClick={() => login('p@x.com', 'longenough')}>login</button>
    </div>
  );
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe('AuthProvider', () => {
  it('starts anon when there is no stored token', async () => {
    (tokenStore.get as ReturnType<typeof vi.fn>).mockReturnValue(null);
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anon'));
  });

  it('validates a stored token via authMe on mount', async () => {
    (tokenStore.get as ReturnType<typeof vi.fn>).mockReturnValue('tok');
    (authMe as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'a1', email: 'stored@x.com' });
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authed'));
    expect(screen.getByTestId('email')).toHaveTextContent('stored@x.com');
  });

  it('login updates the account and status', async () => {
    (tokenStore.get as ReturnType<typeof vi.fn>).mockReturnValue(null);
    (authLogin as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'a1', email: 'p@x.com' });
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anon'));
    fireEvent.click(screen.getByText('login'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authed'));
    expect(screen.getByTestId('email')).toHaveTextContent('p@x.com');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/auth/AuthContext.test.tsx`
Expected: FAIL — module `./AuthContext` not found.

- [ ] **Step 3: Implement `src/lib/auth/AuthContext.tsx`**

```tsx
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { authMe, authLogin, authSignup, authLogout, tokenStore, type AccountInfo } from '@/lib/api/client';

type Status = 'loading' | 'authed' | 'anon';

interface AuthValue {
  status: Status;
  account: AccountInfo | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthCtx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [account, setAccount] = useState<AccountInfo | null>(null);

  useEffect(() => {
    let active = true;
    if (!tokenStore.get()) {
      setStatus('anon');
      return;
    }
    authMe()
      .then(a => {
        if (!active) return;
        if (a) { setAccount(a); setStatus('authed'); }
        else { setStatus('anon'); }
      })
      .catch(() => active && setStatus('anon'));
    return () => { active = false; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const a = await authLogin(email, password);
    setAccount(a);
    setStatus('authed');
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    const a = await authSignup(email, password);
    setAccount(a);
    setStatus('authed');
  }, []);

  const logout = useCallback(async () => {
    await authLogout();
    setAccount(null);
    setStatus('anon');
  }, []);

  return <AuthCtx.Provider value={{ status, account, login, signup, logout }}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/auth/AuthContext.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/
git commit -m "feat(web-auth): auth context provider"
```

---

### Task 3: Parent login/signup screen

**Files:**
- Create: `src/pages/parent/ParentAuth.tsx`
- Test: `src/pages/parent/ParentAuth.test.tsx`

**Interfaces:**
- Consumes: `useAuth` (`@/lib/auth/AuthContext`), `ApiError` (`@/lib/api/client`).
- Produces: `ParentAuth` (default export) — a form with email + password, a Login/Sign up toggle, error display, and a submit that calls `login`/`signup`.

- [ ] **Step 1: Write the failing test**

`src/pages/parent/ParentAuth.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

const login = vi.fn();
const signup = vi.fn();
vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({ status: 'anon', account: null, login, signup, logout: vi.fn() }),
}));

import ParentAuth from './ParentAuth';
import { ApiError } from '@/lib/api/client';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const type = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('ParentAuth', () => {
  it('logs in with entered credentials', async () => {
    login.mockResolvedValue(undefined);
    render(<ParentAuth />);
    type(/email/i, 'p@x.com');
    type(/password/i, 'longenough');
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));
    await waitFor(() => expect(login).toHaveBeenCalledWith('p@x.com', 'longenough'));
  });

  it('shows a friendly message on invalid credentials', async () => {
    login.mockRejectedValue(new ApiError('invalid_credentials', 401));
    render(<ParentAuth />);
    type(/email/i, 'p@x.com');
    type(/password/i, 'wrongpass');
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));
    await waitFor(() => expect(screen.getByText(/email or password is incorrect/i)).toBeInTheDocument());
  });

  it('can switch to sign up and calls signup', async () => {
    signup.mockResolvedValue(undefined);
    render(<ParentAuth />);
    fireEvent.click(screen.getByRole('button', { name: /create an account/i }));
    type(/email/i, 'new@x.com');
    type(/password/i, 'longenough');
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
    await waitFor(() => expect(signup).toHaveBeenCalledWith('new@x.com', 'longenough'));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/pages/parent/ParentAuth.test.tsx`
Expected: FAIL — module `./ParentAuth` not found.

- [ ] **Step 3: Implement `src/pages/parent/ParentAuth.tsx`**

```tsx
import { useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { ApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const MESSAGES: Record<string, string> = {
  invalid_credentials: 'That email or password is incorrect.',
  email_taken: 'An account with that email already exists. Try logging in.',
  too_many_attempts: 'Too many attempts. Please wait a few minutes and try again.',
  invalid_input: 'Please enter a valid email and a password of at least 8 characters.',
};

export default function ParentAuth() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') await login(email, password);
      else await signup(email, password);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'request_failed';
      setError(MESSAGES[code] ?? 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm p-6 space-y-4">
        <h1 className="text-2xl font-bold text-center">
          {mode === 'login' ? 'Parent login' : 'Create parent account'}
        </h1>
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm font-medium" htmlFor="email">Email</label>
          <Input id="email" type="email" autoComplete="email" value={email}
            onChange={e => setEmail(e.target.value)} />
          <label className="block text-sm font-medium" htmlFor="password">Password</label>
          <Input id="password" type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password} onChange={e => setPassword(e.target.value)} />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {mode === 'login' ? 'Log in' : 'Sign up'}
          </Button>
        </form>
        <button
          type="button"
          className="w-full text-sm text-muted-foreground underline"
          onClick={() => { setError(''); setMode(mode === 'login' ? 'signup' : 'login'); }}
        >
          {mode === 'login' ? 'Create an account' : 'I already have an account'}
        </button>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/pages/parent/ParentAuth.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/pages/parent/ParentAuth.tsx src/pages/parent/ParentAuth.test.tsx
git commit -m "feat(web-auth): parent login/signup screen"
```

---

### Task 4: Protected parent shell + routes

**Files:**
- Create: `src/pages/parent/RequireAuth.tsx`
- Create: `src/pages/parent/ParentHome.tsx`
- Modify: `src/App.tsx` (wrap in `AuthProvider`, add `/parent` routes)
- Test: `src/pages/parent/ParentShell.test.tsx`

**Interfaces:**
- Consumes: `useAuth`, `ParentAuth`.
- Produces: `RequireAuth` (renders children when authed, `ParentAuth` when anon, a spinner when loading); `ParentHome` (greets the account, has a logout button).

- [ ] **Step 1: Write the failing test**

`src/pages/parent/ParentShell.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

let mockAuth: { status: string; account: { email: string } | null; logout: () => void };
vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

import RequireAuth from './RequireAuth';
import ParentHome from './ParentHome';

afterEach(() => { cleanup(); });

describe('RequireAuth', () => {
  it('shows the login screen when anon', () => {
    mockAuth = { status: 'anon', account: null, logout: vi.fn() };
    render(<RequireAuth><div>secret</div></RequireAuth>);
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });

  it('renders children when authed', () => {
    mockAuth = { status: 'authed', account: { email: 'p@x.com' }, logout: vi.fn() };
    render(<RequireAuth><div>secret</div></RequireAuth>);
    expect(screen.getByText('secret')).toBeInTheDocument();
  });
});

describe('ParentHome', () => {
  it('greets the signed-in parent', () => {
    mockAuth = { status: 'authed', account: { email: 'p@x.com' }, logout: vi.fn() };
    render(<ParentHome />);
    expect(screen.getByText(/p@x.com/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/pages/parent/ParentShell.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `src/pages/parent/RequireAuth.tsx`**

```tsx
import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import ParentAuth from './ParentAuth';

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-xl font-bold text-primary" role="status" aria-live="polite">Loading…</div>
      </div>
    );
  }
  if (status === 'anon') return <ParentAuth />;
  return <>{children}</>;
}
```

- [ ] **Step 4: Implement `src/pages/parent/ParentHome.tsx`**

```tsx
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function ParentHome() {
  const { account, logout } = useAuth();
  return (
    <div className="min-h-screen bg-background p-4 max-w-2xl mx-auto space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Parent area</h1>
        <Button variant="outline" onClick={() => logout()}>Log out</Button>
      </header>
      <Card className="p-5">
        <p className="text-muted-foreground">Signed in as <span className="font-semibold text-foreground">{account?.email}</span>.</p>
        <p className="text-sm text-muted-foreground mt-2">Kids and the reward &ldquo;bribe area&rdquo; will appear here.</p>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: Wire `src/App.tsx`** — wrap the router in `AuthProvider` and add the `/parent` routes. Add these imports near the top:

```tsx
import { AuthProvider } from '@/lib/auth/AuthContext';
import RequireAuth from './pages/parent/RequireAuth';
import ParentHome from './pages/parent/ParentHome';
```

Wrap the existing `<BrowserRouter>…</BrowserRouter>` with `<AuthProvider>…</AuthProvider>`, and add inside `<Routes>` (alongside the existing routes):

```tsx
          <Route path="/parent" element={<RequireAuth><ParentHome /></RequireAuth>} />
```

- [ ] **Step 6: Run to verify it passes**

Run: `npx vitest run src/pages/parent/ParentShell.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add src/pages/parent/RequireAuth.tsx src/pages/parent/ParentHome.tsx src/App.tsx src/pages/parent/ParentShell.test.tsx
git commit -m "feat(web-auth): protected /parent shell and routing"
```

---

### Task 5: Full-suite green + build

**Files:** none (verification).

- [ ] **Step 1: Run the entire unit suite**

Run: `npx vitest run`
Expected: all prior tests plus the new web-auth tests pass; the Hub and modules are unaffected.

- [ ] **Step 2: Production build sanity**

Run: `npm run build`
Expected: build succeeds (the new `/parent` route + AuthProvider compile and bundle cleanly).

No commit (verification only).

---

## Self-Review

**Spec coverage (design doc, client changes: `src/lib/api.ts`, auth context, `/parent` screens):**
- Typed API client + token transport (bearer + cookie) → Task 1. ✅
- Auth context exposing login/signup/logout/status → Task 2. ✅
- Login/signup UI with friendly error copy → Task 3. ✅
- Protected `/parent` area, no crash when unauthenticated → Task 4. ✅
- Additive/optional (Hub + modules untouched; app works with no backend) → Global Constraints; only `App.tsx` is wrapped, no module edits. ✅
- Out of scope (later phases): kids-management UI, the reward-rules form, dashboard, kid indicator, session logging. Intentional.

**Placeholder scan:** No TBD/TODO; every code step is complete.

**Type consistency:** `AccountInfo`, `ApiError`, `tokenStore`, `authSignup/authLogin/authLogout/authMe` (Task 1) are consumed unchanged by the context (Task 2); `useAuth()`'s shape `{ status, account, login, signup, logout }` is consumed identically by `ParentAuth`, `RequireAuth`, and `ParentHome` (Tasks 3–4). The `status` union `'loading'|'authed'|'anon'` is used consistently.
