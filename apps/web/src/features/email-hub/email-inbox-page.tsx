import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, CheckSquare, CreditCard, Loader2, Mail, Receipt, Undo2, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
  emailHubApi,
  type EmailCategory,
  type EmailHubItem,
  type EmailHubStatus,
  type EmailProposal,
} from './email-hub-api';

const CATEGORY: Record<EmailCategory, { label: string; icon: typeof Mail }> = {
  TASK: { label: 'Task', icon: CheckSquare },
  BILL: { label: 'Bill', icon: Receipt },
  EVENT: { label: 'Event', icon: CalendarClock },
  SUBSCRIPTION: { label: 'Subscription', icon: CreditCard },
  IGNORE: { label: 'Skipped', icon: Mail },
};

/** Where the created record lives, so "done for you" links straight to it. */
const MODULE_LINK: Record<string, { label: string; to: string }> = {
  tasks: { label: 'Open tasks', to: '/tasks' },
  calendar: { label: 'Open calendar', to: '/calendar' },
  finance: { label: 'Open subscriptions', to: '/finance/subscriptions' },
};

const WAITING: EmailHubStatus[] = ['NEEDS_REVIEW', 'FAILED'];
const DONE: EmailHubStatus[] = ['APPLIED', 'UNDONE'];
const SKIPPED: EmailHubStatus[] = ['IGNORED', 'DISMISSED'];

function when(iso: string | null | undefined, withTime = false): string | null {
  if (!iso) return null;
  const date = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  return withTime
    ? date.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

/** One plain line saying exactly what will be / was created. */
function describe(proposal: EmailProposal | null): string | null {
  if (!proposal) return null;
  switch (proposal.kind) {
    case 'TASK':
      return `Task: ${proposal.title}${proposal.dueDate ? ` · due ${when(proposal.dueDate)}` : ''}`;
    case 'EVENT': {
      const start = proposal.allDay ? when(proposal.startDate) : when(proposal.startAt, true);
      return `Event: ${proposal.title}${start ? ` · ${start}` : ''}${proposal.location ? ` · ${proposal.location}` : ''}`;
    }
    case 'SUBSCRIPTION':
      return `Subscription: ${proposal.title} · ${proposal.amount ?? '?'} ${proposal.billingCycle?.toLowerCase() ?? ''}${proposal.nextBillingDate ? ` · next ${when(proposal.nextBillingDate)}` : ''}`;
  }
}

function senderName(from: string | null): string {
  if (!from) return 'Unknown sender';
  const named = from.match(/^"?([^"<]+?)"?\s*</);
  return (named?.[1] ?? from.replace(/[<>]/g, '')).trim();
}

