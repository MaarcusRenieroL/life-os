import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { vaultApi } from './vault-api';

function scoreLabel(score: number): string {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Needs attention';
  return 'Critical';
}

function scoreColor(score: number): string {
  if (score >= 70) return 'var(--primary)';
  if (score >= 50) return 'var(--warning, #eab308)';
  return 'var(--destructive)';
}

const AGE_BUCKET_COLOR: Record<string, string> = {
  '<3mo': 'bg-primary',
  '3-6mo': 'bg-primary/70',
  '6-12mo': 'bg-yellow-500',
  '1y+': 'bg-destructive',
};

export function VaultHealthPage() {
  const { data: health } = useQuery({ queryKey: ['vault', 'health'], queryFn: vaultApi.getHealthSummary });

  if (!health) return null;

  const maxBucket = Math.max(1, ...health.ageBuckets.map((b) => b.count));
  const staleCount = health.ageBuckets.find((b) => b.label === '1y+')?.count ?? 0;
  const ringDeg = Math.round((health.score / 100) * 360);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Password health</h1>

      <div className="mt-6 flex items-center gap-6">
        <div
          className="flex size-28 items-center justify-center rounded-full"
          style={{ background: `conic-gradient(${scoreColor(health.score)} 0deg ${ringDeg}deg, var(--muted) ${ringDeg}deg 360deg)` }}
        >
          <div className="flex size-20 items-center justify-center rounded-full bg-background text-xl font-semibold">
            {health.score}
          </div>
        </div>
        <div>
          <div className="text-lg font-semibold" style={{ color: scoreColor(health.score) }}>
            {scoreLabel(health.score)}
          </div>
          <div className="text-sm text-muted-foreground">{health.totalCount} passwords tracked</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <StatCard label="Weak" value={health.weakCount} />
        <StatCard label="Duplicate" value={health.duplicateCount} />
        <StatCard label="Stale (1y+)" value={staleCount} />
      </div>

      <section className="mt-6">
        <h2 className="text-sm font-semibold">Password age</h2>
        <div className="mt-2 flex h-32 items-end gap-3">
          {health.ageBuckets.map((bucket) => (
            <div key={bucket.label} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={`w-full rounded-t ${AGE_BUCKET_COLOR[bucket.label] ?? 'bg-muted'}`}
                style={{ height: `${Math.max(4, Math.round((bucket.count / maxBucket) * 100))}%` }}
              />
              <span className="text-[11px] text-muted-foreground">{bucket.label}</span>
              <span className="text-xs font-medium">{bucket.count}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold">Action required</h2>
        <ul className="mt-2 flex flex-col gap-1.5">
          {health.actionRequired.map((item) => {
            const isWeak = item.issue.toLowerCase().includes('weak');
            return (
              <li key={item.id} className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm">
                <span>
                  {item.title} — <span className={isWeak ? 'text-yellow-600' : 'text-destructive'}>{item.issue}</span>
                </span>
                <Link to={`/vault/entries?edit=${item.id}`} className="text-xs text-primary hover:underline">
                  {isWeak ? 'Change now' : 'Review'}
                </Link>
              </li>
            );
          })}
          {health.actionRequired.length === 0 && (
            <p className="text-sm text-muted-foreground">Nothing needs attention.</p>
          )}
        </ul>
      </section>

      <section className="mt-6 rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        Dark web monitoring — not configured.
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3 text-center">
      <div className="text-xl font-semibold">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
