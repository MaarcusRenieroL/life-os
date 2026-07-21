import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';

import { VaultApiService } from '../../../core/services/vault-api.service';
import { DeleteAccountConfirmDialog } from '../delete-account-confirm-dialog/delete-account-confirm-dialog';

type BackupFrequency = 'daily' | 'weekly' | 'off';

const BACKUP_FREQUENCY_OPTIONS: { label: string; value: BackupFrequency }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Off', value: 'off' },
];

@Component({
  selector: 'app-data-management',
  standalone: true,
  imports: [FormsModule, ButtonModule, DialogModule, SelectModule, DeleteAccountConfirmDialog],
  templateUrl: './data-management.html',
  styleUrl: './data-management.scss',
})
export class DataManagementPage {
  private readonly vaultApi = inject(VaultApiService);

  protected readonly backupFrequencyOptions = BACKUP_FREQUENCY_OPTIONS;

  // Mock, local-only preference - no backend for backup frequency yet.
  protected readonly backupFrequency = signal<BackupFrequency>('daily');

  // TODO(backend): no backup/restore API yet, this timestamp is static mock copy.
  protected readonly lastBackupLabel = 'Today, 3:00 AM';

  protected readonly exportingVault = signal(false);
  protected readonly downloadingEverything = signal(false);

  protected readonly restoreDialogVisible = signal(false);
  protected readonly deleteAccountDialogVisible = signal(false);

  /**
   * Pulls the real, fully-decrypted export (entries + cards) from the backend and
   * saves it as a JSON file. Cards include the full card number and CVV in plaintext -
   * this is a personal backup, not the masked view the Cards screen shows.
   */
  protected exportVault(): void {
    if (this.exportingVault()) return;
    this.exportingVault.set(true);

    this.vaultApi.exportVault().subscribe({
      next: (data) => {
        this.downloadJson(data, 'vault-export.json');
        this.exportingVault.set(false);
      },
      error: () => {
        this.exportingVault.set(false);
      },
    });
  }

  // TODO(backend): needs an import-parsing endpoint before this can do anything real.
  protected importFromAnotherManager(): void {
    // No-op stub - importing from 1Password/Bitwarden/LastPass requires server-side parsing
    // that doesn't exist yet, so this action intentionally does nothing.
  }

  /**
   * Bundles the real vault export (entries + cards) into a single JSON download.
   * "auditLog" and "settings" are still placeholders - those areas have no backend yet.
   */
  protected downloadEverything(): void {
    if (this.downloadingEverything()) return;
    this.downloadingEverything.set(true);

    this.vaultApi.exportVault().subscribe({
      next: (data) => {
        this.downloadJson(
          {
            vault: data.entries,
            cards: data.cards,
            auditLog: [], // TODO(backend): no audit log API yet.
            settings: {}, // TODO(backend): no settings API yet.
          },
          'life-os-data-export.json',
        );
        this.downloadingEverything.set(false);
      },
      error: () => {
        this.downloadingEverything.set(false);
      },
    });
  }

  protected openRestoreDialog(): void {
    this.restoreDialogVisible.set(true);
  }

  protected openDeleteAccountDialog(): void {
    this.deleteAccountDialogVisible.set(true);
  }

  private downloadJson(data: unknown, filename: string): void {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
  }
}
