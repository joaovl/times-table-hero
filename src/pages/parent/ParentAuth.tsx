import { useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { ApiError } from '@/lib/api/client';
import { useT } from '@/lib/i18n/react';
import type { MessageKey } from '@/lib/i18n/i18n';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const MESSAGE_KEYS: Record<string, MessageKey> = {
  invalid_credentials: 'auth.error.invalidCredentials',
  email_taken: 'auth.error.emailTaken',
  too_many_attempts: 'auth.error.tooManyAttempts',
  invalid_input: 'auth.error.invalidInput',
};

const PIN_RE = /^\d{6}$/;

export default function ParentAuth() {
  const { login, signup } = useAuth();
  const { t } = useT();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const pinValid = mode === 'login' || PIN_RE.test(pin);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (mode === 'signup' && !PIN_RE.test(pin)) {
      setError(t('auth.error.pinRequired'));
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') await login(email, password);
      else await signup(email, password, pin);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'request_failed';
      const key = MESSAGE_KEYS[code];
      setError(key ? t(key) : t('auth.error.generic'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm p-6 space-y-4">
        <h1 className="text-2xl font-bold text-center">
          {mode === 'login' ? t('auth.parentLogin') : t('auth.createParentAccount')}
        </h1>
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm font-medium" htmlFor="email">{t('auth.email')}</label>
          <Input id="email" type="email" autoComplete="email" value={email}
            onChange={e => setEmail(e.target.value)} />
          <label className="block text-sm font-medium" htmlFor="password">{t('auth.password')}</label>
          <Input id="password" type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password} onChange={e => setPassword(e.target.value)} />
          {mode === 'signup' && (
            <>
              <label className="block text-sm font-medium" htmlFor="family-pin">{t('auth.familyPin')}</label>
              <Input id="family-pin" aria-label="Family PIN" inputMode="numeric" maxLength={6} autoComplete="off"
                value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} />
              <p className="text-xs text-muted-foreground">
                {t('auth.familyPinHelp')}
              </p>
            </>
          )}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy || !pinValid}>
            {mode === 'login' ? t('auth.logIn') : t('auth.signUp')}
          </Button>
        </form>
        <button
          type="button"
          className="w-full text-sm text-muted-foreground underline"
          onClick={() => { setError(''); setMode(mode === 'login' ? 'signup' : 'login'); }}
        >
          {mode === 'login' ? t('auth.createAnAccount') : t('auth.alreadyHaveAccount')}
        </button>
      </Card>
    </div>
  );
}
