import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ClipboardService {
  private pendingClearHandle: number | null = null;
  private lastCopiedValue: string | null = null;

  readonly copiedField = signal<string | null>(null);

  copyWithAutoClear(value: string, fieldKey: string, timeoutMs = 30000) {
    navigator.clipboard.writeText(value);
    this.lastCopiedValue = value;

    this.copiedField.set(fieldKey);
    setTimeout(() => this.copiedField.set(null), 2000);

    if (this.pendingClearHandle != null) {
      clearTimeout(this.pendingClearHandle);
    }

    this.pendingClearHandle = setTimeout(() => {
      navigator.clipboard
        .readText()
        .then((currentClipboardValue) => {
          if (currentClipboardValue === this.lastCopiedValue) {
            navigator.clipboard.writeText('');
          }
        })
        .catch();

      this.pendingClearHandle = null;
    }, timeoutMs);
  }
}
