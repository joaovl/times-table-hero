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

const PIN_RE = /^\d{6}$/;

export default function ParentAuth() {
  const { login, signup } = useAuth();
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
      setError('Please enter a 6-digit family PIN.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') await login(email, password);
      else await signup(email, password, pin);
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
          {mode === 'signup' && (
            <>
              <label className="block text-sm font-medium" htmlFor="family-pin">Family PIN</label>
              <Input id="family-pin" aria-label="Family PIN" inputMode="numeric" maxLength={6} autoComplete="off"
                value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} />
              <p className="text-xs text-muted-foreground">
                A 6-digit PIN your kids will use to set up their own device.
              </p>
            </>
          )}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy || !pinValid}>
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
