import { NoteType } from '../../../core/models/notes.model';

export interface NoteTypeMeta {
  label: string;
  icon: string;
  // CSS custom property (not a literal color) so light/dark theming stays
  // free - consumers bind this into [style.--note-accent] and let CSS do
  // the color-mix/opacity work, rather than baking a color into the class.
  colorVar: string;
}

// Ten note types round-robin the app's existing chart/status palette instead
// of introducing new colors - keeps note-type accents visually consistent
// with the rest of the design system in both themes.
const NOTE_TYPE_META: Record<NoteType, NoteTypeMeta> = {
  GENERAL: { label: 'General', icon: 'pi-file', colorVar: 'var(--muted-foreground)' },
  MEETING: { label: 'Meeting', icon: 'pi-users', colorVar: 'var(--chart-2)' },
  BOOK: { label: 'Book', icon: 'pi-book', colorVar: 'var(--chart-4)' },
  LEARNING: { label: 'Learning', icon: 'pi-graduation-cap', colorVar: 'var(--warning)' },
  TECHNICAL: { label: 'Technical', icon: 'pi-code', colorVar: 'var(--chart-1)' },
  SNIPPET: { label: 'Snippet', icon: 'pi-bolt', colorVar: 'var(--chart-3)' },
  RESEARCH: { label: 'Research', icon: 'pi-search', colorVar: 'var(--primary)' },
  CHECKLIST: { label: 'Checklist', icon: 'pi-check-square', colorVar: 'var(--chart-5)' },
  TRAVEL: { label: 'Travel', icon: 'pi-map', colorVar: 'var(--danger-alt)' },
  DECISION: { label: 'Decision', icon: 'pi-flag', colorVar: 'var(--destructive)' },
};

export function noteTypeMeta(type: NoteType | null | undefined): NoteTypeMeta {
  return NOTE_TYPE_META[type ?? 'GENERAL'] ?? NOTE_TYPE_META['GENERAL'];
}

export const NOTE_TYPE_LIST: { label: string; value: NoteType; icon: string }[] = (
  Object.keys(NOTE_TYPE_META) as NoteType[]
).map((value) => ({ value, label: NOTE_TYPE_META[value].label, icon: NOTE_TYPE_META[value].icon }));
