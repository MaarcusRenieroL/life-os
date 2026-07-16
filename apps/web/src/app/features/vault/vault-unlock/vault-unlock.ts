import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';

import { VaultApiService } from '../../../core/services/vault-api.service';
import { VaultStateService } from '../../../core/services/vault-state.service';

@Component({
  selector: 'app-vault-unlock',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, PasswordModule],
  templateUrl: './vault-unlock.html',
  styleUrl: './vault-unlock.scss',
})
export class VaultUnlock implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly vaultApi = inject(VaultApiService);
  private readonly vaultState = inject(VaultStateService);
  private readonly router = inject(Router);

  protected readonly checkingStatus = signal(true);
  protected readonly hasMasterPassword = signal(false);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    masterPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  ngOnInit(): void {
    this.vaultApi.getStatus().subscribe({
      next: (status) => {
        if (status.unlocked) {
          this.vaultState.setUnlocked(true);
          this.router.navigateByUrl('/vault/entries');
          return;
        }

        this.hasMasterPassword.set(status.hasMasterPassword);
        this.checkingStatus.set(false);
      },
      error: () => this.checkingStatus.set(false),
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const { masterPassword } = this.form.getRawValue();
    const request = { masterPassword };

    const unlock = () =>
      this.vaultApi.verify(request).subscribe({
        next: () => {
          this.loading.set(false);
          this.vaultState.setUnlocked(true);
          this.router.navigateByUrl('/vault/entries');
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(err?.error?.message ?? 'Unable to unlock the vault.');
        },
      });

    if (this.hasMasterPassword()) {
      unlock();
      return;
    }

    this.vaultApi.setup(request).subscribe({
      next: unlock,
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.message ?? 'Unable to set up the vault.');
      },
    });
  }
}
