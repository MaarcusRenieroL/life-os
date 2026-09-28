import { format, parse } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Props {
  label: string;
  /** "yyyy-MM-dd" of the currently displayed anchor date - used to seed the jump-to-date picker. */
  anchor: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onJump: (isoDate: string) => void;
  onNew: () => void;
}

/** Shared prev/next/today/jump-to-date navigation + "New event" action, used by
 * Month/Week/Day/Agenda. */
export function DateNavHeader({ label, anchor, onPrev, onNext, onToday, onJump, onNew }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Button size="icon" variant="outline" onClick={onPrev} aria-label="Previous">
          <ChevronLeft className="size-4" />
        </Button>
        <Button variant="outline" onClick={onToday}>
          Today
        </Button>
        <Button size="icon" variant="outline" onClick={onNext} aria-label="Next">
          <ChevronRight className="size-4" />
        </Button>
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button size="icon" variant="outline" aria-label="Jump to date">
              <CalendarDays className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={parse(anchor, 'yyyy-MM-dd', new Date())}
              onSelect={(next) => {
                if (!next) return;
                onJump(format(next, 'yyyy-MM-dd'));
                setPickerOpen(false);
              }}
              autoFocus
            />
          </PopoverContent>
        </Popover>
        <h1 className="ml-2 text-xl font-semibold tracking-tight">{label}</h1>
      </div>
      <Button onClick={onNew}>
        <Plus /> New event
      </Button>
    </div>
  );
}
