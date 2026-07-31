import { CurrencyPipe, SlicePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, debounceTime } from 'rxjs/operators';

import {
  AccountResponse,
  CategoryResponse,
  CreateTransactionRequest,
  SourceType,
  TransactionResponse,
  UpdateTransactionRequest,
} from '../../../core/models/finance.model';
import { FinanceAccountApiService } from '../../../core/services/finance-account-api.service';
import { FinanceCategoryApiService } from '../../../core/services/finance-category-api.service';
import { FinanceTransactionApiService, TransactionFilters } from '../../../core/services/finance-transaction-api.service';
import { accountLabel, sourceLabel } from '../finance.util';
import { AddTransactionDialog } from './add-transaction-dialog/add-transaction-dialog';
import { CategorizeDialog } from './categorize-dialog/categorize-dialog';
import { DisputeDialog } from './dispute-dialog/dispute-dialog';

type StatusFilter = 'all' | 'NEEDS_REVIEW' | 'CATEGORIZED' | 'DUPLICATE';

const PAGE_SIZE = 50;
const SOURCE_OPTIONS: { label: string; value: SourceType }[] = [
  { label: 'Email', value: 'EMAIL_ALERT' },
  { label: 'Statement', value: 'CSV_IMPORT' },
  { label: 'Manual', value: 'MANUAL_ENTRY' },
  { label: 'API', value: 'API' },
];

@Component({
  selector: 'app-finance-transactions',
  standalone: true,
  imports: [
    CurrencyPipe,
    SlicePipe,
    FormsModule,
    SelectModule,
    PaginatorModule,
    AddTransactionDialog,
    CategorizeDialog,
    DisputeDialog,
  ],
  templateUrl: './transactions.html',
  styleUrl: './transactions.scss',
})
export class FinanceTransactions implements OnInit {
  private readonly transactionApi = inject(FinanceTransactionApiService);
  private readonly categoryApi = inject(FinanceCategoryApiService);
  private readonly accountApi = inject(FinanceAccountApiService);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly transactions = signal<TransactionResponse[]>([]);
  protected readonly categories = signal<CategoryResponse[]>([]);
  protected readonly accounts = signal<AccountResponse[]>([]);
  protected readonly categoryMap = computed(() => new Map(this.categories().map((c) => [c.id, c])));
  protected readonly accountMap = computed(() => new Map(this.accounts().map((a) => [a.id, a])));

  protected readonly pageSize = PAGE_SIZE;
  protected readonly page = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly totalElements = signal(0);

  protected readonly query = signal('');
  protected readonly statusFilter = signal<StatusFilter>('all');
  protected readonly categoryFilter = signal<string>('all');
  protected readonly sourceFilter = signal<SourceType | 'all'>('all');
  protected readonly sourceFilterOptions: { label: string; value: SourceType | 'all' }[] = [
    { label: 'All sources', value: 'all' },
    ...SOURCE_OPTIONS,
  ];
  protected readonly categoryFilterOptions = computed(() => [
    { id: 'all', name: 'All categories' },
    ...this.categories(),
  ]);

