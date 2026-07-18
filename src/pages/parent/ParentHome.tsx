import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth/AuthContext';
import { useT } from '@/lib/i18n/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import LanguageCard from './LanguageCard';

export default function ParentHome() {
  const { account, logout } = useAuth();
  const { t } = useT();
  return (
    <div className="min-h-screen bg-background p-4 max-w-2xl mx-auto space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('parent.home.title')}</h1>
        <Button variant="outline" onClick={() => logout()}>{t('parent.home.logout')}</Button>
      </header>
      <Card className="p-5">
        <p className="text-muted-foreground">{t('parent.home.signedInAs')} <span className="font-semibold text-foreground">{account?.email}</span>.</p>
        <div className="flex flex-col gap-2 mt-3">
          <Link className="underline text-primary" to="/parent/kids">{t('parent.home.manageKids')}</Link>
          <Link className="underline text-primary" to="/parent/rewards">{t('parent.home.rewardSettings')}</Link>
          <Link className="underline text-primary" to="/parent/dashboard">{t('parent.home.dashboard')}</Link>
          <Link className="underline text-primary" to="/parent/link">{t('parent.home.linkPlayers')}</Link>
          <Link className="underline text-primary" to="/parent/devices">{t('parent.home.pairedDevices')}</Link>
          <button
            type="button"
            className="underline text-primary text-left"
            onClick={() => window.dispatchEvent(new CustomEvent('tth-open-feedback'))}
          >
            {t('parent.home.feedback')}
          </button>
        </div>
      </Card>
      <LanguageCard />
    </div>
  );
}
