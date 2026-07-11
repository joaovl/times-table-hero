import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import ParentAuth from './ParentAuth';

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-xl font-bold text-primary" role="status" aria-live="polite">Loading…</div>
      </div>
    );
  }
  if (status === 'anon') return <ParentAuth />;
  return <>{children}</>;
}