  protected readonly statusChips: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'NEEDS_REVIEW', label: 'Needs review' },
    { id: 'CATEGORIZED', label: 'Categorized' },
    { id: 'DUPLICATE', label: 'Duplicates' },
  ];

  protected readonly selected = signal<Set<string>>(new Set());

  protected readonly addDialogVisible = signal(false);
  protected readonly editingTransaction = signal<TransactionResponse | null>(null);
  protected readonly categorizeDialogVisible = signal(false);
  protected readonly categorizeTargets = signal<string[]>([]);
  protected readonly categorizeCurrentCategoryIds = signal<string[]>([]);
  protected readonly categorizeLabel = signal('');

  protected readonly disputeDialogVisible = signal(false);

  private rowStatus(t: TransactionResponse): StatusFilter {
    if (t.isDuplicate) return 'DUPLICATE';
    if (t.categoryId === null && t.type !== 'CREDIT') return 'NEEDS_REVIEW';
    return 'CATEGORIZED';
  }

  // Filtering now happens server-side (see TransactionSpecifications on the
  // backend) so it applies across the whole result set, not just the loaded
  // page - this is just a passthrough kept so the template doesn't need to
  // change every reference from filteredRows() to transactions().
  protected readonly filteredRows = computed(() => this.transactions());

  protected readonly allFilteredSelected = computed(() => {
    const rows = this.filteredRows();
    const sel = this.selected();
    return rows.length > 0 && rows.every((r) => sel.has(r.id));
  });

  protected readonly netTotal = computed(() =>
    this.filteredRows().reduce((sum, t) => sum + (t.type === 'CREDIT' ? t.amount : -t.amount), 0),
  );

  private readonly searchChanged = new Subject<void>();

  ngOnInit(): void {
    this.categoryApi.getCategories().subscribe({
      next: (categories) => this.categories.set(categories),
      error: (err) => this.errorMessage.set(this.extractError(err)),
    });
    this.accountApi.getAccounts().subscribe({
      next: (accounts) => this.accounts.set(accounts),
      error: (err) => this.errorMessage.set(this.extractError(err)),
    });
    this.searchChanged.pipe(debounceTime(350)).subscribe(() => this.loadPage(0));
    this.loadPage(0);
  }

  private currentFilters(): TransactionFilters {
    const status = this.statusFilter();
    const category = this.categoryFilter();
    const source = this.sourceFilter();
    return {
      search: this.query().trim() || undefined,
      status: status === 'all' ? undefined : status,
      categoryId: category === 'all' ? undefined : category,
      sourceType: source === 'all' ? undefined : source,
    };
  }

  private loadPage(page: number): void {
    this.loading.set(true);
    this.transactionApi.getTransactions(page, PAGE_SIZE, this.currentFilters()).subscribe({
      next: (result) => {
        this.transactions.set(result.content);
        this.page.set(result.number);
        this.totalPages.set(result.totalPages);
        this.totalElements.set(result.totalElements);
        this.selected.set(new Set());
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected onPageChange(event: PaginatorState): void {
    this.loadPage(event.page ?? 0);
  }

  protected setQuery(value: string): void {
    this.query.set(value);
    this.searchChanged.next();
  }

  protected selectStatus(status: StatusFilter): void {
    this.statusFilter.set(status);
    this.loadPage(0);
  }

  protected selectCategoryFilter(categoryId: string): void {
    this.categoryFilter.set(categoryId);
    this.loadPage(0);
  }

  protected selectSourceFilter(source: SourceType | 'all'): void {
    this.sourceFilter.set(source);
    this.loadPage(0);
  }

  protected toggleRow(id: string): void {
    this.selected.update((sel) => {
      const next = new Set(sel);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  protected toggleAll(): void {
    const rows = this.filteredRows();
    if (this.allFilteredSelected()) {
      this.selected.set(new Set());
    } else {
      this.selected.set(new Set(rows.map((r) => r.id)));
    }
  }

  protected clearSelection(): void {
    this.selected.set(new Set());
  }

  protected rowStatusClasses(t: TransactionResponse): { rowBg: string; metaColor: string; meta: string } {
    const status = this.rowStatus(t);
    if (status === 'NEEDS_REVIEW') {
      return { rowBg: 'bg-warning/5', metaColor: 'text-warning', meta: 'needs review' };
    }
    return { rowBg: '', metaColor: 'text-foreground/45', meta: sourceLabel(t.sourceType) };
  }

  protected sourceColumnLabel(t: TransactionResponse): string {
    return sourceLabel(t.sourceType);
  }

  protected categoryNames(t: TransactionResponse): string {
    const map = this.categoryMap();
    const ids = (t.categoryIds ?? []).length > 0 ? t.categoryIds! : t.categoryId ? [t.categoryId] : [];
    const names = ids.map((id) => map.get(id)?.name).filter((n): n is string => !!n);
    return names.length > 0 ? names.join(', ') : 'Uncategorized';
  }

  protected categoryName(t: TransactionResponse): string {
    return t.categoryId ? (this.categoryMap().get(t.categoryId)?.name ?? 'Uncategorized') : 'Uncategorized';
  }

  protected accountName(t: TransactionResponse): string {
    const a = this.accountMap().get(t.accountId);
    return a ? accountLabel(a) : '—';
  }

  protected openCategorizeRow(t: TransactionResponse): void {
    this.categorizeTargets.set([t.id]);
    this.categorizeCurrentCategoryIds.set(
      (t.categoryIds ?? []).length > 0 ? t.categoryIds! : t.categoryId ? [t.categoryId] : [],
    );
    this.categorizeLabel.set(t.description);
    this.categorizeDialogVisible.set(true);
  }

  protected openRow(t: TransactionResponse): void {
    if (t.categoryId === null && t.type !== 'CREDIT') {
      this.openCategorizeRow(t);
    } else {
      this.router.navigate(['/finance/transactions', t.id]);
    }
  }

  protected openCategorizeBulk(): void {
    const ids = [...this.selected()];
    if (ids.length === 0) return;
    this.categorizeTargets.set(ids);
    if (ids.length === 1) {
      const txn = this.transactions().find((t) => t.id === ids[0]);
      this.categorizeCurrentCategoryIds.set(
        (txn?.categoryIds ?? []).length > 0 ? txn!.categoryIds! : txn?.categoryId ? [txn.categoryId] : [],
      );
    } else {
      this.categorizeCurrentCategoryIds.set([]);
    }
    this.categorizeLabel.set(`${ids.length} selected transactions`);
    this.categorizeDialogVisible.set(true);
  }

  protected applyCategorize(categoryIds: string[]): void {
    const ids = this.categorizeTargets();
    forkJoin(ids.map((id) => this.transactionApi.updateCategories(id, { categoryIds }))).subscribe({
      next: () => this.loadPage(this.page()),
      error: (err) => this.errorMessage.set(this.extractError(err)),
    });
  }

  protected markAsDuplicate(): void {
    const ids = [...this.selected()];
    if (ids.length < 2) return;
    const [canonical, ...duplicates] = ids;
    this.transactionApi.merge(canonical, { duplicateTransactionIds: duplicates }).subscribe({
      next: () => this.loadPage(this.page()),
      error: (err) => this.errorMessage.set(this.extractError(err)),
    });
  }

  protected openDispute(): void {
    if (this.selected().size === 0) return;
    this.disputeDialogVisible.set(true);
  }

  protected applyDispute(reason: string): void {
    const ids = [...this.selected()];
    forkJoin(ids.map((id) => this.transactionApi.dispute(id, { reason }))).subscribe({
      next: () => this.loadPage(this.page()),
      error: (err) => this.errorMessage.set(this.extractError(err)),
    });
  }

  protected deleteSelected(): void {
    const ids = [...this.selected()];
    if (ids.length === 0) return;
    forkJoin(ids.map((id) => this.transactionApi.deleteTransaction(id).pipe(catchError(() => of(undefined))))).subscribe(
      () => this.loadPage(this.page()),
    );
  }

  protected createRuleFromSelection(): void {
    const ids = [...this.selected()];
    const first = this.transactions().find((t) => ids.includes(t.id));
    this.router.navigate(['/finance/rules'], {
      queryParams: first ? { matchValue: first.description } : {},
    });
  }

  protected openAddTransaction(): void {
    this.editingTransaction.set(null);
    this.addDialogVisible.set(true);
  }

  protected openEditSelected(): void {
    const ids = [...this.selected()];
    if (ids.length !== 1) return;
    const txn = this.transactions().find((t) => t.id === ids[0]);
    if (!txn) return;
    this.editTransaction(txn);
  }

  protected editTransaction(t: TransactionResponse): void {
    this.editingTransaction.set(t);
    this.addDialogVisible.set(true);
  }

  protected addTransaction(request: CreateTransactionRequest): void {
    this.transactionApi.createTransaction(request).subscribe({
      next: () => this.loadPage(this.page()),
      error: (err) => this.errorMessage.set(this.extractError(err)),
    });
  }

  protected updateTransaction(event: { id: string; request: UpdateTransactionRequest }): void {
    this.transactionApi.updateTransaction(event.id, event.request).subscribe({
      next: () => this.loadPage(this.page()),
      error: (err) => this.errorMessage.set(this.extractError(err)),
    });
  }

  protected exportCsv(): void {
    const rows = this.filteredRows();
    const header = 'Date,Description,Category,Account,Source,Amount\n';
    const body = rows
      .map((t) =>
        [
          t.transactionDate,
          `"${t.description.replace(/"/g, '""')}"`,
          this.categoryName(t),
          this.accountName(t),
          t.sourceType,
          (t.type === 'CREDIT' ? '' : '-') + t.amount,
        ].join(','),
      )
      .join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  private extractError(err: unknown): string {
    const httpError = err as { error?: { message?: string } };
    return httpError?.error?.message ?? 'That action failed. Please try again.';
  }
}
