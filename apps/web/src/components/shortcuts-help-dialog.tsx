import { useEffect, useState } from 'react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { KEYBOARD_SHORTCUTS } from '@/config/keyboard-shortcuts';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/** "?" opens a read-only list of every global/module shortcut - mounted once in AppShell so it
 * works from anywhere in the app, same ignored-while-typing guard as the module-specific
 * shortcuts (tasks' "N", calendar's "E") it documents. */
export function ShortcutsHelpDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== '?' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      setOpen(true);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const byScope = KEYBOARD_SHORTCUTS.reduce<Record<string, typeof KEYBOARD_SHORTCUTS>>((acc, shortcut) => {
    (acc[shortcut.scope] ??= []).push(shortcut);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {Object.entries(byScope).map(([scope, shortcuts]) => (
            <div key={scope}>
              <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">{scope}</p>
              <div className="flex flex-col gap-1.5">
                {shortcuts.map((shortcut) => (
                  <div key={shortcut.keys} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{shortcut.description}</span>
                    <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">{shortcut.keys}</kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
