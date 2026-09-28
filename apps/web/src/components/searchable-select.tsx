import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface SearchableSelectOption {
  id: string;
  label: string;
}

interface Props {
  options: SearchableSelectOption[];
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  /** When provided, a search query that matches nothing existing offers "Create '<query>'",
   * which calls this and selects the result - lets a project/goal be created inline instead of
   * needing a separate management screen first. */
  onCreate?: (name: string) => Promise<SearchableSelectOption>;
  disabled?: boolean;
}

/** Generic searchable combobox (Popover + cmdk Command) - built for "link to project"/"link to
 * goal" needing a real name-based picker instead of a raw UUID field, but intentionally generic
 * so anything else needing the same pattern can reuse it. */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyMessage = 'No matches.',
  onCreate,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);

  const selected = options.find((o) => o.id === value);
  const exactMatch = options.some((o) => o.label.toLowerCase() === query.trim().toLowerCase());

  async function handleCreate() {
    if (!onCreate || !query.trim() || creating) return;
    setCreating(true);
    try {
      const created = await onCreate(query.trim());
      onChange(created.id);
      setOpen(false);
      setQuery('');
    } finally {
      setCreating(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn('w-full justify-between font-normal', !selected && 'text-muted-foreground')}
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} value={query} onValueChange={setQuery} />
          <CommandList>
            {selected && (
              <CommandItem
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="text-muted-foreground"
              >
                Clear selection
              </CommandItem>
            )}
            <CommandEmpty>
              {onCreate && query.trim() ? (
                <button
                  className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-sm hover:underline"
                  onClick={() => void handleCreate()}
                  disabled={creating}
                >
                  <Plus className="size-3.5" /> {creating ? 'Creating…' : `Create "${query.trim()}"`}
                </button>
              ) : (
                emptyMessage
              )}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn('size-4', option.id === value ? 'opacity-100' : 'opacity-0')} />
                  {option.label}
                </CommandItem>
              ))}
              {onCreate && query.trim() && !exactMatch && options.length > 0 && (
                <CommandItem onSelect={() => void handleCreate()} disabled={creating}>
                  <Plus className="size-3.5" /> {creating ? 'Creating…' : `Create "${query.trim()}"`}
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
