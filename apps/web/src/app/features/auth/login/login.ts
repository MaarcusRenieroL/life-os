import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';

import { AuthApiService } from '../../../core/services/auth-api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, PasswordModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.form.getRawValue();

    this.authApi
      .login({
        email,
        rawPassword: password,
        deviceName: navigator.platform || 'web',
        deviceType: 'web',
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigateByUrl('/');
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(err?.error?.message ?? 'Unable to sign in. Please try again.');
        },
      });
  }
}
