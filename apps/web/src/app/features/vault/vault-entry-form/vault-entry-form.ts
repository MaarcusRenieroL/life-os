import { Component, computed, effect, inject, input, model, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';

import { VaultApiService } from '../../../core/services/vault-api.service';
import { VaultCategoryApiService } from '../../../core/services/vault-category-api.service';
import { VaultCategory, VaultEntryType } from '../../../core/models/vault.model';
import { PasswordStrengthMeter } from '../../../shared/password-strength-meter/password-strength-meter';
import { PasswordGeneratorDialog } from '../password-generator-dialog/password-generator-dialog';
import { ClipboardService } from '../../../core/services/clipboard.service';

@Component({
  selector: 'app-vault-entry-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    SelectModule,
    TextareaModule,
    CheckboxModule,
    TooltipModule,
    PasswordStrengthMeter,
    PasswordGeneratorDialog,
  ],
  templateUrl: './vault-entry-form.html',
  styleUrl: './vault-entry-form.scss',
})
export class VaultEntryForm {
  private readonly fb = inject(FormBuilder);
  private readonly vaultApi = inject(VaultApiService);
  private readonly vaultCategoryApi = inject(VaultCategoryApiService);
  protected readonly clipboardService = inject(ClipboardService);
  protected readonly generatorDialogvisible = signal(false);

  visible = model<boolean>(false);
  entryId = input<string | null>(null);
  saved = output<void>();

  protected readonly typeOptions: { label: string; value: VaultEntryType }[] = [
    { label: 'Login', value: 'LOGIN' },
    { label: 'Card', value: 'CARD' },
    { label: 'Note', value: 'NOTE' },
  ];

  protected readonly categoryOptions = signal<{ label: string; value: string | null }[]>([
    { label: 'No category', value: null },
  ]);

  protected readonly isEdit = signal(false);
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
    categoryId: [null as string | null],
    favorite: [false],
  });

  // FormControl values aren't signals on their own — this bridges
  // `password.valueChanges` into a signal so the strength meter can react to it.
  protected readonly passwordValue = toSignal(this.form.controls.password.valueChanges, {
    initialValue: this.form.controls.password.value,
  });

  // Same bridge for `type`, so the template can show different fields per entry type
  // (this flat entity has no dedicated card-number/expiry columns, so CARD/NOTE reuse
  // the same username/password/notes fields with different labels and visibility).
  protected readonly typeValue = toSignal(this.form.controls.type.valueChanges, {
    initialValue: this.form.controls.type.value,
  });

  protected readonly isLogin = computed(() => this.typeValue() === 'LOGIN');
  protected readonly isCard = computed(() => this.typeValue() === 'CARD');
  protected readonly isNote = computed(() => this.typeValue() === 'NOTE');

  // Bridges `url.valueChanges` so the template can show a live favicon preview
  // next to the URL field as the user types.
  protected readonly urlValue = toSignal(this.form.controls.url.valueChanges, {
    initialValue: this.form.controls.url.value,
  });

  protected readonly faviconUrl = computed(() => faviconUrlFor(this.urlValue()));

  constructor() {
    // Re-init the form each time the dialog opens, for whichever entry (or none) it opened with.
    effect(() => {
      if (!this.visible()) {
        return;
      }

      this.errorMessage.set(null);
      this.loadCategories();

      const id = this.entryId();

      if (id) {
        this.isEdit.set(true);
        this.loading.set(true);

        this.vaultApi.getEntry(id).subscribe({
          next: (entry) => {
            this.form.reset({
              type: entry.type,
              title: entry.title,
              email: entry.email ?? '',
              username: entry.username ?? '',
              url: entry.url ?? '',
              icon: entry.icon ?? '',
              password: entry.password ?? '',
              notes: entry.notes ?? '',
              categoryId: entry.categoryId,
              favorite: entry.favorite,
            });
            this.loading.set(false);
          },
          error: (err) => {
            this.loading.set(false);
            this.errorMessage.set(err?.error?.message ?? 'Unable to load this entry.');
          },
        });
      } else {
        this.isEdit.set(false);
        this.form.reset({
          type: 'LOGIN',
          title: '',
          email: '',
          username: '',
          url: '',
          icon: '',
          password: '',
          notes: '',
          categoryId: null,
          favorite: false,
        });
      }
    });
  }

  private loadCategories(): void {
    this.vaultCategoryApi.getCategories().subscribe({
      next: (categories: VaultCategory[]) => {
        this.categoryOptions.set([
          { label: 'No category', value: null },
          ...categories.map((category) => ({ label: category.name, value: category.id })),
        ]);
      },
      error: () => undefined,
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    // Derive the icon from the URL at submit time rather than wiring it as a
    // form control side-effect - keeps the favicon always in sync with whatever
    // URL was actually saved, without a separate effect to manage.
    const favicon = this.faviconUrl();
    if (favicon) {
      this.form.controls.icon.setValue(favicon);
    }

    const request = this.form.getRawValue();
    const id = this.entryId();

    const request$ =
      this.isEdit() && id
        ? this.vaultApi.updateEntry(id, request)
        : this.vaultApi.createEntry(request);

    request$.subscribe({
      next: () => {
        this.submitting.set(false);
        this.visible.set(false);
        this.saved.emit();
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
        this.visible.set(false);
        this.saved.emit();
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(err?.error?.message ?? 'Unable to delete this entry.');
      },
    });
  }

  cancel(): void {
    this.visible.set(false);
  }

  openGenerator(): void {
    this.generatorDialogvisible.set(true);
  }

  onPasswordGenerated(password: string): void {
    this.form.controls.password.setValue(password);
  }

  copyField(value: string, key: string) {
    if (!value) {
      return;
    }

    this.clipboardService.copyWithAutoClear(value, key);
  }
}

// Google's public favicon endpoint - just an image URL, no fetch()/CORS involved,
// so a bad or incomplete URL just renders a blank/broken image rather than an error.
function faviconUrlFor(rawUrl: string): string | null {
  if (!rawUrl.trim()) return null;

  try {
    const withProtocol = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    const hostname = new URL(withProtocol).hostname;

    if (!hostname.includes('.')) return null;

    return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(hostname)}`;
  } catch {
    return null;
  }
}
