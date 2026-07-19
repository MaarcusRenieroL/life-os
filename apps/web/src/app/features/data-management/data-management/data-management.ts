import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

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
  imports: [FormsModule, ButtonModule, DialogModule, DeleteAccountConfirmDialog],
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
   * Real export: pulls actual vault entries from the backend and saves them as a JSON file.
   * NOTE: this is a best-effort export of what the frontend can already read - a true
   * "encrypted JSON"/CSV export format and zero-knowledge export would need backend work.
   */
  protected exportVault(): void {
    if (this.exportingVault()) return;
    this.exportingVault.set(true);

    this.vaultApi.getEntries().subscribe({
      next: (entries) => {
        this.downloadJson(entries, 'vault-export.json');
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
   * Real action: bundles whatever real data is available client-side (vault entries) into a
   * single JSON download. The "cards", "audit log" and "settings" portions are mock/local-only
   * placeholders until those areas have real backends to read from.
   */
  protected downloadEverything(): void {
    if (this.downloadingEverything()) return;
    this.downloadingEverything.set(true);

    this.vaultApi.getEntries().subscribe({
      next: (entries) => {
        this.downloadJson(
          {
            vault: entries,
            cards: [], // TODO(backend): no cards export API yet.
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
