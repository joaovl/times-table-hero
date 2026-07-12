import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth/AuthContext';
import { bugReport } from '@/lib/api/client';
import { getRecentAttempts } from '@/lib/feedback/attemptLog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const TAPS_NEEDED = 5;
const WINDOW_MS = 2000;

// A deliberately subtle icon in the corner of every screen. A grown-up taps it
// 5 times within 2 seconds to open the feedback form; a child tapping it once
// or twice sees nothing happen.
export default function FeedbackTrigger() {
  const [open, setOpen] = useState(false);
  const taps = useRef<number[]>([]);

  // The parent-area "Send feedback" link opens the same dialog via this event.
  useEffect(() => {
    const openIt = () => setOpen(true);
    window.addEventListener('tth-open-feedback', openIt);
    return () => window.removeEventListener('tth-open-feedback', openIt);
  }, []);

  const onTap = () => {
    const now = Date.now();
    taps.current = [...taps.current, now].filter(t => now - t <= WINDOW_MS);
    if (taps.current.length >= TAPS_NEEDED) {
      taps.current = [];
      setOpen(true);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="Report a problem (grown-ups: tap 5 times quickly)"
        onClick={onTap}
        className="fixed top-2 right-2 z-40 h-9 w-9 rounded-full opacity-20 hover:opacity-70 transition-opacity flex items-center justify-center"
      >
        <img src="/favicon.png" alt="" aria-hidden="true" className="h-5 w-5" />
      </button>
      {open && <FeedbackDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function FeedbackDialog({ onClose }: { onClose: () => void }) {
  const { account } = useAuth();
  const location = useLocation();
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  const recent = getRecentAttempts();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setState('sending');
    try {
      const version = (globalThis as unknown as { __GIT_HASH__?: string }).__GIT_HASH__ ?? 'dev';
      await bugReport({
        title: description.trim().slice(0, 120),
        body: description.trim(),
        severity,
        url: window.location.href,
        reporter: account?.email ?? null,
        context: { recent, route: location.pathname, version },
      });
      setState('done');
    } catch {
      setState('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Report a problem">
      <Card className="w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Report a problem</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
        </div>

        {state === 'done' ? (
          <div className="space-y-3">
            <p className="text-success font-semibold">Thanks — your report was sent.</p>
            <Button className="w-full" onClick={onClose}>Close</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <label className="block text-sm font-medium" htmlFor="fb-desc">What went wrong?</label>
            <textarea
              id="fb-desc" value={description} onChange={e => setDescription(e.target.value)}
              rows={4} placeholder="e.g. On coordinates, typing -2,-3 was marked wrong"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <label className="block text-sm font-medium" htmlFor="fb-sev">How bad is it?</label>
            <select id="fb-sev" aria-label="Severity" value={severity} onChange={e => setSeverity(e.target.value as 'low' | 'medium' | 'high')}
              className="w-full border rounded-md px-2 py-1">
              <option value="low">Minor</option>
              <option value="medium">Annoying</option>
              <option value="high">Broken</option>
            </select>
            <p className="text-xs text-muted-foreground">
              We&rsquo;ll include the last {recent.length} question{recent.length === 1 ? '' : 's'} answered on this device to help us reproduce it. No personal details are collected.
            </p>
            {state === 'error' && <p role="alert" className="text-sm text-destructive">Could not send. Please try again.</p>}
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={state === 'sending' || !description.trim()}>
                {state === 'sending' ? 'Sending…' : 'Send report'}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
