import { Component, input, model, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MultiSelectModule } from 'primeng/multiselect';
import { FormsModule } from '@angular/forms';

import { CategoryResponse } from '../../../../core/models/finance.model';

@Component({
  selector: 'app-categorize-dialog',
  standalone: true,
  imports: [DialogModule, ButtonModule, MultiSelectModule, FormsModule],
  templateUrl: './categorize-dialog.html',
  styleUrl: './categorize-dialog.scss',
})
export class CategorizeDialog {
  visible = model<boolean>(false);
  categories = input.required<CategoryResponse[]>();
  currentCategoryIds = input<string[]>([]);
  transactionLabel = input<string>('');

  saved = output<string[]>();

  protected selectedCategoryIds: string[] = [];

  protected onShow(): void {
    this.selectedCategoryIds = [...this.currentCategoryIds()];
  }

  protected cancel(): void {
    this.visible.set(false);
  }

  protected submit(): void {
    if (this.selectedCategoryIds.length === 0) return;
    this.saved.emit(this.selectedCategoryIds);
    this.visible.set(false);
  }
}
