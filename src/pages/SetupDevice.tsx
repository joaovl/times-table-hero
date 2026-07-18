import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { pairDevice, ApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const PIN_RE = /^\d{6}$/;

const MESSAGES: Record<string, string> = {
  invalid_credentials: 'That email or PIN is incorrect.',
  too_many_attempts: 'Too many attempts. Please wait a few minutes and try again.',
  invalid_input: 'Please enter a valid email and a 6-digit PIN.',
};

export default function SetupDevice() {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [paired, setPaired] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!PIN_RE.test(pin)) {
      setError('Please enter a 6-digit PIN.');
      return;
    }
    setBusy(true);
    try {
      await pairDevice(email, pin);
      setPaired(true);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'request_failed';
      setError(MESSAGES[code] ?? 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (paired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm p-6 space-y-4 text-center">
          <h1 className="text-2xl font-bold">This device is paired</h1>
          <p className="text-muted-foreground">Now each child can sign in with their PIN.</p>
          <Link to="/whos-playing" className="inline-block underline text-primary font-semibold">Who&rsquo;s playing?</Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm p-6 space-y-4">
        <h1 className="text-2xl font-bold text-center">Set up this device</h1>
        <p className="text-sm text-muted-foreground text-center">
          Enter your parent email and the family PIN to pair this device.
        </p>
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm font-medium" htmlFor="setup-email">Email</label>
          <Input id="setup-email" type="email" autoComplete="email" value={email}
            onChange={e => setEmail(e.target.value)} />
          <label className="block text-sm font-medium" htmlFor="setup-pin">Family PIN</label>
          <Input id="setup-pin" aria-label="Family PIN" inputMode="numeric" maxLength={6} autoComplete="off"
            value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>Pair this device</Button>
        </form>
      </Card>
    </div>
  );
}
