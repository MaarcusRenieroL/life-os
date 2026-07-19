import { Component, OnInit, inject, input, model, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import { VaultApiService } from '../../../core/services/vault-api.service';
import { VaultEntrySummary } from '../../../core/models/vault.model';
import { AddSubscriptionFormValue, BillingCycle, CardSummary, cardShortLabel } from '../card.model';

interface SelectOption<T> {
  label: string;
  value: T;
}

const BILLING_CYCLE_OPTIONS: SelectOption<BillingCycle>[] = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
  { label: 'Weekly', value: 'weekly' },
];

@Component({
  selector: 'app-add-subscription-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, ButtonModule, InputTextModule, SelectModule, CheckboxModule],
  templateUrl: './add-subscription-dialog.html',
  styleUrl: './add-subscription-dialog.scss',
})
export class AddSubscriptionDialog implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly vaultApi = inject(VaultApiService);

  visible = model<boolean>(false);
  cards = input<CardSummary[]>([]);
  saved = output<AddSubscriptionFormValue>();

  protected readonly billingCycleOptions = BILLING_CYCLE_OPTIONS;

  protected cardOptions: SelectOption<string | null>[] = [];
  protected vaultOptions: SelectOption<string | null>[] = [{ label: 'None', value: null }];

  protected readonly form = this.fb.nonNullable.group({
    serviceName: ['', [Validators.required, Validators.maxLength(100)]],
    cardId: [null as string | null],
    billingCycle: ['monthly' as BillingCycle, [Validators.required]],
    amount: [0, [Validators.required, Validators.min(0)]],
    nextRenewalDate: ['', [Validators.required]],
    linkedVaultEntryId: [null as string | null],
    remindBeforeRenewal: [false],
  });

  ngOnInit(): void {
    this.vaultApi.getEntries().subscribe({
      next: (entries: VaultEntrySummary[]) => {
        this.vaultOptions = [
          { label: 'None', value: null },
          ...entries.map((entry) => ({ label: entry.title, value: entry.id })),
        ];
      },
    });
  }

  protected onShow(): void {
    this.cardOptions = this.cards().map((card) => ({ label: cardShortLabel(card), value: card.id }));

    this.form.reset({
      serviceName: '',
      cardId: this.cardOptions[0]?.value ?? null,
      billingCycle: 'monthly',
      amount: 0,
      nextRenewalDate: '',
      linkedVaultEntryId: null,
      remindBeforeRenewal: false,
    });
  }

  protected cancel(): void {
    this.visible.set(false);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saved.emit(this.form.getRawValue());
    this.visible.set(false);
  }
}
