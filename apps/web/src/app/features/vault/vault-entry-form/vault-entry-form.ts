import { Component, OnInit, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';

import { VaultApiService } from '../../../core/services/vault-api.service';
import { VaultEntryType } from '../../../core/models/vault.model';
import { PasswordStrengthMeter } from '../../../shared/password-strength-meter/password-strength-meter';

@Component({
  selector: 'app-vault-entry-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    SelectModule,
    TextareaModule,
    CheckboxModule,
    PasswordStrengthMeter,
  ],
  templateUrl: './vault-entry-form.html',
  styleUrl: './vault-entry-form.scss',
})
export class VaultEntryForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly vaultApi = inject(VaultApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly typeOptions: { label: string; value: VaultEntryType }[] = [
    { label: 'Login', value: 'LOGIN' },
    { label: 'Card', value: 'CARD' },
    { label: 'Note', value: 'NOTE' },
  ];

  protected readonly isEdit = signal(false);
  protected readonly entryId = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    type: ['LOGIN' as VaultEntryType, [Validators.required]],
    title: ['', [Validators.required, Validators.maxLength(255)]],
    email: ['', [Validators.email, Validators.maxLength(255)]],
    username: ['', [Validators.maxLength(255)]],
    url: ['', [Validators.maxLength(2048)]],
    icon: ['', [Validators.maxLength(2048)]],
    password: ['', [Validators.maxLength(1000)]],
    notes: ['', [Validators.maxLength(5000)]],
    favorite: [false],
  });

  // FormControl values aren't signals on their own — this bridges
  // `password.valueChanges` into a signal so the strength meter can react to it.
  protected readonly passwordValue = toSignal(this.form.controls.password.valueChanges, {
    initialValue: this.form.controls.password.value,
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (id && id !== 'new') {
      this.isEdit.set(true);
      this.entryId.set(id);
      this.loading.set(true);

      this.vaultApi.getEntry(id).subscribe({
        next: (entry) => {
          this.form.patchValue({
            type: entry.type,
            title: entry.title,
            email: entry.email ?? '',
            username: entry.username ?? '',
            url: entry.url ?? '',
            icon: entry.icon ?? '',
            password: entry.password ?? '',
            notes: entry.notes ?? '',
            favorite: entry.favorite,
          });
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(err?.error?.message ?? 'Unable to load this entry.');
        },
      });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    const request = this.form.getRawValue();
    const id = this.entryId();

    const request$ = this.isEdit() && id
      ? this.vaultApi.updateEntry(id, request)
      : this.vaultApi.createEntry(request);

    request$.subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigateByUrl('/vault/entries');
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(err?.error?.message ?? 'Unable to save this entry.');
      },
    });
  }

  deleteEntry(): void {
    const id = this.entryId();
    if (!id) {
      return;
    }

    this.submitting.set(true);

    this.vaultApi.deleteEntry(id).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigateByUrl('/vault/entries');
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(err?.error?.message ?? 'Unable to delete this entry.');
      },
    });
  }
}
