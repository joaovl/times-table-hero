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
        <p className="text-sm text-muted-foreground mt-2">Kids and the reward &ldquo;bribe area&rdquo; will appear here.</p>
      </Card>
    </div>
  );
}
