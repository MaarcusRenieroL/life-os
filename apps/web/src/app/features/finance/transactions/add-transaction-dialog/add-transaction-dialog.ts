import { Component, inject, input, model, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import {
  AccountResponse,
  CreateTransactionRequest,
  TransactionResponse,
  TransactionType,
  UpdateTransactionRequest,
} from '../../../../core/models/finance.model';

const TYPE_OPTIONS: { label: string; value: TransactionType }[] = [
  { label: 'Debit (money out)', value: 'DEBIT' },
  { label: 'Credit (money in)', value: 'CREDIT' },
];

@Component({
  selector: 'app-add-transaction-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    DatePickerModule,
  ],
  templateUrl: './add-transaction-dialog.html',
  styleUrl: './add-transaction-dialog.scss',
})
export class AddTransactionDialog {
  visible = model<boolean>(false);
  accounts = input.required<AccountResponse[]>();
  editing = input<TransactionResponse | null>(null);

  created = output<CreateTransactionRequest>();
  updated = output<{ id: string; request: UpdateTransactionRequest }>();

  protected readonly typeOptions = TYPE_OPTIONS;

  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    accountId: ['', [Validators.required]],
    transactionDate: [new Date(), [Validators.required]],
    description: ['', [Validators.required, Validators.maxLength(200)]],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    type: ['DEBIT' as TransactionType, [Validators.required]],
    notes: [''],
  });

  protected onShow(): void {
    const editing = this.editing();
    if (editing) {
      this.form.reset({
        accountId: editing.accountId,
        transactionDate: new Date(editing.transactionDate),
        description: editing.description,
        amount: editing.amount,
        type: editing.type === 'TRANSFER' ? 'DEBIT' : editing.type,
        notes: editing.notes ?? '',
      });
      this.form.controls.accountId.disable();
      this.form.controls.transactionDate.disable();
    } else {
      this.form.reset({
        accountId: this.accounts()[0]?.id ?? '',
        transactionDate: new Date(),
        description: '',
        amount: 0,
        type: 'DEBIT',
        notes: '',
      });
      this.form.controls.accountId.enable();
      this.form.controls.transactionDate.enable();
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
          description: value.description,
          amount: value.amount,
          type: value.type,
          notes: value.notes || undefined,
        },
      });
    } else {
      this.created.emit({
        accountId: value.accountId,
        transactionDate: value.transactionDate.toISOString(),
        description: value.description,
        amount: value.amount,
        type: value.type,
        notes: value.notes || undefined,
      });
    }

    this.visible.set(false);
  }
}
