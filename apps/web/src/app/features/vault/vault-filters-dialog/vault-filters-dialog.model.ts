import { MockStrengthLabel, MockTwoFactorStatus } from '../../../core/utils/vault-mock-security.util';

export type LastUpdatedFilter = 'any' | '7d' | '30d' | '1y+';

export interface VaultFilters {
  strengths: MockStrengthLabel[];
  twoFactor: MockTwoFactorStatus[];
  categoryIds: string[];
  lastUpdated: LastUpdatedFilter;
}

export function emptyVaultFilters(): VaultFilters {
  return { strengths: [], twoFactor: [], categoryIds: [], lastUpdated: 'any' };
}

export function isVaultFiltersEmpty(filters: VaultFilters): boolean {
  return (
    filters.strengths.length === 0 &&
    filters.twoFactor.length === 0 &&
    filters.categoryIds.length === 0 &&
    filters.lastUpdated === 'any'
  );
}
