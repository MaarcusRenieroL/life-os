import { useRef, useState } from 'react';

/**
 * Copies a sensitive value (vault passwords, card numbers) and auto-clears the
 * clipboard after `timeoutMs` - but only if the clipboard still holds exactly
 * what we put there (the user may have copied something else in the meantime).
 * Mirrors apps/web's core/services/clipboard.service.ts.
 */
export function useClipboard() {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const pendingClear = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCopiedValue = useRef<string | null>(null);

  function copyWithAutoClear(value: string, fieldKey: string, timeoutMs = 30000) {
    navigator.clipboard
      .writeText(value)
      .then(() => {
        lastCopiedValue.current = value;

        setCopiedField(fieldKey);
        setTimeout(() => setCopiedField(null), 2000);

        if (pendingClear.current != null) {
          clearTimeout(pendingClear.current);
        }

        pendingClear.current = setTimeout(() => {
          navigator.clipboard
            .readText()
            .then((current) => {
              if (current === lastCopiedValue.current) {
                navigator.clipboard.writeText('');
              }
            })
            .catch(() => {
              // clipboard read denied - leave the clipboard as-is rather than guessing
            });
          pendingClear.current = null;
        }, timeoutMs);
      })
      .catch(() => {
        // clipboard write denied (permissions, insecure context, etc.) - don't
        // show "Copied!" for something that didn't actually copy
      });
  }

  return { copiedField, copyWithAutoClear };
}
