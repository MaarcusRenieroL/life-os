import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SelectModule } from 'primeng/select';

import { AccountResponse } from '../../../core/models/finance.model';
import { FinanceAccountApiService } from '../../../core/services/finance-account-api.service';
import {
  FinanceImportApiService,
  GmailConnectionStatus,
  StatementImportResult,
} from '../../../core/services/finance-import-api.service';
import { accountSubLabel } from '../finance.util';

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

@Component({
  selector: 'app-finance-import',
  standalone: true,
  imports: [DecimalPipe, DatePipe, RouterLink, FormsModule, SelectModule],
  templateUrl: './import.html',
  styleUrl: './import.scss',
})
export class FinanceImport implements OnInit {
  private readonly accountApi = inject(FinanceAccountApiService);
  private readonly importApi = inject(FinanceImportApiService);

  protected readonly accountSubLabel = accountSubLabel;
  protected readonly accounts = signal<AccountResponse[]>([]);
  protected readonly selectedAccountId = signal<string | null>(null);
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly password = signal('');
  protected readonly uploadState = signal<UploadState>('idle');
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly importResult = signal<StatementImportResult | null>(null);
  protected readonly dragOver = signal(false);

  protected readonly resultMessage = () => {
    const result = this.importResult();
    if (!result) return '';
    return `${result.rowsImported} of ${result.rowsParsed} transactions imported.`;
  };

  protected readonly isPdf = () => this.selectedFile()?.name.toLowerCase().endsWith('.pdf') ?? false;

  protected readonly gmailConnectUrl = this.importApi.gmailConnectUrl();
  protected readonly gmailStatus = signal<GmailConnectionStatus | null>(null);
  protected readonly gmailStatusLoading = signal(true);

  protected readonly syncingAll = signal(false);
  protected readonly syncAllResult = signal<string | null>(null);
  protected readonly syncAllError = signal<string | null>(null);

  ngOnInit(): void {
    this.accountApi.getAccounts().subscribe({
      next: (accounts) => {
        this.accounts.set(accounts);
        if (accounts.length > 0) this.selectedAccountId.set(accounts[0].id);
      },
      error: () => undefined,
    });

    this.importApi.getGmailStatus().subscribe({
      next: (status) => {
        this.gmailStatus.set(status);
        this.gmailStatusLoading.set(false);
      },
      error: () => this.gmailStatusLoading.set(false),
    });
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
    this.uploadState.set('idle');
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.selectedFile.set(file);
      this.uploadState.set('idle');
    }
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }

  protected onDragLeave(): void {
    this.dragOver.set(false);
  }

  protected removeFile(): void {
    this.selectedFile.set(null);
    this.password.set('');
    this.uploadState.set('idle');
    this.importResult.set(null);
  }

  protected syncAll(): void {
    this.syncingAll.set(true);
    this.syncAllResult.set(null);
    this.syncAllError.set(null);

    this.importApi.syncAllGmailHistory().subscribe({
      next: (count) => {
        this.syncingAll.set(false);
        this.syncAllResult.set(`${count} transactions synced from your full Gmail history.`);
      },
      error: (err) => {
        this.syncingAll.set(false);
        const httpError = err as { error?: { message?: string } };
        this.syncAllError.set(httpError?.error?.message ?? 'Could not sync Gmail history.');
      },
    });
  }

  protected submit(): void {
    const file = this.selectedFile();
    const accountId = this.selectedAccountId();
    if (!file || !accountId) return;

    this.uploadState.set('uploading');
    this.errorMessage.set(null);
    this.importResult.set(null);

    this.importApi.importStatement(file, accountId, this.password() || undefined).subscribe({
      next: (result) => {
        this.importResult.set(result);
        this.uploadState.set('success');
      },
      error: (err) => {
        this.uploadState.set('error');
        const httpError = err as { error?: { message?: string } };
        this.errorMessage.set(httpError?.error?.message ?? 'Could not parse this statement. Please try again.');
      },
    });
  }
}
