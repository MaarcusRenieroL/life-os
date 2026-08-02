import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import {
  CategorizationRuleResponse,
  CategoryResponse,
  CreateCategorizationRuleRequest,
  MatchField,
  MatchType,
  UpdateCategorizationRuleRequest,
} from '../../../core/models/finance.model';
import { FinanceCategoryApiService } from '../../../core/services/finance-category-api.service';
import { FinanceRuleApiService } from '../../../core/services/finance-rule-api.service';
import { FinanceTransactionApiService } from '../../../core/services/finance-transaction-api.service';
import { RuleDialog } from './rule-dialog/rule-dialog';

type TypeFilter = 'all' | MatchType;

const MATCH_TYPE_LABELS: Record<MatchType, string> = { EXACT: 'Exact', CONTAINS: 'Contains', REGEX: 'Regex' };
const MATCH_FIELD_LABELS: Record<MatchField, string> = {
  MERCHANT_NAME: 'merchant',
  DESCRIPTION: 'description',
};

@Component({
  selector: 'app-finance-rules',
  standalone: true,
  imports: [DecimalPipe, RuleDialog],
  templateUrl: './rules.html',
  styleUrl: './rules.scss',
})
export class FinanceRules implements OnInit {
  private readonly ruleApi = inject(FinanceRuleApiService);
  private readonly categoryApi = inject(FinanceCategoryApiService);
  private readonly transactionApi = inject(FinanceTransactionApiService);
  private readonly route = inject(ActivatedRoute);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly rules = signal<CategorizationRuleResponse[]>([]);
  protected readonly categories = signal<CategoryResponse[]>([]);
  protected readonly totalTransactions = signal(0);

  protected readonly query = signal('');
  protected readonly typeFilter = signal<TypeFilter>('all');
  protected readonly typeChips: { id: TypeFilter; label: string }[] = [
    { id: 'all', label: 'All types' },
    { id: 'EXACT', label: 'Exact' },
    { id: 'CONTAINS', label: 'Contains' },
    { id: 'REGEX', label: 'Regex' },
  ];

  protected readonly dialogVisible = signal(false);
  protected readonly editingRule = signal<CategorizationRuleResponse | null>(null);
  protected readonly prefillMatchValue = signal<string | null>(null);

  protected readonly testInput = signal('');
  protected readonly testResult = signal<{ rule: CategorizationRuleResponse; categoryName: string } | null | undefined>(
    undefined,
  );

  protected readonly categoryMap = computed(() => new Map(this.categories().map((c) => [c.id, c])));

  // Backend matches rules in priority DESCENDING order (highest number wins first) -
  // see CategorizationService#categorize - so mirror that here rather than ascending.
  protected readonly sortedRules = computed(() =>
    [...this.rules()].sort((a, b) => b.priority - a.priority),
  );

  protected readonly filteredRules = computed(() => {
    const q = this.query().toLowerCase();
    const type = this.typeFilter();
    return this.sortedRules().filter((r) => {
      if (type !== 'all' && r.matchType !== type) return false;
      if (q && !r.matchValue.toLowerCase().includes(q)) return false;
      return true;
    });
  });

  protected readonly myRules = computed(() => this.filteredRules().filter((r) => !r.autoLearned));
  protected readonly autoLearnedRules = computed(() => this.filteredRules().filter((r) => r.autoLearned));

  protected readonly activeCount = computed(() => this.rules().filter((r) => r.isActive).length);
  protected readonly totalHits = computed(() => this.rules().reduce((sum, r) => sum + r.hitCount, 0));
  protected readonly hitRate = computed(() => {
    const total = this.totalTransactions();
    return total > 0 ? (this.totalHits() / total) * 100 : 0;
  });

