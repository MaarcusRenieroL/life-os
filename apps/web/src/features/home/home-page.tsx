import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { auditLogApi } from '@/features/audit-log/audit-log-api';
import { useAuth } from '@/features/auth/auth-context';
import { coreApi } from '@/features/core/core-api';
import { emailHubApi } from '@/features/email-hub/email-hub-api';
import { accountApi } from '@/features/finance/account-api';
import { transactionApi } from '@/features/finance/transaction-api';
import { formatINR } from '@/features/finance/utils';
import { aiUsageApi, jobApi } from '@/features/job-tracker/job-api';
import { notesApi } from '@/features/notes/notes-api';
import { HomeView } from '@/features/player/home-view';
import { toQuests } from '@/features/player/player-model';
import { usePlayer } from '@/features/player/use-player';
import { vaultApi } from '@/features/vault/vault-api';

/** Best-effort read: a module that is down or locked just leaves its slot empty instead of breaking Home. */
const soft = { retry: false, throwOnError: false } as const;

export function HomePage() {
  const { user } = useAuth();
  const player = usePlayer();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const name = (user?.name ?? user?.email ?? 'Player').split(/[\s@]/)[0];

  const { data: today = [] } = useQuery({ queryKey: ['core', 'today'], queryFn: coreApi.getToday, ...soft });
  const { data: entries = [] } = useQuery({ queryKey: ['vault', 'entries'], queryFn: vaultApi.getEntries, ...soft });
  // Needs the vault unlocked, so this quietly stays empty while it's locked.
  const { data: vaultHealth } = useQuery({ queryKey: ['vault', 'health'], queryFn: vaultApi.getHealthSummary, ...soft });
  const { data: notesPage } = useQuery({ queryKey: ['notes', 'list', 'home-count'], queryFn: () => notesApi.list({ page: 0, size: 1 }), ...soft });
  // Same key and staleTime as the finance module, so Home and Finance share one cache entry.
  const { data: accounts } = useQuery({ queryKey: ['finance', 'accounts'], queryFn: accountApi.getAccounts, staleTime: 5 * 60_000, ...soft });
  const { data: financeNeedsReview = 0 } = useQuery({ queryKey: ['finance', 'transactions', 'needs-review-count'], queryFn: transactionApi.getNeedsReviewCount, ...soft });
  const { data: jobs } = useQuery({ queryKey: ['jobs', 'list'], queryFn: jobApi.list, ...soft });
  const { data: pendingJobEmails = [] } = useQuery({ queryKey: ['jobs', 'email-events', 'needs-review'], queryFn: jobApi.needsReviewEmailEvents, ...soft });
  const { data: emailPending = 0 } = useQuery({ queryKey: ['email-hub', 'pending-count'], queryFn: emailHubApi.pendingCount, ...soft });
  const { data: aiUsage } = useQuery({ queryKey: ['jobs', 'ai-usage', 'summary'], queryFn: aiUsageApi.getSummary, ...soft });
  // Paginated endpoint: ask for one small page, since only the latest few are shown.
  const { data: auditPage } = useQuery({ queryKey: ['audit-log', 'events', 'home'], queryFn: () => auditLogApi.getEvents(0, 6), ...soft });

  const quests = useMemo(() => toQuests(today), [today]);
  const vaultAttention = (vaultHealth?.weakCount ?? 0) + (vaultHealth?.duplicateCount ?? 0);
  const balance = accounts?.reduce((sum, a) => sum + a.currentBalance, 0);

  const portalStatus: Record<string, string> = {
    '/tasks': `${today.filter((i) => i.module === 'tasks').length} on the board`,
    '/vault': `${entries.length} items`,
    '/jobs': jobs ? `${jobs.length} tracked` : 'loading…',
    '/notes': notesPage ? `${notesPage.totalElements} notes` : 'loading…',
    '/finance': balance == null ? 'loading…' : `${formatINR(balance)} balance`,
    '/habits': player.streak.current > 0 ? `${player.streak.current}-day streak` : 'start a streak',
    '/email': emailPending > 0 ? `${emailPending} awaiting your OK` : 'inbox is read',
    '/achievements': `${player.achievements.reduce((n, a) => n + a.tier, 0)} medals earned`,
  };
  const portalAlerts: Record<string, number> = {
    '/vault': vaultAttention,
    '/finance': financeNeedsReview,
    '/jobs': pendingJobEmails.length,
    '/email': emailPending,
  };

  const attention: { title: string; meta: string; link: string }[] = [];
  const weak = vaultHealth?.actionRequired.find((i) => i.issue.toLowerCase().includes('weak'));
  if (weak) attention.push({ title: `Change weak password — ${weak.title}`, meta: 'vault', link: '/vault/health' });
  if (financeNeedsReview > 0) attention.push({ title: `${financeNeedsReview} transaction(s) need review`, meta: 'finance', link: '/finance/transactions' });
  if (pendingJobEmails.length > 0) attention.push({ title: `${pendingJobEmails.length} job email(s) detected — confirm or dismiss`, meta: 'jobs', link: '/jobs' });
  if (emailPending > 0) attention.push({ title: `${emailPending} email action(s) waiting for your OK`, meta: 'email', link: '/email' });
  for (const a of player.anomalies.filter((x) => x.severity !== 'INFO').slice(0, 2)) attention.push({ title: a.title, meta: 'analytics', link: '/analytics' });

  return (
    <HomeView
      name={name}
      greeting={greeting}
      progress={player.progress}
      rank={player.rank}
      streak={player.streak}
      xpToday={player.earnedToday}
      attributes={player.attributes}
      week={player.week}
      quests={quests}
      clearedToday={(player.today?.tasksCompleted ?? 0) + (player.today?.habitsCompleted ?? 0)}
      portalStatus={portalStatus}
      portalAlerts={portalAlerts}
      activity={(auditPage?.content ?? []).map((e) => ({ id: e.eventId, text: e.description, at: e.occurredAt }))}
      attention={attention}
      aiCostUsd={aiUsage?.costThisMonthUsd}
      challenge={{ challenge: player.challenge, done: player.challengeDone, progress: player.challengeProgress }}
      achievements={player.achievements}
      heatmap={player.heatmap}
    />
  );
}
