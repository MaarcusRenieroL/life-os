import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { CategoryResponse, CreateMerchantRequest, MerchantResponse, UpdateMerchantRequest } from '../../../core/models/finance.model';
import { FinanceCategoryApiService } from '../../../core/services/finance-category-api.service';
import { FinanceMerchantApiService } from '../../../core/services/finance-merchant-api.service';
import { MerchantDialog } from './merchant-dialog/merchant-dialog';

@Component({
  selector: 'app-finance-merchants',
  standalone: true,
  imports: [CurrencyPipe, MerchantDialog],
  templateUrl: './merchants.html',
  styleUrl: './merchants.scss',
})
export class FinanceMerchants implements OnInit {
  private readonly merchantApi = inject(FinanceMerchantApiService);
  private readonly categoryApi = inject(FinanceCategoryApiService);

  protected readonly loading = signal(true);
  protected readonly merchants = signal<MerchantResponse[]>([]);
  protected readonly categories = signal<CategoryResponse[]>([]);
  protected readonly query = signal('');

  protected readonly categoryMap = computed(() => new Map(this.categories().map((c) => [c.id, c])));

  protected readonly filteredMerchants = computed(() => {
    const q = this.query().toLowerCase();
    return this.merchants()
      .filter((m) => !q || m.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  protected readonly dialogVisible = signal(false);
  protected readonly editingMerchant = signal<MerchantResponse | null>(null);

  ngOnInit(): void {
    forkJoin({
      merchants: this.merchantApi.getMerchants().pipe(catchError(() => of([] as MerchantResponse[]))),
      categories: this.categoryApi.getCategories().pipe(catchError(() => of([] as CategoryResponse[]))),
    }).subscribe(({ merchants, categories }) => {
      this.merchants.set(merchants);
      this.categories.set(categories);
      this.loading.set(false);
    });
  }

  protected categoryName(id: string | null): string {
    return id ? (this.categoryMap().get(id)?.name ?? '—') : '—';
  }

  protected setQuery(value: string): void {
    this.query.set(value);
  }

  protected openCreate(): void {
    this.editingMerchant.set(null);
    this.dialogVisible.set(true);
  }

  protected openEdit(merchant: MerchantResponse): void {
    this.editingMerchant.set(merchant);
    this.dialogVisible.set(true);
  }

  protected createMerchant(request: CreateMerchantRequest): void {
    this.merchantApi.createMerchant(request).subscribe({
      next: (merchant) => this.merchants.update((rows) => [...rows, merchant]),
      error: () => undefined,
    });
  }

  protected updateMerchant(event: { id: string; request: UpdateMerchantRequest }): void {
    this.merchantApi.updateMerchant(event.id, event.request).subscribe({
      next: (updated) => this.merchants.update((rows) => rows.map((m) => (m.id === updated.id ? updated : m))),
      error: () => undefined,
    });
  }

  protected deleteMerchant(merchant: MerchantResponse): void {
    this.merchantApi.deleteMerchant(merchant.id).subscribe({
      next: () => this.merchants.update((rows) => rows.filter((m) => m.id !== merchant.id)),
      error: () => undefined,
    });
  }
}
