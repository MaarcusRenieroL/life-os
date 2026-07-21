import { Component, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';

import { BulkImportResult, VaultEntryWriteRequest } from '../../../core/models/vault.model';
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

  private readonly csvFileInput = viewChild<HTMLInputElement>('csvFileInput');

  protected readonly backupFrequencyOptions = BACKUP_FREQUENCY_OPTIONS;

  // Mock, local-only preference - no backend for backup frequency yet.
  protected readonly backupFrequency = signal<BackupFrequency>('daily');

  // TODO(backend): no backup/restore API yet, this timestamp is static mock copy.
  protected readonly lastBackupLabel = 'Today, 3:00 AM';

  protected readonly exportingVault = signal(false);
  protected readonly downloadingEverything = signal(false);
  protected readonly importingCsv = signal(false);

  protected readonly restoreDialogVisible = signal(false);
  protected readonly deleteAccountDialogVisible = signal(false);
  protected readonly importResultDialogVisible = signal(false);

  protected readonly importResult = signal<BulkImportResult | null>(null);
  protected readonly importError = signal<string | null>(null);

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

  protected importFromAnotherManager(): void {
    this.csvFileInput()?.click();
  }

  protected onCsvFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // allow re-selecting the same file if the user retries

    if (!file) return;

    this.importError.set(null);
    this.importResult.set(null);

    file.text().then((text) => this.parseAndImportCsv(text));
  }

  private parseAndImportCsv(text: string): void {
    const rows = parseCsv(text);

    if (rows.length < 2) {
      this.importError.set('CSV file is empty or has no data rows.');
      this.importResultDialogVisible.set(true);
      return;
    }

    const header = rows[0].map((cell) => cell.trim().toLowerCase());
    const titleIndex = header.indexOf('title');
    const urlIndex = header.indexOf('url');
    const usernameIndex = header.indexOf('username');
    const passwordIndex = header.indexOf('password');

    if (titleIndex === -1) {
      this.importError.set('CSV must have a "Title" column.');
      this.importResultDialogVisible.set(true);
      return;
    }

    const entries: VaultEntryWriteRequest[] = rows.slice(1).map((row) => ({
      type: 'LOGIN',
      title: (row[titleIndex] ?? '').trim(),
      url: urlIndex >= 0 ? (row[urlIndex] ?? '').trim() || null : null,
      username: usernameIndex >= 0 ? (row[usernameIndex] ?? '').trim() || null : null,
      password: passwordIndex >= 0 ? (row[passwordIndex] ?? '').trim() || null : null,
    }));

    this.importingCsv.set(true);

    this.vaultApi.bulkCreateEntries(entries).subscribe({
      next: (result) => {
        this.importingCsv.set(false);
        this.importResult.set(result);
        this.importResultDialogVisible.set(true);
      },
      error: (error) => {
        this.importingCsv.set(false);
        this.importError.set(error?.error?.message ?? 'Unable to import CSV file.');
        this.importResultDialogVisible.set(true);
      },
    });
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

// Minimal RFC4180-style CSV parser: handles quoted fields (needed for values that
// contain commas or embedded quotes, e.g. a URL with a query string, or a note with
// a comma in it), which a plain text.split(',') would silently mangle.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}
