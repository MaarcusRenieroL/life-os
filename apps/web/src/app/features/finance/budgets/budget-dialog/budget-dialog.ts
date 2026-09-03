import { Component, inject, input, model, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { SliderModule } from 'primeng/slider';

import { BudgetPeriod, BudgetResponse, CategoryResponse, CreateBudgetRequest, UpdateBudgetRequest } from '../../../../core/models/finance.model';

const PERIOD_OPTIONS: { label: string; value: BudgetPeriod }[] = [
  { label: 'Monthly', value: 'MONTHLY' },
  { label: 'Yearly', value: 'YEARLY' },
  { label: 'Custom', value: 'CUSTOM' },
];

@Component({
  selector: 'app-budget-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, ButtonModule, InputNumberModule, SelectModule, SliderModule],
  templateUrl: './budget-dialog.html',
  styleUrl: './budget-dialog.scss',
})
export class BudgetDialog {
  visible = model<boolean>(false);
  categories = input.required<CategoryResponse[]>();
  editing = input<BudgetResponse | null>(null);

  created = output<CreateBudgetRequest>();
  updated = output<{ id: string; request: UpdateBudgetRequest }>();

  protected readonly periodOptions = PERIOD_OPTIONS;

  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    categoryId: ['', [Validators.required]],
    budgetAmount: [0, [Validators.required, Validators.min(1)]],
    period: ['MONTHLY' as BudgetPeriod, [Validators.required]],
    alertThreshold: [80],
    alertEnabled: [true],
  });

  protected onShow(): void {
    const editing = this.editing();
    if (editing) {
      this.form.reset({
        categoryId: editing.categoryId,
        budgetAmount: editing.budgetAmount,
        period: editing.period,
        alertThreshold: editing.alertThreshold,
        alertEnabled: editing.alertEnabled,
      });
    } else {
      this.form.reset({
        categoryId: this.categories().find((c) => c.type === 'EXPENSE')?.id ?? '',
        budgetAmount: 0,
        period: 'MONTHLY',
        alertThreshold: 80,
        alertEnabled: true,
      });
    }
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

    if (editing) {
      this.updated.emit({
        id: editing.id,
        request: {
          categoryId: value.categoryId,
          budgetAmount: value.budgetAmount,
          period: value.period,
          alertThreshold: value.alertThreshold,
          alertEnabled: value.alertEnabled,
        },
      });
    } else {
      this.created.emit({
        categoryId: value.categoryId,
        budgetAmount: value.budgetAmount,
        period: value.period,
        startDate: new Date().toISOString(),
        alertThreshold: value.alertThreshold,
        alertEnabled: value.alertEnabled,
      });
    }

    this.visible.set(false);
  }
}
