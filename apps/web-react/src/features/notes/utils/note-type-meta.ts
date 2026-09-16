import {
  BookOpen,
  Bolt,
  CheckSquare,
  Code,
  File,
  Flag,
  GraduationCap,
  Map,
  Search,
  Users,
} from 'lucide-react';

import type { NoteType } from '../types';

export interface NoteTypeMeta {
  label: string;
  icon: typeof File;
  /** CSS custom property name (not a literal color) so light/dark theming stays free. */
  colorVar: string;
}

// Ten note types round-robin the app's existing chart/status palette instead
// of introducing new colors.
const NOTE_TYPE_META: Record<NoteType, NoteTypeMeta> = {
  GENERAL: { label: 'General', icon: File, colorVar: 'var(--muted-foreground)' },
  MEETING: { label: 'Meeting', icon: Users, colorVar: 'var(--chart-2)' },
  BOOK: { label: 'Book', icon: BookOpen, colorVar: 'var(--chart-4)' },
  LEARNING: { label: 'Learning', icon: GraduationCap, colorVar: 'var(--chart-3)' },
  TECHNICAL: { label: 'Technical', icon: Code, colorVar: 'var(--chart-1)' },
  SNIPPET: { label: 'Snippet', icon: Bolt, colorVar: 'var(--chart-3)' },
  RESEARCH: { label: 'Research', icon: Search, colorVar: 'var(--primary)' },
  CHECKLIST: { label: 'Checklist', icon: CheckSquare, colorVar: 'var(--chart-5)' },
  TRAVEL: { label: 'Travel', icon: Map, colorVar: 'var(--destructive)' },
  DECISION: { label: 'Decision', icon: Flag, colorVar: 'var(--destructive)' },
};

export function noteTypeMeta(type: NoteType | null | undefined): NoteTypeMeta {
  return NOTE_TYPE_META[type ?? 'GENERAL'] ?? NOTE_TYPE_META.GENERAL;
}

export const NOTE_TYPE_LIST: { label: string; value: NoteType; icon: typeof File }[] = (
  Object.keys(NOTE_TYPE_META) as NoteType[]
).map((value) => ({ value, label: NOTE_TYPE_META[value].label, icon: NOTE_TYPE_META[value].icon }));
