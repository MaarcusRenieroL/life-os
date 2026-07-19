import { VaultEntrySummary } from '../models/vault.model';

export type MockStrengthLabel = 'Strong' | 'Weak' | 'Reused';
export type MockTwoFactorStatus = 'enabled' | 'available-off' | 'not-supported';

export interface MockEntrySecurity {
  strength: MockStrengthLabel;
  twoFactor: MockTwoFactorStatus;
}

/**
 * The vault API doesn't (yet) return password strength, reuse, or 2FA status —
 * derive a stable pseudo-random value per entry id so the UI has something
 * consistent to render until that backend work lands.
 */
function hashString(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index++) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return Math.abs(hash);
}

export function deriveMockSecurity(
  entries: VaultEntrySummary[],
): Map<string, MockEntrySecurity> {
  const result = new Map<string, MockEntrySecurity>();

  entries.forEach((entry, index) => {
    const hash = hashString(entry.id || entry.title + index);

    let strength: MockStrengthLabel;
    if (hash % 7 === 0) {
      strength = 'Reused';
    } else if (hash % 3 === 0) {
      strength = 'Weak';
    } else {
      strength = 'Strong';
    }

    let twoFactor: MockTwoFactorStatus;
    const twoFaBucket = hash % 3;
    if (twoFaBucket === 0) {
      twoFactor = 'enabled';
    } else if (twoFaBucket === 1) {
      twoFactor = 'available-off';
    } else {
      twoFactor = 'not-supported';
    }

    result.set(entry.id, { strength, twoFactor });
  });

  return result;
}
