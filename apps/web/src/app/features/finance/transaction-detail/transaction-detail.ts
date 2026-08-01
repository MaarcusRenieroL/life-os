import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MultiSelectModule } from 'primeng/multiselect';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import {
  AccountResponse,
  CategoryResponse,
  TransactionResponse,
} from '../../../core/models/finance.model';
import { FinanceAccountApiService } from '../../../core/services/finance-account-api.service';
import { FinanceCategoryApiService } from '../../../core/services/finance-category-api.service';
import { FinanceTransactionApiService } from '../../../core/services/finance-transaction-api.service';
import { accountLabel as accountLabelFor, accountSubLabel as accountSubLabelFor, sourceLabel } from '../finance.util';

interface SimilarRow {
  id: string;
  description: string;
  date: string;
  amount: number;
  isCredit: boolean;
}

@Component({
  selector: 'app-transaction-detail',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, FormsModule, RouterLink, MultiSelectModule],
  templateUrl: './transaction-detail.html',
  styleUrl: './transaction-detail.scss',
})
export class TransactionDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly transactionApi = inject(FinanceTransactionApiService);
  private readonly categoryApi = inject(FinanceCategoryApiService);
  private readonly accountApi = inject(FinanceAccountApiService);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly transaction = signal<TransactionResponse | null>(null);
  protected readonly categories = signal<CategoryResponse[]>([]);
  protected readonly accounts = signal<AccountResponse[]>([]);
  protected readonly allTransactions = signal<TransactionResponse[]>([]);

  protected readonly categoryMap = computed(() => new Map(this.categories().map((c) => [c.id, c])));
  protected readonly accountMap = computed(() => new Map(this.accounts().map((a) => [a.id, a])));

  protected selectedCategoryIds: string[] = [];
  protected notesDraft = '';
  protected receiptUrlDraft = '';

  protected readonly editingName = signal(false);
  protected readonly renamingSaving = signal(false);
  protected nameDraft = '';

  protected readonly accountLabel = computed(() => {
    const t = this.transaction();
    if (!t) return '';
    const a = this.accountMap().get(t.accountId);
    return a ? `${accountLabelFor(a)} (${accountSubLabelFor(a)})` : '—';
  });

  protected readonly initials = computed(() => {
    const t = this.transaction();
    if (!t) return '';
    return t.description
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
  });

  protected readonly prevId = computed(() => this.adjacentId(1));
  protected readonly nextId = computed(() => this.adjacentId(-1));

  private adjacentId(offset: number): string | null {
    const t = this.transaction();
    const list = this.allTransactions();
    if (!t) return null;
    const index = list.findIndex((x) => x.id === t.id);
    if (index === -1) return null;
    return list[index + offset]?.id ?? null;
  }

  protected readonly similarTransactions = computed<SimilarRow[]>(() => {
    const t = this.transaction();
    if (!t) return [];
    const firstWord = t.description.trim().split(/\s+/)[0]?.toLowerCase();
    if (!firstWord) return [];
    return this.allTransactions()
      .filter((x) => x.id !== t.id && x.description.toLowerCase().includes(firstWord))
      .slice(0, 5)
      .map((x) => ({
        id: x.id,
        description: x.description,
        date: x.transactionDate,
        amount: x.amount,
        isCredit: x.type === 'CREDIT',
      }));
  });

  protected readonly sourceText = computed(() => {
    const t = this.transaction();
    return t ? sourceLabel(t.sourceType) : '';
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) this.load(id);
    });
  }

  private load(id: string): void {
    this.loading.set(true);
    forkJoin({
      transaction: this.transactionApi.getTransaction(id),
      categories: this.categoryApi.getCategories().pipe(catchError(() => of([] as CategoryResponse[]))),
      accounts: this.accountApi.getAccounts().pipe(catchError(() => of([] as AccountResponse[]))),
      page: this.transactionApi.getTransactions(0, 50).pipe(catchError(() => of({ content: [] as TransactionResponse[] }))),
    }).subscribe({
      next: ({ transaction, categories, accounts, page }) => {
        this.transaction.set(transaction);
        this.categories.set(categories);
        this.accounts.set(accounts);
        this.allTransactions.set(page.content);
        this.selectedCategoryIds =
          (transaction.categoryIds ?? []).length > 0
            ? transaction.categoryIds!
            : transaction.categoryId
              ? [transaction.categoryId]
              : [];
        this.notesDraft = transaction.notes ?? '';
        this.receiptUrlDraft = transaction.receiptUrl ?? '';
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Could not load this transaction.');
      },
    });
  }

  protected categoryName(id: string | null): string {
    return id ? (this.categoryMap().get(id)?.name ?? 'Uncategorized') : 'Uncategorized';
  }

  protected goTo(id: string | null): void {
    if (id) this.router.navigate(['/finance/transactions', id]);
  }

  protected saveChanges(): void {
    const t = this.transaction();
    if (!t || this.selectedCategoryIds.length === 0) return;

    this.saving.set(true);
    this.errorMessage.set(null);

    forkJoin({
      update: this.transactionApi.updateTransaction(t.id, {
        notes: this.notesDraft || undefined,
        receiptUrl: this.receiptUrlDraft || undefined,
      }),
      categorized: this.transactionApi.updateCategories(t.id, { categoryIds: this.selectedCategoryIds }),
    }).subscribe({
      next: ({ categorized }) => {
        this.transaction.set(categorized);
        this.saving.set(false);
      },
      error: (err) => {
        this.saving.set(false);
        const httpError = err as { error?: { message?: string } };
        this.errorMessage.set(httpError?.error?.message ?? 'Could not save changes.');
      },
    });
  }

  protected markAsDuplicateOf(canonicalId: string): void {
    const t = this.transaction();
    if (!t) return;
    this.transactionApi.merge(canonicalId, { duplicateTransactionIds: [t.id] }).subscribe({
      next: () => this.load(t.id),
      error: () => this.errorMessage.set('Could not mark as duplicate.'),
    });
  }

  protected startRename(): void {
    const t = this.transaction();
    if (!t) return;
    this.nameDraft = t.description;
    this.editingName.set(true);
  }

  protected cancelRename(): void {
    this.editingName.set(false);
  }

  // Renaming teaches the backend a merchant-name correction (see
  // MerchantService.rename) so the same raw bank narration resolves to this
  // corrected name on every future import, and retroactively renames every
  // other past transaction that shares the same raw description.
  protected saveRename(): void {
    const t = this.transaction();
    const corrected = this.nameDraft.trim();
    if (!t || !corrected || corrected === t.description) {
      this.editingName.set(false);
      return;
    }

    this.renamingSaving.set(true);
    this.transactionApi.rename(t.id, corrected).subscribe({
      next: (updated) => {
        this.transaction.set(updated);
        this.renamingSaving.set(false);
        this.editingName.set(false);
      },
      error: (err) => {
        this.renamingSaving.set(false);
        const httpError = err as { error?: { message?: string } };
        this.errorMessage.set(httpError?.error?.message ?? 'Could not rename this transaction.');
      },
    });
  }

  protected createRuleFromThis(): void {
    const t = this.transaction();
    if (!t) return;
    this.router.navigate(['/finance/rules'], { queryParams: { matchValue: t.description } });
  }
}
