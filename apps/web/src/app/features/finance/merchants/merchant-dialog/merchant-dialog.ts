import { Component, inject, input, model, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import {
  CategoryResponse,
  CreateMerchantRequest,
  MerchantResponse,
  UpdateMerchantRequest,
} from '../../../../core/models/finance.model';

@Component({
  selector: 'app-merchant-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, ButtonModule, InputTextModule, SelectModule],
  templateUrl: './merchant-dialog.html',
  styleUrl: './merchant-dialog.scss',
})
export class MerchantDialog {
  visible = model<boolean>(false);
  categories = input.required<CategoryResponse[]>();
  editing = input<MerchantResponse | null>(null);

  created = output<CreateMerchantRequest>();
  updated = output<{ id: string; request: UpdateMerchantRequest }>();

  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    categoryId: [''],
    website: [''],
  });

  protected onShow(): void {
    const editing = this.editing();
    this.form.reset(
      editing
        ? { name: editing.name, categoryId: editing.categoryId ?? '', website: editing.website ?? '' }
        : { name: '', categoryId: '', website: '' },
    );
  }

  protected cancel(): void {
    this.visible.set(false);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const editing = this.editing();
    const payload = {
      name: value.name,
      categoryId: value.categoryId || undefined,
      website: value.website || undefined,
    };

    if (editing) {
      this.updated.emit({ id: editing.id, request: payload });
    } else {
      this.created.emit(payload);
    }

    this.visible.set(false);
  }
}
