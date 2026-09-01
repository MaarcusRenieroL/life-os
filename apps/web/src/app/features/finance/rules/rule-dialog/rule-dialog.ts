import { Component, inject, input, model, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import {
  CategorizationRuleResponse,
  CategoryResponse,
  CreateCategorizationRuleRequest,
  MatchField,
  MatchType,
  UpdateCategorizationRuleRequest,
} from '../../../../core/models/finance.model';

const MATCH_TYPE_OPTIONS: { label: string; value: MatchType }[] = [
  { label: 'Exact', value: 'EXACT' },
  { label: 'Contains', value: 'CONTAINS' },
  { label: 'Regex', value: 'REGEX' },
];

const MATCH_FIELD_OPTIONS: { label: string; value: MatchField }[] = [
  { label: 'Merchant name', value: 'MERCHANT_NAME' },
  { label: 'Description', value: 'DESCRIPTION' },
];

@Component({
  selector: 'app-rule-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, ButtonModule, InputTextModule, InputNumberModule, SelectModule],
  templateUrl: './rule-dialog.html',
  styleUrl: './rule-dialog.scss',
})
export class RuleDialog {
  visible = model<boolean>(false);
  categories = input.required<CategoryResponse[]>();
  editing = input<CategorizationRuleResponse | null>(null);
  prefillMatchValue = input<string | null>(null);

  created = output<CreateCategorizationRuleRequest>();
  updated = output<{ id: string; request: UpdateCategorizationRuleRequest }>();

  protected readonly matchTypeOptions = MATCH_TYPE_OPTIONS;
  protected readonly matchFieldOptions = MATCH_FIELD_OPTIONS;

  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    categoryId: ['', [Validators.required]],
    matchType: ['CONTAINS' as MatchType, [Validators.required]],
    matchField: ['MERCHANT_NAME' as MatchField, [Validators.required]],
    matchValue: ['', [Validators.required, Validators.maxLength(200)]],
    priority: [10, [Validators.required, Validators.min(1)]],
  });

  protected onShow(): void {
    const editing = this.editing();
    if (editing) {
      this.form.reset({
        categoryId: editing.categoryId,
        matchType: editing.matchType,
        matchField: editing.matchField,
        matchValue: editing.matchValue,
        priority: editing.priority,
      });
    } else {
      this.form.reset({
        categoryId: this.categories()[0]?.id ?? '',
        matchType: 'CONTAINS',
        matchField: 'MERCHANT_NAME',
        matchValue: this.prefillMatchValue() ?? '',
        priority: 10,
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
      this.updated.emit({ id: editing.id, request: value });
    } else {
      this.created.emit(value);
    }

    this.visible.set(false);
  }
}
