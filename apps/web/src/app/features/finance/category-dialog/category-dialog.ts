import { Component, inject, input, model, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import { CategoryResponse, CategoryType } from '../../../core/models/finance.model';
import { FinanceCategoryApiService } from '../../../core/services/finance-category-api.service';

const TYPE_OPTIONS: { label: string; value: CategoryType }[] = [
  { label: 'Expense', value: 'EXPENSE' },
  { label: 'Income', value: 'INCOME' },
  { label: 'Transfer', value: 'TRANSFER' },
  { label: 'Investment', value: 'INVESTMENT' },
];

@Component({
  selector: 'app-category-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, ButtonModule, InputTextModule, SelectModule],
  templateUrl: './category-dialog.html',
  styleUrl: './category-dialog.scss',
})
export class CategoryDialog {
  visible = model<boolean>(false);
  editing = input<CategoryResponse | null>(null);
  created = output<CategoryResponse>();
  updated = output<CategoryResponse>();

  protected readonly typeOptions = TYPE_OPTIONS;
  protected readonly saving = signal(false);

  private readonly fb = inject(FormBuilder);
  private readonly categoryApi = inject(FinanceCategoryApiService);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    type: ['EXPENSE' as CategoryType, [Validators.required]],
    excludeFromAutoLearning: [false],
  });

  protected onShow(): void {
    const editing = this.editing();
    this.form.reset(
      editing
        ? { name: editing.name, type: editing.type, excludeFromAutoLearning: editing.excludeFromAutoLearning }
        : { name: '', type: 'EXPENSE', excludeFromAutoLearning: false },
    );
    this.saving.set(false);
  }

  protected cancel(): void {
    this.visible.set(false);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const editing = this.editing();
    this.saving.set(true);

    const request$ = editing
      ? this.categoryApi.updateCategory(editing.id, {
          name: value.name,
          type: value.type,
          excludeFromAutoLearning: value.excludeFromAutoLearning,
        })
      : this.categoryApi.createCategory({ name: value.name, type: value.type, displayOrder: 0 });

    request$.subscribe({
      next: (category) => {
        this.saving.set(false);
        if (editing) this.updated.emit(category);
        else this.created.emit(category);
        this.visible.set(false);
      },
      error: () => this.saving.set(false),
    });
  }
}
