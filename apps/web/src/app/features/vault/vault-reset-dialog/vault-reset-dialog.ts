import { Component, inject, model, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';

import { PasswordStrengthMeter } from '../../../shared/password-strength-meter/password-strength-meter';
import { VaultApiService } from '../../../core/services/vault-api.service';
import { VaultStateService } from '../../../core/services/vault-state.service';

@Component({
  selector: 'app-vault-reset-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    PasswordModule,
    InputTextModule,
    PasswordStrengthMeter,
  ],
  templateUrl: './vault-reset-dialog.html',
  styleUrl: './vault-reset-dialog.scss',
})
export class VaultResetDialog {
  visible = model<boolean>(false);

  private readonly fb = inject(FormBuilder);
  private readonly vaultApi = inject(VaultApiService);
  private readonly vaultState = inject(VaultStateService);
  private readonly router = inject(Router);

  protected readonly errorMessage = signal<string | null>(null);
  protected readonly submitting = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

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
    this.form.reset({ code: '', newPassword: '', confirmPassword: '' });
    this.errorMessage.set(null);
  }

  protected cancel(): void {
    this.visible.set(false);
  }

  protected submit(): void {
    if (!this.canSubmit || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    const { code, newPassword } = this.form.getRawValue();

    this.vaultApi.resetWithRecoveryCode(code, newPassword).subscribe({
      next: () => this.unlockWithNewPassword(newPassword),
      error: (error) => {
        this.submitting.set(false);
        this.errorMessage.set(error?.error?.message ?? 'Unable to reset master password.');
      },
    });
  }

  private unlockWithNewPassword(newPassword: string): void {
    this.vaultApi.verify({ masterPassword: newPassword }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.visible.set(false);
        this.vaultState.setUnlocked(true);
        this.router.navigateByUrl('/vault/entries');
      },
      error: () => {
        // The reset itself already succeeded even if this follow-up unlock call
        // fails - close the dialog and let the normal unlock form take it from here
        // rather than leaving the user stuck.
        this.submitting.set(false);
        this.visible.set(false);
      },
    });
  }
}
