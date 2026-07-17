import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { authMe, authLogin, authSignup, authLogout, tokenStore, type AccountInfo } from '@/lib/api/client';

type Status = 'loading' | 'authed' | 'anon';

interface AuthValue {
  status: Status;
  account: AccountInfo | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, pin?: string) => Promise<void>;
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

  const signup = useCallback(async (email: string, password: string, pin?: string) => {
    const a = await authSignup(email, password, pin);
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
