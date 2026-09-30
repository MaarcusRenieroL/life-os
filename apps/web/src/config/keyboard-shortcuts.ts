/** The single source of truth for the shortcuts-help dialog's listing. Each module still wires
 * its own keydown listener independently (tasks-layout.tsx's "N", calendar-layout.tsx's "E",
 * quick-capture-dialog.tsx's "C") rather than going through a shared registry - keep this list in
 * sync by hand when adding or changing one. */
export interface KeyboardShortcut {
  keys: string;
  description: string;
  scope: string;
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { keys: '?', description: 'Show this shortcuts list', scope: 'Global' },
  { keys: 'C', description: 'Open quick capture', scope: 'Global' },
  { keys: 'N', description: 'New task', scope: 'Tasks' },
  { keys: 'E', description: 'New event', scope: 'Calendar' },
  { keys: 'Esc', description: 'Close the open dialog', scope: 'Global' },
];
