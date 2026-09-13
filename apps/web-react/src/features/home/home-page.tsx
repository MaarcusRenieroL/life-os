import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import { APP_MODULES, type AppModuleConfig } from '@/config/app-modules';
import { useAuth } from '@/features/auth/auth-context';
import { accountApi } from '@/features/finance/account-api';
import { transactionApi } from '@/features/finance/transaction-api';
import { formatINR } from '@/features/finance/utils';
import { notesApi } from '@/features/notes/notes-api';
import { vaultApi } from '@/features/vault/vault-api';

interface ModuleTile {
  code: string;
  name: string;
  enabled: boolean;
  path?: string;
  subtitle: string;
}

export function HomePage() {
  const { user } = useAuth();
  const firstName = (user?.name ?? user?.email ?? '').split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const { data: entries = [] } = useQuery({ queryKey: ['vault', 'entries'], queryFn: vaultApi.getEntries });
  // Best-effort - requires the vault to be unlocked, so this silently stays
  // undefined if it's locked.
  const { data: healthSummary } = useQuery({
    queryKey: ['vault', 'health'],
    queryFn: vaultApi.getHealthSummary,
    retry: false,
    throwOnError: false,
  });
  const { data: notesPage } = useQuery({
    queryKey: ['notes', 'list', 'home-count'],
    queryFn: () => notesApi.list({ page: 0, size: 1 }),
    retry: false,
    throwOnError: false,
  });
  const { data: accounts } = useQuery({
    queryKey: ['finance', 'accounts', 'home'],
    queryFn: accountApi.getAccounts,
    retry: false,
    throwOnError: false,
  });
  const { data: txPage } = useQuery({
    queryKey: ['finance', 'transactions', 'home'],
    queryFn: () => transactionApi.getTransactions(0, 50),
    retry: false,
    throwOnError: false,
  });

  const vaultActionRequired = (healthSummary?.weakCount ?? 0) + (healthSummary?.duplicateCount ?? 0);
  const financeTotalBalance = accounts?.reduce((sum, a) => sum + a.currentBalance, 0) ?? null;
  const financeNeedsReview = (txPage?.content ?? []).filter((t) => t.categoryId === null && t.type !== 'CREDIT').length;
  const modulesActiveCount = APP_MODULES.filter((m) => m.enabled).length;

  // Built, working modules sort ahead of not-yet-built ones so the grid always
  // leads with something clickable.
  const orderedModules = useMemo(() => {
    const enabled = APP_MODULES.filter((m) => m.enabled);
    const disabled = APP_MODULES.filter((m) => !m.enabled);
    return [...enabled, ...disabled];
  }, []);

  function toModuleTile(module: AppModuleConfig): ModuleTile {
    if (module.code === 'PM') {
      const subtitle = vaultActionRequired > 0 ? `${entries.length} items · ${vaultActionRequired} need attention` : `${entries.length} items`;
      return { code: module.code, name: module.name, enabled: true, path: module.path, subtitle };
    }
    if (module.code === 'NT') {
      const count = notesPage?.totalElements;
      const subtitle = count === undefined ? 'loading…' : `${count} ${count === 1 ? 'note' : 'notes'}`;
      return { code: module.code, name: module.name, enabled: true, path: module.path, subtitle };
    }
    if (module.code === 'FN') {
      const subtitle =
        financeTotalBalance === null
          ? 'loading…'
          : financeNeedsReview > 0
            ? `${formatINR(financeTotalBalance)} balance · ${financeNeedsReview} need review`
            : `${formatINR(financeTotalBalance)} balance`;
      return { code: module.code, name: module.name, enabled: true, path: module.path, subtitle };
    }
    if (!module.enabled) {
      return { code: module.code, name: module.name, enabled: false, subtitle: 'not set up yet' };
    }
    return { code: module.code, name: module.name, enabled: true, path: module.path, subtitle: 'open module' };
  }

  const homeModuleTiles = orderedModules.slice(0, 4).map(toModuleTile);
  const exploreModules = orderedModules.slice(4);

  const attentionItems = useMemo(() => {
    const items: { title: string; meta: string; link: string }[] = [];
    const weakEntry = healthSummary?.actionRequired.find((item) => item.issue.toLowerCase().includes('weak'));
    if (weakEntry) {
      items.push({ title: `Change weak password — ${weakEntry.title}`, meta: 'flagged by password health', link: '/vault/health' });
    }
    if (financeNeedsReview > 0) {
      items.push({ title: `${financeNeedsReview} transaction(s) need review`, meta: 'finance', link: '/finance/transactions' });
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [healthSummary, financeNeedsReview]);

  return (
    <div>
      <div className="mb-7 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{greeting}, {firstName}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} — here's where things stand
          </p>
        </div>
      </div>

      <div className="mb-7 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard value={modulesActiveCount} label="modules active" />
        <StatCard value={vaultActionRequired} label="vault items need attention" destructive={vaultActionRequired > 0} />
      </div>

      <div className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground">YOUR MODULES</div>
      <div className="mb-8 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {homeModuleTiles.map((tile) =>
          tile.enabled ? (
            <Link
              key={tile.code}
              to={tile.path ?? '#'}
              className="flex flex-col gap-2.5 rounded-lg border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40"
            >
              <span className="flex size-8 items-center justify-center rounded-md bg-primary/15 text-[11px] font-bold text-primary">{tile.code}</span>
              <span className="text-sm font-semibold">{tile.name}</span>
              <span className="text-[11px] text-muted-foreground">{tile.subtitle}</span>
            </Link>
          ) : (
            <div key={tile.code} className="flex flex-col gap-2.5 rounded-lg border border-dashed bg-muted/20 p-4 opacity-50">
              <span className="flex size-8 items-center justify-center rounded-md bg-foreground/8 text-[11px] font-bold">{tile.code}</span>
              <span className="text-sm font-semibold">{tile.name}</span>
              <span className="text-[11px] text-muted-foreground">{tile.subtitle}</span>
            </div>
          ),
        )}
      </div>

      <div className="mb-7 grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-lg border bg-card p-5">
          <div className="mb-3.5 text-sm font-semibold">Recent activity</div>
          <p className="text-sm text-muted-foreground">Cross-module activity feed coming soon.</p>
        </div>

        <div className="rounded-lg border bg-card p-5">
          <div className="mb-3.5 text-sm font-semibold">Needs your attention</div>
          <div className="flex flex-col gap-2.5">
            {attentionItems.map((item, i) => (
              <Link key={i} to={item.link} className="flex items-center justify-between text-sm hover:underline">
                <span>{item.title}</span>
                <span className="text-xs text-muted-foreground">{item.meta}</span>
              </Link>
            ))}
            {attentionItems.length === 0 && <p className="text-sm text-muted-foreground">Nothing needs attention right now.</p>}
          </div>
        </div>
      </div>

      {exploreModules.length > 0 && (
        <div>
          <div className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground">EXPLORE</div>
          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            {exploreModules.map((m) => (
              <div key={m.code} className="flex flex-col gap-2.5 rounded-lg border border-dashed bg-muted/20 p-4 opacity-50">
                <span className="flex size-8 items-center justify-center rounded-md bg-foreground/8 text-[11px] font-bold">{m.code}</span>
                <span className="text-sm font-semibold">{m.name}</span>
                <span className="text-[11px] text-muted-foreground">not set up yet</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ value, label, destructive }: { value: number; label: string; destructive?: boolean }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-4">
      <div className={`text-xl font-semibold tabular-nums ${destructive ? 'text-destructive' : ''}`}>{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
