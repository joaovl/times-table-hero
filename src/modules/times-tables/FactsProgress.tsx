import { Fragment, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { loadFactStore } from '@/lib/practice/factStore';
import { stageOf, type FactStage, type FactStat } from '@/lib/practice/factModel';
import { formatNumber } from '@/lib/i18n/number';
import { t, type MessageKey } from '@/lib/i18n/i18n';

// Average answer time in seconds, 1 decimal place, locale decimal separator.
function fmtSeconds(ms: number): string {
  return formatNumber(ms / 1000, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

// A Times Tables Rock Stars–style heatmap: the 12×12 multiplication grid, each
// cell coloured by how well this player knows that fact, plus a per-table speed
// summary. All from the on-device fact store — nothing leaves the device.

const STAGE_CLASS: Record<FactStage, string> = {
  new: 'bg-muted text-muted-foreground/60',
  learning: 'bg-amber-400/80 text-amber-950',
  known: 'bg-lime-400/80 text-lime-950',
  mastered: 'bg-green-600 text-white',
};

const STAGE_LABEL_KEY: Record<FactStage, MessageKey> = {
  new: 'timesTables.facts.stageNew',
  learning: 'timesTables.facts.stageLearning',
  known: 'timesTables.facts.stageKnown',
  mastered: 'timesTables.facts.stageMastered',
};

const RANGE = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12

function keyFor(a: number, b: number): string {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return `mul:${lo}x${hi}`;
}

export function FactsProgress({ userId, onBack }: { userId?: string; onBack: () => void }) {
  const store = useMemo(() => loadFactStore(userId), [userId]);

  const counts = useMemo(() => {
    const c: Record<FactStage, number> = { new: 0, learning: 0, known: 0, mastered: 0 };
    for (const r of RANGE) for (const col of RANGE) c[stageOf(store[keyFor(r, col)])]++;
    return c;
  }, [store]);

  // Average recall speed per table (over facts that have been tried).
  const tableSpeeds = useMemo(() => {
    return RANGE.map(t => {
      const stats: FactStat[] = RANGE
        .map(other => store[keyFor(t, other)])
        .filter((s): s is FactStat => !!s && s.attempts > 0);
      if (stats.length === 0) return { table: t, avgMs: null as number | null };
      const avg = stats.reduce((sum, s) => sum + s.avgMs, 0) / stats.length;
      return { table: t, avgMs: Math.round(avg) };
    });
  }, [store]);

  const tried = tableSpeeds.filter(t => t.avgMs !== null) as { table: number; avgMs: number }[];
  const fastest = tried.slice().sort((a, b) => a.avgMs - b.avgMs)[0];
  const slowest = tried.slice().sort((a, b) => b.avgMs - a.avgMs)[0];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-[640px] space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack} className="text-muted-foreground">{t('timesTables.facts.back')}</Button>
          <h1 className="text-xl md:text-2xl font-bold text-primary">{t('timesTables.facts.title')}</h1>
          <span className="w-16" />
        </div>

        <Card className="p-3 md:p-4">
          <p className="text-sm text-muted-foreground mb-3">
            {t('timesTables.facts.legendHelp')}
          </p>
          <div className="overflow-x-auto">
            <div className="inline-grid gap-[3px]" style={{ gridTemplateColumns: `repeat(13, minmax(20px, 1fr))` }}>
              <span />
              {RANGE.map(c => <span key={`h${c}`} className="text-[10px] md:text-xs text-center font-bold text-muted-foreground">{c}</span>)}
              {RANGE.map(r => (
                <Fragment key={`row${r}`}>
                  <span className="text-[10px] md:text-xs font-bold text-muted-foreground flex items-center justify-center">{r}</span>
                  {RANGE.map(c => {
                    const stage = stageOf(store[keyFor(r, c)]);
                    return (
                      <span
                        key={`${r}-${c}`}
                        title={`${r} × ${c} = ${r * c} — ${t(STAGE_LABEL_KEY[stage])}`}
                        className={`aspect-square rounded-[3px] text-[8px] md:text-[10px] flex items-center justify-center font-bold ${STAGE_CLASS[stage]}`}
                      >
                        {r * c}
                      </span>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {(['mastered', 'known', 'learning', 'new'] as FactStage[]).map(s => (
              <span key={s} className="inline-flex items-center gap-1.5">
                <span className={`h-3 w-3 rounded-[3px] ${STAGE_CLASS[s]}`} />
                {t(STAGE_LABEL_KEY[s])} ({counts[s]})
              </span>
            ))}
          </div>
        </Card>

        {tried.length > 0 && (
          <Card className="p-3 md:p-4 space-y-2">
            <h2 className="font-bold">{t('timesTables.facts.speed')}</h2>
            {fastest && (
              <p className="text-sm">
                {t('timesTables.facts.fastestPrefix')}<strong>{t('timesTables.facts.tableName', { table: fastest.table })}</strong>{t('timesTables.facts.secondsEach', { seconds: fmtSeconds(fastest.avgMs) })}
                {slowest && slowest.table !== fastest.table && (
                  <>{t('timesTables.facts.workOnPrefix')}<strong>{t('timesTables.facts.tableName', { table: slowest.table })}</strong>{t('timesTables.facts.seconds', { seconds: fmtSeconds(slowest.avgMs) })}</>
                )}
              </p>
            )}
            <div className="grid grid-cols-6 gap-1 text-center">
              {tableSpeeds.map(t => (
                <div key={t.table} className="rounded-md bg-muted/60 p-1">
                  <div className="text-xs font-bold">{t.table}×</div>
                  <div className="text-[10px] text-muted-foreground">{t.avgMs === null ? '—' : `${fmtSeconds(t.avgMs)}s`}</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {counts.new === 144 && (
          <p className="text-center text-sm text-muted-foreground">{t('timesTables.facts.emptyState')}</p>
        )}
      </div>
    </div>
  );
}
