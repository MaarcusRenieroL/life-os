import { Component, inject, model, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { PasswordModule } from 'primeng/password';

import { concatMap, from, toArray } from 'rxjs';

import { PasswordStrengthMeter } from '../../../shared/password-strength-meter/password-strength-meter';
import { AuthApiService } from '../../../core/services/auth-api.service';
import { TokenService } from '../../../core/services/token.service';
import { VaultApiService } from '../../../core/services/vault-api.service';

@Component({
  selector: 'app-change-master-password-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    PasswordModule,
    CheckboxModule,
    PasswordStrengthMeter,
  ],
  templateUrl: './change-master-password-dialog.html',
  styleUrl: './change-master-password-dialog.scss',
})
export class ChangeMasterPasswordDialog {
  visible = model<boolean>(false);

  private readonly fb = inject(FormBuilder);
  private readonly vaultApi = inject(VaultApiService);
  private readonly authApi = inject(AuthApiService);
  private readonly tokenService = inject(TokenService);

  protected readonly errorMessage = signal<string | null>(null);
  protected readonly submitting = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
    recoveryKitSaved: [false, [Validators.requiredTrue]],
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
    if (!this.canSubmit || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.vaultApi
      .changeMasterPassword(
        this.form.controls.currentPassword.value,
        this.form.controls.newPassword.value,
      )
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.visible.set(false);
          this.form.reset({
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
            recoveryKitSaved: false,
          });
          // Dialog's own copy promises this ("All other sessions will be
          // signed out.") - the backend only re-encrypts/rotates the vault
          // key, it has no way to reach into auth-service's sessions table.
          // Best-effort: if this fails, the password change itself already
          // succeeded, so don't surface an error for it.
          this.signOutOtherSessions();
        },
        error: (error) => {
          this.submitting.set(false);
          this.errorMessage.set(error?.error?.message ?? 'Unable to update master password.');
        },
      });
  }

  private signOutOtherSessions(): void {
    const currentSessionId = this.tokenService.getDeviceSessionId();

    this.authApi.listSessions().subscribe((sessions) => {
      const otherIds = sessions.map((s) => s.id).filter((id) => id !== currentSessionId);

      from(otherIds)
        .pipe(
          concatMap((id) => this.authApi.revokeSession(id)),
          toArray(),
        )
        .subscribe();
    });
  }
}
