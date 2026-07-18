import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { pairKids, kidSignin, pairingTokenStore, type PairKid } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

const PIN_RE = /^\d{6}$/;

// "Who's playing?" — on a device paired to a parent account, a child taps their
// name and enters their 6-digit PIN. On success their practice logs straight to
// their cloud record (via the kid session token).
export default function WhosPlaying() {
  const navigate = useNavigate();
  const paired = pairingTokenStore.get() !== null;
  const [kids, setKids] = useState<PairKid[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState<PairKid | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!paired) return;
    pairKids().then(setKids).catch(() => setLoadError(true));
  }, [paired]);

  if (!paired) {
    return (
      <div className="min-h-screen bg-background p-4 max-w-xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">Who&rsquo;s playing?</h1>
        <p className="text-muted-foreground">This device isn&rsquo;t set up yet.</p>
        <Link className="underline text-primary" to="/setup-device">Set up this device</Link>
      </div>
    );
  }

  const signIn = async () => {
    if (!selected || !PIN_RE.test(pin)) { setError('Enter your 6-digit PIN.'); return; }
    setBusy(true);
    setError('');
    try {
      await kidSignin(selected, pin);
      navigate('/'); // into the Hub to play
    } catch {
      setError('That PIN didn’t match. Try again.');
      setPin('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Who&rsquo;s playing?</h1>

      {loadError ? (
        <p className="text-muted-foreground" role="alert">Could not load players. Check your connection and try again.</p>
      ) : kids === null ? (
        <p className="text-muted-foreground" role="status" aria-live="polite">Loading…</p>
      ) : selected === null ? (
        kids.length === 0 ? (
          <p className="text-muted-foreground">No players yet. A grown-up can add kids in the parent area.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {kids.map(k => (
              <button
                key={k.id}
                onClick={() => { setSelected(k); setPin(''); setError(''); }}
                aria-label={`Play as ${k.name}`}
                className="flex flex-col items-center gap-2 rounded-xl border p-4 hover:bg-muted transition-colors"
              >
                <span
                  className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-extrabold text-white"
                  style={{ backgroundColor: k.color }}
                >
                  {k.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="font-semibold">{k.name}</span>
              </button>
            ))}
          </div>
        )
      ) : (
        <Card className="p-5 space-y-3">
          <p className="font-semibold">Hi {selected.name}! Enter your PIN.</p>
          <Input
            aria-label="PIN"
            inputMode="numeric"
            maxLength={6}
            autoComplete="off"
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
            className="text-center text-2xl tracking-[0.4em] font-bold"
            autoFocus
          />
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <div className="flex items-center gap-3">
            <Button onClick={signIn} disabled={busy || !PIN_RE.test(pin)}>Play</Button>
            <button className="text-sm underline text-muted-foreground" onClick={() => { setSelected(null); setError(''); }}>
              Back
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
