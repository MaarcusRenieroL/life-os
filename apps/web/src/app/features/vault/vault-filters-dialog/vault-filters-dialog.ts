import { Component, input, model, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';

import { VaultCategory } from '../../../core/models/vault.model';
import { EntryStrengthLabel } from '../../../core/utils/vault-entry-security.util';
import { emptyVaultFilters, LastUpdatedFilter, VaultFilters } from './vault-filters-dialog.model';

const STRENGTH_OPTIONS: EntryStrengthLabel[] = ['Strong', 'Weak', 'Reused'];
const LAST_UPDATED_OPTIONS: { value: LastUpdatedFilter; label: string }[] = [
  { value: 'any', label: 'Any time' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '1y+', label: 'Over 1 year ago' },
];

@Component({
  selector: 'app-vault-filters-dialog',
  standalone: true,
  imports: [DialogModule, ButtonModule, SelectModule, FormsModule],
  templateUrl: './vault-filters-dialog.html',
  styleUrl: './vault-filters-dialog.scss',
})
export class VaultFiltersDialog {
  visible = model<boolean>(false);
  categories = input<VaultCategory[]>([]);
  filters = input<VaultFilters>(emptyVaultFilters());
  applied = output<VaultFilters>();

  protected readonly strengthOptions = STRENGTH_OPTIONS;
  protected readonly lastUpdatedOptions = LAST_UPDATED_OPTIONS;

  protected draft: VaultFilters = emptyVaultFilters();

  protected onShow(): void {
    this.draft = structuredClone(this.filters());
  }

  protected toggle<T>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  }

  protected toggleStrength(value: EntryStrengthLabel): void {
    this.draft = { ...this.draft, strengths: this.toggle(this.draft.strengths, value) };
  }

  protected toggleCategory(id: string): void {
    this.draft = { ...this.draft, categoryIds: this.toggle(this.draft.categoryIds, id) };
  }

  protected clearAll(): void {
    this.draft = emptyVaultFilters();
  }

  protected cancel(): void {
    this.visible.set(false);
  }

  protected apply(): void {
    this.applied.emit(this.draft);
    this.visible.set(false);
  }
}
