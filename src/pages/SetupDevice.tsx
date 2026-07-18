import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { pairDevice, ApiError } from '@/lib/api/client';
import { useT } from '@/lib/i18n/react';
import type { MessageKey } from '@/lib/i18n/i18n';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const PIN_RE = /^\d{6}$/;

const MESSAGE_KEYS: Record<string, MessageKey> = {
  invalid_credentials: 'setupDevice.error.invalidCredentials',
  too_many_attempts: 'setupDevice.error.tooManyAttempts',
  invalid_input: 'setupDevice.error.invalidInput',
};

export default function SetupDevice() {
  const { t } = useT();
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [paired, setPaired] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!PIN_RE.test(pin)) {
      setError(t('setupDevice.error.pinRequired'));
      return;
    }
    setBusy(true);
    try {
      await pairDevice(email, pin);
      setPaired(true);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'request_failed';
      const key = MESSAGE_KEYS[code];
      setError(key ? t(key) : t('setupDevice.error.generic'));
    } finally {
      setBusy(false);
    }
  };

  if (paired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm p-6 space-y-4 text-center">
          <h1 className="text-2xl font-bold">{t('setupDevice.paired')}</h1>
          <p className="text-muted-foreground">{t('setupDevice.pairedHelp')}</p>
          <Link to="/whos-playing" className="inline-block underline text-primary font-semibold">{t('whosPlaying.title')}</Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm p-6 space-y-4">
        <h1 className="text-2xl font-bold text-center">{t('setupDevice.title')}</h1>
        <p className="text-sm text-muted-foreground text-center">
          {t('setupDevice.help')}
        </p>
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm font-medium" htmlFor="setup-email">{t('auth.email')}</label>
          <Input id="setup-email" type="email" autoComplete="email" value={email}
            onChange={e => setEmail(e.target.value)} />
          <label className="block text-sm font-medium" htmlFor="setup-pin">{t('auth.familyPin')}</label>
          <Input id="setup-pin" aria-label={t('auth.familyPin')} inputMode="numeric" maxLength={6} autoComplete="off"
            value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>{t('setupDevice.pairButton')}</Button>
        </form>
      </Card>
    </div>
  );
}
