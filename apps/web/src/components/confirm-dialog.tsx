import { useCallback, useRef, useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button - use for anything destructive/irreversible (the default: most confirms
   * guard a delete). Set false for a non-destructive confirmation. */
  destructive?: boolean;
}

/**
 * Imperative replacement for the browser's native `confirm()` - same call shape (`await
 * confirm(...)` resolves to a boolean), but renders as the app's own AlertDialog instead of the
 * browser's unstyled, unskippable default dialog. Render `dialog` once near the top of the
 * component tree that calls `confirm`; every call reuses the same dialog instance.
 *
 * const { confirm, dialog } = useConfirmDialog();
 * async function remove(item) {
 *   if (!(await confirm({ title: `Delete "${item.name}"?`, confirmLabel: 'Delete' }))) return;
 *   await api.delete(item.id);
 * }
 * return <div>{dialog}...</div>;
 */
export function useConfirmDialog() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((next: ConfirmOptions) => {
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  function settle(result: boolean) {
    setOptions(null);
    resolveRef.current?.(result);
    resolveRef.current = null;
  }

  const dialog = (
    <AlertDialog open={options !== null} onOpenChange={(open) => !open && settle(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className={options?.destructive === false ? undefined : 'text-destructive'}>
            {options?.title}
          </AlertDialogTitle>
          {options?.description && <AlertDialogDescription>{options.description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => settle(false)}>{options?.cancelLabel ?? 'Cancel'}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              settle(true);
            }}
            className={
              options?.destructive === false ? undefined : 'bg-destructive text-white hover:bg-destructive/90'
            }
          >
            {options?.confirmLabel ?? 'Confirm'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, dialog };
}
