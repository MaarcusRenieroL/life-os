import { BookOpen, Briefcase, Flag, Folder, ListChecks, Map, Star, Users } from 'lucide-react';

// Template categories are free-text (NoteTemplate.category), so there's no
// fixed enum to key a color/icon map off - instead hash the category string
// into a fixed palette, so the same category always renders the same color.
const PALETTE = [
  'var(--primary)',
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--muted-foreground)',
  'var(--destructive)',
];

const ICONS = [Folder, Users, BookOpen, Briefcase, Flag, ListChecks, Map, Star];

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (h * 31 + value.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function categoryColor(category: string | null | undefined): string {
  if (!category) return 'var(--muted-foreground)';
  return PALETTE[hash(category) % PALETTE.length];
}

export function categoryIcon(category: string | null | undefined) {
  if (!category) return Folder;
  return ICONS[hash(category) % ICONS.length];
}
