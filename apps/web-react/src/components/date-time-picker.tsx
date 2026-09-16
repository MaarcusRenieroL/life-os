import { format, parse } from 'date-fns';
import { CalendarIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import { cn } from 'cn';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

/** Date-only variant (no time row) - takes/returns a plain "yyyy-MM-dd" string, matching what a
 * LocalDate field on the backend expects. */
export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
}: {
  value: string | null;
  onChange: (isoDate: string | null) => void;
  placeholder?: string;
}) {
  const date = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined;
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn('w-full justify-start font-normal', !date && 'text-muted-foreground')}
        >
          <CalendarIcon className="size-4" />
          {date ? format(date, 'PP') : placeholder}
          {date && (
            <XIcon
              className="ml-auto size-3.5 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(next) => {
            onChange(next ? format(next, 'yyyy-MM-dd') : null);
            setOpen(false);
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}

interface Props {
  value: string | null;
  onChange: (iso: string | null) => void;
  placeholder?: string;
}

export function DateTimePicker({ value, onChange, placeholder = 'Pick a date & time' }: Props) {
  const date = value ? new Date(value) : undefined;
  const [open, setOpen] = useState(false);

  function pickDate(next: Date | undefined) {
    if (!next) return;
    const merged = new Date(next);
    if (date) {
      merged.setHours(date.getHours(), date.getMinutes(), 0, 0);
    } else {
      merged.setHours(9, 0, 0, 0);
    }
    onChange(merged.toISOString());
    setOpen(false);
  }

  function pickTime(timeStr: string) {
    if (!timeStr) return;
    const [hours, minutes] = timeStr.split(':').map(Number);
    const merged = new Date(date ?? new Date());
    merged.setHours(hours, minutes, 0, 0);
    onChange(merged.toISOString());
  }

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn('flex-1 justify-start font-normal', !date && 'text-muted-foreground')}
          >
            <CalendarIcon className="size-4" />
            {date ? format(date, 'PP') : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar mode="single" selected={date} onSelect={pickDate} autoFocus />
        </PopoverContent>
      </Popover>
      <Input type="time" className="w-28" value={date ? format(date, 'HH:mm') : ''} onChange={(e) => pickTime(e.target.value)} />
      {date && (
        <Button type="button" variant="ghost" size="icon" onClick={() => onChange(null)}>
          <XIcon className="size-4" />
        </Button>
      )}
    </div>
  );
}
