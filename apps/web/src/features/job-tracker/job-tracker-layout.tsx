import { useQuery } from '@tanstack/react-query';
import { Inbox } from 'lucide-react';
import { Outlet } from 'react-router-dom';

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
import { jobApi } from './job-api';

// The Angular app never wired a tab bar for this module (job-tracker was
// `enabled: false` in its module config, so it fell back to no tabs at all -
// /jobs/resumes had no in-app link whatsoever). Fixing that here.
const TABS = [
  { label: 'Dashboard', to: '/jobs', end: true },
  { label: 'Jobs', to: '/jobs/list', end: false },
  { label: 'Add a Job', to: '/jobs/discovery', end: false },
  { label: 'Profile', to: '/jobs/resumes', end: false },
  { label: 'Analytics', to: '/jobs/analytics', end: false },
];

export function JobTrackerLayout() {
  const { data: events = [] } = useQuery({
    queryKey: ['jobs', 'email-events', 'needs-review'],
    queryFn: jobApi.needsReviewEmailEvents,
  });

  return (
    <div>
      <TabNav
        tabs={TABS}
        trailing={
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
        }
      />
      <Outlet />
    </div>
  );
}
