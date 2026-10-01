import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Inbox, Mail } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { toast } from 'sonner';

import { TabNav } from '@/components/tab-nav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

import { EmailEventReviewList } from './email-event-review-list';
import { jobApi, jobEmailApi } from './job-api';

// The Angular app never wired a tab bar for this module (job-tracker was
// `enabled: false` in its module config, so it fell back to no tabs at all -
// /jobs/resumes had no in-app link whatsoever). Fixing that here.
const TABS = [
  { label: 'Dashboard', to: '/jobs', end: true },
  { label: 'Jobs', to: '/jobs/list', end: false },
  { label: 'Openings', to: '/jobs/openings', end: false },
  { label: 'Add a Job', to: '/jobs/discovery', end: false },
  { label: 'Profile', to: '/jobs/resumes', end: false },
  { label: 'Analytics', to: '/jobs/analytics', end: false },
];

export function JobTrackerLayout() {
  const queryClient = useQueryClient();
  const syncEmail = useMutation({
    mutationFn: jobEmailApi.syncNow,
    onSuccess: (queued) => {
      toast.success(
        queued === 0
          ? 'No job emails found in the last week'
          : `Reading ${queued} job email${queued === 1 ? '' : 's'} - your jobs update in a moment`,
      );
      // Classification runs in the background after the emails are queued; look again shortly.
      setTimeout(() => void queryClient.invalidateQueries({ queryKey: ['jobs'] }), 8000);
    },
    onError: () =>
      toast.error('Could not check your email. Make sure Gmail is connected under Finance → Import.'),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['jobs', 'email-events', 'needs-review'],
    queryFn: jobApi.needsReviewEmailEvents,
  });

  return (
    <div>
      <TabNav
        tabs={TABS}
        trailing={
          <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 gap-1.5"
            onClick={() => syncEmail.mutate()}
            disabled={syncEmail.isPending}
          >
            <Mail className="size-3.5" />
            {syncEmail.isPending ? 'Checking…' : 'Check email'}
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="relative mb-2 gap-1.5">
                <Inbox className="size-3.5" />
                Review
                {events.length > 0 && (
                  <Badge className="ml-1 h-4 min-w-4 rounded-full px-1 text-[10px]">{events.length}</Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Needs your review</SheetTitle>
                <SheetDescription>
                  Detected from Gmail - low-confidence matches and offers always wait for you to
                  confirm before anything changes.
                </SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-4">
                <EmailEventReviewList />
              </div>
            </SheetContent>
          </Sheet>
          </div>
        }
      />
      <Outlet />
    </div>
  );
}
