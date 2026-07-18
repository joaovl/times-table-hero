import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { pairKids, kidSignin, pairingTokenStore, type PairKid } from '@/lib/api/client';
import { useT } from '@/lib/i18n/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

const PIN_RE = /^\d{6}$/;

// "Who's playing?" — on a device paired to a parent account, a child taps their
// name and enters their 6-digit PIN. On success their practice logs straight to
// their cloud record (via the kid session token).
export default function WhosPlaying() {
  const { t } = useT();
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
        <h1 className="text-2xl font-bold">{t('whosPlaying.title')}</h1>
        <p className="text-muted-foreground">{t('whosPlaying.notSetUp')}</p>
        <Link className="underline text-primary" to="/setup-device">{t('setupDevice.title')}</Link>
      </div>
    );
  }

  const signIn = async () => {
    if (!selected || !PIN_RE.test(pin)) { setError(t('whosPlaying.enterPin')); return; }
    setBusy(true);
    setError('');
    try {
      await kidSignin(selected, pin);
      navigate('/'); // into the Hub to play
    } catch {
      setError(t('whosPlaying.pinMismatch'));
      setPin('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">{t('whosPlaying.title')}</h1>

      {loadError ? (
        <p className="text-muted-foreground" role="alert">{t('whosPlaying.loadError')}</p>
      ) : kids === null ? (
        <p className="text-muted-foreground" role="status" aria-live="polite">{t('common.loadingEllipsis')}</p>
      ) : selected === null ? (
        kids.length === 0 ? (
          <p className="text-muted-foreground">{t('whosPlaying.noPlayersYet')}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {kids.map(k => (
              <button
                key={k.id}
                onClick={() => { setSelected(k); setPin(''); setError(''); }}
                aria-label={t('whosPlaying.playAs', { name: k.name })}
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
          <p className="font-semibold">{t('whosPlaying.hiEnterPin', { name: selected.name })}</p>
          <Input
            aria-label={t('whosPlaying.pin')}
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
            <Button onClick={signIn} disabled={busy || !PIN_RE.test(pin)}>{t('whosPlaying.play')}</Button>
            <button className="text-sm underline text-muted-foreground" onClick={() => { setSelected(null); setError(''); }}>
              {t('common.back')}
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
