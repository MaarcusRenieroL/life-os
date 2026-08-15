// Template categories are free-text (NoteTemplate.category), so there's no
// fixed enum to key a color/icon map off like note types have - instead
// hash the category string into the same palette used elsewhere, so the
// same category always renders the same color within a session.
const PALETTE = [
  'var(--primary)',
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--warning)',
  'var(--danger-alt)',
];

const ICONS = ['pi-folder', 'pi-users', 'pi-book', 'pi-briefcase', 'pi-flag', 'pi-list-check', 'pi-map', 'pi-star'];

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

export function categoryIcon(category: string | null | undefined): string {
  if (!category) return 'pi-clone';
  return ICONS[hash(category) % ICONS.length];
}
