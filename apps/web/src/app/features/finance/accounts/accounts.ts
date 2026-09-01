import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { AccountResponse, CreateAccountRequest, ReconcileAccountRequest, UpdateAccountRequest } from '../../../core/models/finance.model';
import { FinanceAccountApiService } from '../../../core/services/finance-account-api.service';
import { accountLabel, accountSubLabel } from '../finance.util';
import { AccountDialog } from './account-dialog/account-dialog';
import { ReconcileDialog } from './reconcile-dialog/reconcile-dialog';

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  SAVINGS: 'Savings',
  CHECKING: 'Checking',
  CREDIT_CARD: 'Credit card',
  INVESTMENT: 'Investment',
  CASH: 'Cash',
};

@Component({
  selector: 'app-finance-accounts',
  standalone: true,
  imports: [CurrencyPipe, AccountDialog, ReconcileDialog],
  templateUrl: './accounts.html',
  styleUrl: './accounts.scss',
})
export class FinanceAccounts implements OnInit {
  private readonly accountApi = inject(FinanceAccountApiService);

  protected readonly loading = signal(true);
  protected readonly accounts = signal<AccountResponse[]>([]);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly accountLabel = accountLabel;
  protected readonly accountSubLabel = accountSubLabel;

  protected readonly dialogVisible = signal(false);
  protected readonly editingAccount = signal<AccountResponse | null>(null);

  protected readonly reconcileDialogVisible = signal(false);
  protected readonly reconcileTarget = signal<AccountResponse | null>(null);

  protected readonly totalBalance = computed(() => this.accounts().reduce((sum, a) => sum + a.currentBalance, 0));

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.accountApi.getAccounts().subscribe({
      next: (accounts) => {
        this.accounts.set(accounts);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(this.messageFor(err, 'Could not load accounts'));
      },
    });
  }

  private messageFor(err: unknown, fallback: string): string {
    const httpError = err as { error?: { message?: string }; status?: number };
    return httpError?.error?.message ?? `${fallback} (HTTP ${httpError?.status ?? '?'})`;
  }

  protected typeLabel(type: string): string {
    return ACCOUNT_TYPE_LABELS[type] ?? type;
  }

  protected openCreate(): void {
    this.editingAccount.set(null);
    this.dialogVisible.set(true);
  }

  protected openEdit(account: AccountResponse): void {
    this.editingAccount.set(account);
    this.dialogVisible.set(true);
  }

  protected createAccount(request: CreateAccountRequest): void {
    this.errorMessage.set(null);
    this.accountApi.createAccount(request).subscribe({
      next: (account) => this.accounts.update((rows) => [...rows, account]),
      error: (err) => this.errorMessage.set(this.messageFor(err, 'Could not add account')),
    });
  }

  protected updateAccount(event: { id: string; request: UpdateAccountRequest }): void {
    this.errorMessage.set(null);
    this.accountApi.updateAccount(event.id, event.request).subscribe({
      next: (updated) => this.accounts.update((rows) => rows.map((a) => (a.id === updated.id ? updated : a))),
      error: (err) => this.errorMessage.set(this.messageFor(err, 'Could not update account')),
    });
  }

  protected deleteAccount(account: AccountResponse): void {
    this.errorMessage.set(null);
    this.accountApi.deleteAccount(account.id).subscribe({
      next: () => this.accounts.update((rows) => rows.filter((a) => a.id !== account.id)),
      error: (err) => this.errorMessage.set(this.messageFor(err, 'Could not delete account')),
    });
  }

  protected openReconcile(account: AccountResponse): void {
    this.reconcileTarget.set(account);
    this.reconcileDialogVisible.set(true);
  }

  protected reconcile(request: ReconcileAccountRequest): void {
    const target = this.reconcileTarget();
    if (!target) return;
    this.errorMessage.set(null);
    this.accountApi.reconcileAccount(target.id, request).subscribe({
      next: (updated) => this.accounts.update((rows) => rows.map((a) => (a.id === updated.id ? updated : a))),
      error: (err) => this.errorMessage.set(this.messageFor(err, 'Could not reconcile account')),
    });
  }
}
