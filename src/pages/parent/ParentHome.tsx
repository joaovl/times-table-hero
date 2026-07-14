import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function ParentHome() {
  const { account, logout } = useAuth();
  return (
    <div className="min-h-screen bg-background p-4 max-w-2xl mx-auto space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Parent area</h1>
        <Button variant="outline" onClick={() => logout()}>Log out</Button>
      </header>
      <Card className="p-5">
        <p className="text-muted-foreground">Signed in as <span className="font-semibold text-foreground">{account?.email}</span>.</p>
        <div className="flex flex-col gap-2 mt-3">
          <Link className="underline text-primary" to="/parent/kids">Manage kids</Link>
          <Link className="underline text-primary" to="/parent/rewards">Reward settings (the bribe area)</Link>
          <Link className="underline text-primary" to="/parent/dashboard">Progress &amp; rewards dashboard</Link>
          <Link className="underline text-primary" to="/parent/link">Link players to your kids</Link>
          <button
            type="button"
            className="underline text-primary text-left"
            onClick={() => window.dispatchEvent(new CustomEvent('tth-open-feedback'))}
          >
            Send feedback / report a problem
          </button>
        </div>
      </Card>
    </div>
  );
}
