import { ActionRequiredEntry } from '../models/vault.model';

export type EntryStrengthLabel = 'Strong' | 'Weak' | 'Reused';

export function buildEntryStrengthMap(
  actionRequired: ActionRequiredEntry[],
): Map<string, EntryStrengthLabel> {
  const result = new Map<string, EntryStrengthLabel>();

  for (const item of actionRequired) {
    result.set(item.id, item.issue.toLowerCase().includes('weak') ? 'Weak' : 'Reused');
  }

  return result;
}
