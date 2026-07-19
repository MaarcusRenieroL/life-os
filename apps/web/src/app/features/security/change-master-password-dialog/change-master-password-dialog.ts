import { Component, inject, model } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { PasswordModule } from 'primeng/password';

import { PasswordStrengthMeter } from '../../../shared/password-strength-meter/password-strength-meter';

// TODO(backend): no change-master-password API yet while a master password is already set.
@Component({
  selector: 'app-change-master-password-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, ButtonModule, PasswordModule, CheckboxModule, PasswordStrengthMeter],
  templateUrl: './change-master-password-dialog.html',
  styleUrl: './change-master-password-dialog.scss',
})
export class ChangeMasterPasswordDialog {
  visible = model<boolean>(false);

  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
    recoveryKitSaved: [false, [Validators.requiredTrue]],
  });

  // FormControl values aren't signals on their own — bridge into a signal
  // so the strength meter can react to the new-password field live.
  protected readonly newPasswordValue = toSignal(this.form.controls.newPassword.valueChanges, {
    initialValue: this.form.controls.newPassword.value,
  });

  protected get passwordsMismatch(): boolean {
    const { newPassword, confirmPassword } = this.form.getRawValue();
    return confirmPassword.length > 0 && newPassword !== confirmPassword;
  }

  protected get canSubmit(): boolean {
    return this.form.valid && !this.passwordsMismatch;
  }

  protected onShow(): void {
    this.form.reset({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      recoveryKitSaved: false,
    });
  }

  protected cancel(): void {
    this.visible.set(false);
  }

  protected submit(): void {
    if (!this.canSubmit) {
      this.form.markAllAsTouched();
      return;
    }

    // No real backend endpoint to persist this yet — just close and reset.
    this.visible.set(false);
    this.form.reset({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      recoveryKitSaved: false,
    });
  }
}