export function EmailInboxPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('waiting');
  const [busyId, setBusyId] = useState<string | null>(null);

  const waiting = useQuery({ queryKey: ['email-hub', 'items', 'waiting'], queryFn: () => emailHubApi.items(WAITING) });
  const done = useQuery({ queryKey: ['email-hub', 'items', 'done'], queryFn: () => emailHubApi.items(DONE) });
  const skipped = useQuery({ queryKey: ['email-hub', 'items', 'skipped'], queryFn: () => emailHubApi.items(SKIPPED, 60) });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['email-hub'] });
    // The created records show up in these modules' own lists.
    void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    void queryClient.invalidateQueries({ queryKey: ['calendar'] });
    void queryClient.invalidateQueries({ queryKey: ['finance'] });
  }

  const sync = useMutation({
    mutationFn: emailHubApi.syncNow,
    onSuccess: (queued) => {
      toast.success(queued === 0 ? 'No new mail to read' : `Reading ${queued} email${queued === 1 ? '' : 's'} - results appear in a moment`);
      // Classifying runs in the background after the mail is queued; look again shortly and once more.
      setTimeout(refresh, 8000);
      setTimeout(refresh, 25000);
    },
    onError: () => toast.error('Could not check your email. Make sure Gmail is connected under Finance → Import.'),
  });

  async function act(item: EmailHubItem, action: 'approve' | 'dismiss' | 'undo') {
    setBusyId(item.id);
    try {
      const updated = await emailHubApi[action](item.id);
      if (action === 'approve' && updated.status === 'FAILED') toast.error(updated.note ?? 'That module rejected it.');
      if (action === 'undo' && updated.status === 'APPLIED') toast.error(updated.note ?? 'Could not undo that automatically.');
      refresh();
    } catch {
      toast.error('Something went wrong. Try again.');
    } finally {
      setBusyId(null);
    }
  }

  function Row({ item, children }: { item: EmailHubItem; children?: ReactNode }) {
    const meta = CATEGORY[item.category];
    const Icon = meta.icon;
    const plan = describe(item.proposal);
    const link = item.targetModule ? MODULE_LINK[item.targetModule] : undefined;
    return (
      <li className="rounded-lg border p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 gap-3">
            <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="font-medium break-words">{item.summary || item.subject || '(no subject)'}</p>
              {plan && <p className="mt-0.5 text-sm break-words">{plan}</p>}
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {senderName(item.fromAddress)}
                {item.subject ? ` · ${item.subject}` : ''}
              </p>
              {item.note && (
                <p className={`mt-1 text-xs ${item.status === 'FAILED' ? 'text-destructive' : 'text-muted-foreground'}`}>{item.note}</p>
              )}
              {link && item.status === 'APPLIED' && (
                <Link to={link.to} className="mt-1 inline-block text-xs text-primary hover:underline">
                  {link.label}
                </Link>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {item.confidence && item.status === 'NEEDS_REVIEW' && (
              <Badge variant="outline" className="text-[10px]">
                {item.confidence.toLowerCase()} confidence
              </Badge>
            )}
            {busyId === item.id ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : children}
          </div>
        </div>
      </li>
    );
  }

  const list = (query: typeof waiting, empty: string, render: (item: EmailHubItem) => ReactNode) => {
    if (query.isLoading) return <Skeleton className="h-20 w-full" />;
    if (query.isError) return <p className="text-sm text-destructive">Could not load this list.</p>;
    if (!query.data?.length) return <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{empty}</p>;
    return <ul className="flex flex-col gap-2">{query.data.map(render)}</ul>;
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Email</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Your inbox, read for you. Bills, appointments, deadlines and subscription receipts become tasks, calendar
            events and subscriptions. Anything it isn&apos;t sure about waits here for your OK.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => sync.mutate()} disabled={sync.isPending}>
          <Mail className="size-4" />
          {sync.isPending ? 'Checking…' : 'Check now'}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-5">
        <TabsList>
          <TabsTrigger value="waiting">
            Needs your OK
            {!!waiting.data?.length && <Badge className="ml-1.5 h-4 min-w-4 rounded-full px-1 text-[10px]">{waiting.data.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="done">Done for you</TabsTrigger>
          <TabsTrigger value="skipped">Skipped</TabsTrigger>
        </TabsList>

        <TabsContent value="waiting" className="mt-4">
          {list(waiting, 'Nothing is waiting on you.', (item) => (
            <Row key={item.id} item={item}>
              {item.proposal && (
                <Button size="sm" onClick={() => void act(item, 'approve')}>
                  {item.status === 'FAILED' ? 'Try again' : 'Do it'}
                </Button>
              )}
              <Button size="icon" variant="ghost" title="Dismiss" onClick={() => void act(item, 'dismiss')}>
                <X className="size-4" />
              </Button>
            </Row>
          ))}
        </TabsContent>

        <TabsContent value="done" className="mt-4">
          {list(done, 'Nothing has been added from your email yet.', (item) => (
            <Row key={item.id} item={item}>
              {item.status === 'APPLIED' ? (
                <Button size="sm" variant="ghost" onClick={() => void act(item, 'undo')}>
                  <Undo2 className="size-4" /> Undo
                </Button>
              ) : (
                <Badge variant="secondary">Undone</Badge>
              )}
            </Row>
          ))}
        </TabsContent>

        <TabsContent value="skipped" className="mt-4">
          <p className="mb-2 text-xs text-muted-foreground">
            Mail that needed nothing, or that you dismissed. Check here if you think something was missed.
          </p>
          {list(skipped, 'Nothing skipped yet.', (item) => (
            <Row key={item.id} item={item} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
