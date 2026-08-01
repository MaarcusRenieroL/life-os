import { Component, inject, input, model, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import {
  AccountResponse,
  AccountType,
  CreateAccountRequest,
  CurrencyCode,
  UpdateAccountRequest,
} from '../../../../core/models/finance.model';

const ACCOUNT_TYPE_OPTIONS: { label: string; value: AccountType }[] = [
  { label: 'Savings', value: 'SAVINGS' },
  { label: 'Checking', value: 'CHECKING' },
  { label: 'Credit card', value: 'CREDIT_CARD' },
  { label: 'Investment', value: 'INVESTMENT' },
  { label: 'Cash', value: 'CASH' },
];

const CURRENCY_OPTIONS: { label: string; value: CurrencyCode }[] = [
  { label: 'INR', value: 'INR' },
  { label: 'USD', value: 'USD' },
  { label: 'EUR', value: 'EUR' },
];

@Component({
  selector: 'app-account-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    CheckboxModule,
    DatePickerModule,
  ],
  templateUrl: './account-dialog.html',
  styleUrl: './account-dialog.scss',
})
export class AccountDialog {
  visible = model<boolean>(false);
  editing = input<AccountResponse | null>(null);

  created = output<CreateAccountRequest>();
  updated = output<{ id: string; request: UpdateAccountRequest }>();

  protected readonly accountTypeOptions = ACCOUNT_TYPE_OPTIONS;
  protected readonly currencyOptions = CURRENCY_OPTIONS;

  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    accountName: ['', [Validators.required, Validators.maxLength(100)]],
    accountType: ['SAVINGS' as AccountType, [Validators.required]],
    bankName: [''],
    accountNumber: ['', [Validators.maxLength(50)]],
    currencyCode: ['INR' as CurrencyCode, [Validators.required]],
    openedDate: [null as Date | null],
    currentBalance: [0],
    isActive: [true],
    isPrimary: [false],
    emailForAlerts: ['', [Validators.email, Validators.maxLength(255)]],
    notes: [''],
  });

  protected onShow(): void {
    const editing = this.editing();
    if (editing) {
      this.form.reset({
        accountName: editing.accountName,
        accountType: editing.accountType,
        bankName: editing.bankName ?? '',
        accountNumber: '',
        currencyCode: editing.currencyCode,
        openedDate: editing.openedDate ? new Date(editing.openedDate) : null,
        currentBalance: editing.currentBalance,
        isActive: editing.isActive,
        isPrimary: editing.isPrimary,
        emailForAlerts: editing.emailForAlerts ?? '',
        notes: editing.notes ?? '',
      });
      this.form.controls.accountNumber.clearValidators();
    } else {
      this.form.reset({
        accountName: '',
        accountType: 'SAVINGS',
        bankName: '',
        accountNumber: '',
        currencyCode: 'INR',
        openedDate: null,
        currentBalance: 0,
        isActive: true,
        isPrimary: false,
        emailForAlerts: '',
        notes: '',
      });
      this.form.controls.accountNumber.setValidators([Validators.required, Validators.maxLength(50)]);
    }
    this.form.controls.accountNumber.updateValueAndValidity();
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
      const request: UpdateAccountRequest = {
        accountName: value.accountName,
        accountType: value.accountType,
        bankName: value.bankName || undefined,
        currencyCode: value.currencyCode,
        openedDate: value.openedDate ? value.openedDate.toISOString() : undefined,
        currentBalance: value.currentBalance,
        isActive: value.isActive,
        isPrimary: value.isPrimary,
        emailForAlerts: value.emailForAlerts || undefined,
        notes: value.notes || undefined,
        ...(value.accountNumber ? { accountNumber: value.accountNumber } : {}),
      };
      this.updated.emit({ id: editing.id, request });
    } else {
      this.created.emit({
        accountName: value.accountName,
        accountType: value.accountType,
        bankName: value.bankName || undefined,
        accountNumber: value.accountNumber,
        currencyCode: value.currencyCode,
        openedDate: value.openedDate ? value.openedDate.toISOString() : undefined,
        currentBalance: value.currentBalance,
        isPrimary: value.isPrimary,
        emailForAlerts: value.emailForAlerts || undefined,
        notes: value.notes || undefined,
      });
    }

    this.visible.set(false);
  }
}
