import { Component, computed, inject, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { PasswordModule } from 'primeng/password';

import { RecoveryCodeStatus } from '../../../core/models/vault.model';
import { VaultApiService } from '../../../core/services/vault-api.service';

@Component({
  selector: 'app-recovery-codes-dialog',
  standalone: true,
  imports: [FormsModule, DialogModule, ButtonModule, PasswordModule],
  templateUrl: './recovery-codes-dialog.html',
  styleUrl: './recovery-codes-dialog.scss',
})
export class RecoveryCodesDialog {
  visible = model<boolean>(false);

  private readonly vaultApi = inject(VaultApiService);

  protected readonly statusCodes = signal<RecoveryCodeStatus[]>([]);
  protected readonly revealedCodes = signal<string[] | null>(null);
  protected readonly currentPassword = signal('');
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly submitting = signal(false);

  protected readonly hasExistingCodes = computed(() => this.statusCodes().length > 0);

  protected readonly remainingCount = computed(
    () => this.statusCodes().filter((code) => !code.used).length,
  );

  protected readonly generatedLabel = computed(() => {
    // Codes in a batch are all created together, so the earliest row's
    // createdAt (list is fetched oldest-first) stands in for the batch's
    // generation time.
    const oldest = this.statusCodes()[0];
    if (!oldest) return null;

    const days = Math.floor(
      (Date.now() - new Date(oldest.createdAt).getTime()) / (24 * 60 * 60 * 1000),
    );
    if (days < 1) return 'generated today';
    if (days < 60) return `generated ${days} day${days === 1 ? '' : 's'} ago`;

    const months = Math.round(days / 30);
    return `generated ${months} month${months === 1 ? '' : 's'} ago`;
  });

  protected onShow(): void {
    this.revealedCodes.set(null);
    this.currentPassword.set('');
    this.errorMessage.set(null);
    this.loadStatus();
  }

  protected generate(): void {
    if (!this.currentPassword() || this.submitting()) return;

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.vaultApi.generateRecoveryCodes(this.currentPassword()).subscribe({
      next: (response) => {
        this.submitting.set(false);
        this.currentPassword.set('');
        this.revealedCodes.set(response.codes);
        this.loadStatus();
      },
      error: (error) => {
        this.submitting.set(false);
        this.errorMessage.set(error?.error?.message ?? 'Unable to generate recovery codes.');
      },
    });
  }

  protected downloadCodes(): void {
    const codes = this.revealedCodes();
    if (!codes) return;

    const blob = new Blob([codes.join('\n') + '\n'], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'recovery-codes.txt';
    link.click();

    URL.revokeObjectURL(url);
  }

  protected done(): void {
    this.visible.set(false);
  }

  private loadStatus(): void {
    this.vaultApi.listRecoveryCodes().subscribe({
      next: (codes) => this.statusCodes.set(codes),
      error: () => undefined,
    });
  }
}
