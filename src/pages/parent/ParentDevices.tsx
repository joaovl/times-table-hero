import { useEffect, useState } from 'react';
import { pairList, pairRevoke, type PairedDevice } from '@/lib/api/client';
import { useT } from '@/lib/i18n/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function ParentDevices() {
  const { t } = useT();
  const [devices, setDevices] = useState<PairedDevice[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    pairList()
      .then(list => { setDevices(list); setLoaded(true); })
      .catch(() => { setError(t('parent.devices.errorLoad')); setLoaded(true); });
  };

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const revoke = async (tokenHashPrefix: string) => {
    try {
      await pairRevoke(tokenHashPrefix);
      load();
    } catch {
      setError(t('parent.devices.errorRevoke'));
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">{t('parent.devices.title')}</h1>
      <p className="text-sm text-muted-foreground">
        {t('parent.devices.help')}
      </p>
      {!loaded ? (
        <p className="text-muted-foreground" role="status" aria-live="polite">{t('common.loadingEllipsis')}</p>
      ) : (
        <Card className="p-5 space-y-3">
          <ul className="space-y-2">
            {devices.map(d => (
              <li key={d.tokenHashPrefix} className="flex items-center justify-between border rounded-lg px-3 py-2">
                <div>
                  <p className="font-semibold">{d.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('parent.devices.paired', { date: new Date(d.createdAt).toLocaleDateString() })}
                  </p>
                </div>
                <Button variant="outline" aria-label={t('parent.devices.revokeName', { name: d.label })} onClick={() => revoke(d.tokenHashPrefix)}>
                  {t('parent.devices.revoke')}
                </Button>
              </li>
            ))}
            {devices.length === 0 && <li className="text-sm text-muted-foreground">{t('parent.devices.noDevicesYet')}</li>}
          </ul>
        </Card>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
