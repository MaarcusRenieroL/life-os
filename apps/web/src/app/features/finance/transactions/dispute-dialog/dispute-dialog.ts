import { Component, inject, model, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-dispute-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, ButtonModule, InputTextModule],
  templateUrl: './dispute-dialog.html',
  styleUrl: './dispute-dialog.scss',
})
export class DisputeDialog {
  visible = model<boolean>(false);
  count = model<number>(0);
  saved = output<string>();

  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    reason: ['', [Validators.required, Validators.maxLength(200)]],
  });

  protected onShow(): void {
    this.form.reset({ reason: '' });
  }

  protected cancel(): void {
    this.visible.set(false);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saved.emit(this.form.getRawValue().reason);
    this.visible.set(false);
  }
}
