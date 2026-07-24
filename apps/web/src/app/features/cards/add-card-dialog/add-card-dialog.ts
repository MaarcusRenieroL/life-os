import { Component, inject, model, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import { AddCardFormValue, CardNetwork } from '../card.model';

const NETWORK_OPTIONS: CardNetwork[] = ['Visa', 'Mastercard', 'Amex', 'Discover'];

@Component({
  selector: 'app-add-card-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, ButtonModule, InputTextModule, SelectModule],
  templateUrl: './add-card-dialog.html',
  styleUrl: './add-card-dialog.scss',
})
export class AddCardDialog {
  visible = model<boolean>(false);
  saved = output<AddCardFormValue>();

  protected readonly networkOptions = NETWORK_OPTIONS;

  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    nickname: ['', [Validators.required, Validators.maxLength(100)]],
    cardNumber: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(19)]],
    expiry: ['', [Validators.required, Validators.pattern(/^\d{2}\/\d{2}$/)]],
    cvv: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(4)]],
    network: ['Visa' as CardNetwork, [Validators.required]],
    cardholderName: ['', [Validators.required, Validators.maxLength(100)]],
    billingZip: ['', [Validators.required, Validators.maxLength(12)]],
  });

  protected onShow(): void {
    this.form.reset({
      nickname: '',
      cardNumber: '',
      expiry: '',
      cvv: '',
      network: 'Visa',
      cardholderName: '',
      billingZip: '',
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
