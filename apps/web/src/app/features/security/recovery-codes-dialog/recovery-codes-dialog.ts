import { Component, computed, model, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

interface RecoveryCode {
  code: string;
  used: boolean;
}

// TODO(backend): no recovery-codes API yet, codes are generated/stored client-side only.
function generateMockCodes(): RecoveryCode[] {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const randomGroup = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const randomCode = () => `${randomGroup()}-${randomGroup()}-${randomGroup()}`;

  return Array.from({ length: 8 }, () => ({ code: randomCode(), used: false }));
}

@Component({
  selector: 'app-recovery-codes-dialog',
  standalone: true,
  imports: [DialogModule, ButtonModule],
  templateUrl: './recovery-codes-dialog.html',
  styleUrl: './recovery-codes-dialog.scss',
})
export class RecoveryCodesDialog {
  visible = model<boolean>(false);

  protected readonly codes = signal<RecoveryCode[]>(seedCodes());
  protected readonly generatedAt = signal(new Date(Date.now() - 120 * 24 * 60 * 60 * 1000));

  protected readonly remainingCount = computed(
    () => this.codes().filter((code) => !code.used).length,
  );

  protected readonly generatedLabel = computed(() => {
    const days = Math.floor((Date.now() - this.generatedAt().getTime()) / (24 * 60 * 60 * 1000));
    const months = Math.max(1, Math.round(days / 30));
    return months === 1 ? 'generated 1 month ago' : `generated ${months} months ago`;
  });

  protected done(): void {
    this.visible.set(false);
  }

  protected downloadCodes(): void {
    const lines = this.codes().map((code) => (code.used ? `${code.code} (used)` : code.code));
    const blob = new Blob([lines.join('\n') + '\n'], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'recovery-codes.txt';
    link.click();

    URL.revokeObjectURL(url);
  }

  protected regenerateAll(): void {
    this.codes.set(seedCodes(true));
    this.generatedAt.set(new Date());
  }
}

function seedCodes(allFresh = false): RecoveryCode[] {
  const codes = generateMockCodes();
  if (!allFresh) {
    codes[4] = { ...codes[4], used: true };
  }
  return codes;
}
