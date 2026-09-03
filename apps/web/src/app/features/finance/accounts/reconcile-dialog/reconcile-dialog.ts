import { DecimalPipe } from '@angular/common';
import { Component, inject, input, model, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';

import { AccountResponse, ReconcileAccountRequest } from '../../../../core/models/finance.model';
import { accountLabel, accountSubLabel } from '../../finance.util';

@Component({
  selector: 'app-reconcile-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, ButtonModule, InputNumberModule, DatePickerModule, DecimalPipe],
  templateUrl: './reconcile-dialog.html',
  styleUrl: './reconcile-dialog.scss',
})
export class ReconcileDialog {
  visible = model<boolean>(false);
  account = input<AccountResponse | null>(null);

  protected readonly accountLabel = accountLabel;
  protected readonly accountSubLabel = accountSubLabel;

  reconciled = output<ReconcileAccountRequest>();

  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    statementBalance: [0, [Validators.required]],
    statementDate: [new Date(), [Validators.required]],
  });

  protected onShow(): void {
    this.form.reset({ statementBalance: this.account()?.currentBalance ?? 0, statementDate: new Date() });
  }

  protected cancel(): void {
    this.visible.set(false);
  }

  protected submit(): void {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    this.reconciled.emit({
      statementBalance: value.statementBalance,
      statementDate: value.statementDate.toISOString(),
    });
    this.visible.set(false);
  }
}
