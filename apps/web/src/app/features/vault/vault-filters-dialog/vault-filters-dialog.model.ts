import { EntryStrengthLabel } from '../../../core/utils/vault-entry-security.util';

export type LastUpdatedFilter = 'any' | '7d' | '30d' | '1y+';

export interface VaultFilters {
  strengths: EntryStrengthLabel[];
  categoryIds: string[];
  lastUpdated: LastUpdatedFilter;
}

export function emptyVaultFilters(): VaultFilters {
  return { strengths: [], categoryIds: [], lastUpdated: 'any' };
}

export function isVaultFiltersEmpty(filters: VaultFilters): boolean {
  return (
    filters.strengths.length === 0 &&
    filters.categoryIds.length === 0 &&
    filters.lastUpdated === 'any'
  );
}