  ngOnInit(): void {
    forkJoin({
      rules: this.ruleApi.getRules().pipe(catchError(() => of([] as CategorizationRuleResponse[]))),
      categories: this.categoryApi.getCategories().pipe(catchError(() => of([] as CategoryResponse[]))),
      transactionPage: this.transactionApi.getTransactions(0, 1).pipe(catchError(() => of({ totalElements: 0 }))),
    }).subscribe(({ rules, categories, transactionPage }) => {
      this.rules.set(rules);
      this.categories.set(categories);
      this.totalTransactions.set(transactionPage.totalElements);
      this.loading.set(false);
    });

    const matchValue = this.route.snapshot.queryParamMap.get('matchValue');
    if (matchValue) {
      this.prefillMatchValue.set(matchValue);
      this.dialogVisible.set(true);
    }
  }

  protected matchTypeLabel(type: MatchType): string {
    return MATCH_TYPE_LABELS[type];
  }

  protected matchFieldLabel(field: MatchField): string {
    return MATCH_FIELD_LABELS[field];
  }

  protected categoryName(id: string): string {
    return this.categoryMap().get(id)?.name ?? 'Uncategorized';
  }

  protected selectType(id: TypeFilter): void {
    this.typeFilter.set(id);
  }

  protected setQuery(value: string): void {
    this.query.set(value);
  }

  protected openCreate(): void {
    this.editingRule.set(null);
    this.prefillMatchValue.set(null);
    this.dialogVisible.set(true);
  }

  protected openEdit(rule: CategorizationRuleResponse): void {
    this.editingRule.set(rule);
    this.dialogVisible.set(true);
  }

  protected createRule(request: CreateCategorizationRuleRequest): void {
    this.errorMessage.set(null);
    this.ruleApi.createRule(request).subscribe({
      next: (rule) => this.rules.update((rows) => [...rows, rule]),
      error: (err) => this.errorMessage.set(this.extractError(err, 'Could not create this rule.')),
    });
  }

  protected updateRule(event: { id: string; request: UpdateCategorizationRuleRequest }): void {
    this.errorMessage.set(null);
    this.ruleApi.updateRule(event.id, event.request).subscribe({
      next: (updated) => this.rules.update((rows) => rows.map((r) => (r.id === updated.id ? updated : r))),
      error: (err) => this.errorMessage.set(this.extractError(err, 'Could not update this rule.')),
    });
  }

  protected toggleEnabled(rule: CategorizationRuleResponse): void {
    this.errorMessage.set(null);
    this.ruleApi.updateRule(rule.id, { isActive: !rule.isActive }).subscribe({
      next: (updated) => this.rules.update((rows) => rows.map((r) => (r.id === updated.id ? updated : r))),
      error: (err) => this.errorMessage.set(this.extractError(err, 'Could not update this rule.')),
    });
  }

  protected deleteRule(rule: CategorizationRuleResponse): void {
    this.errorMessage.set(null);
    this.ruleApi.deleteRule(rule.id).subscribe({
      next: () => this.rules.update((rows) => rows.filter((r) => r.id !== rule.id)),
      error: (err) => this.errorMessage.set(this.extractError(err, 'Could not delete this rule.')),
    });
  }

  protected setTestInput(value: string): void {
    this.testInput.set(value);
    this.testResult.set(undefined);
  }

  protected runTest(): void {
    const text = this.testInput().trim();
    if (!text) return;

    const match = this.sortedRules()
      .filter((r) => r.isActive)
      .find((r) => this.matches(r, text));

    this.testResult.set(match ? { rule: match, categoryName: this.categoryName(match.categoryId) } : null);
  }

  private matches(rule: CategorizationRuleResponse, text: string): boolean {
    const value = rule.matchValue;
    switch (rule.matchType) {
      case 'EXACT':
        return text.toLowerCase() === value.toLowerCase();
      case 'CONTAINS':
        return text.toLowerCase().includes(value.toLowerCase());
      case 'REGEX':
        try {
          return new RegExp(value, 'i').test(text);
        } catch {
          return false;
        }
    }
  }

  private extractError(err: unknown, fallback: string): string {
    const httpError = err as { error?: { message?: string } };
    return httpError?.error?.message ?? fallback;
  }
}
