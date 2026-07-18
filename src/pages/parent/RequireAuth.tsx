import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useT } from '@/lib/i18n/react';
import ParentAuth from './ParentAuth';

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { t } = useT();
  const { status } = useAuth();
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-xl font-bold text-primary" role="status" aria-live="polite">{t('common.loadingEllipsis')}</div>
      </div>
    );
  }
  if (status === 'anon') return <ParentAuth />;
  return <>{children}</>;
}
