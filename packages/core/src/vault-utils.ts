// Password-manager helpers shared by the native apps: CSV parsing for import, the generator, card masking.
import type { ApiCardNetwork, VaultCard } from './models-extra';

/** Hand-rolled RFC4180-ish CSV parser: quoted fields, embedded commas, CRLF line endings. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') { field += '"'; i++; }
      else if (char === '"') inQuotes = false;
      else field += char;
    } else if (char === '"') inQuotes = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\r') { /* handled by \n */ }
    else if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else field += char;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

export interface PasswordGeneratorOptions {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  excludeAmbiguous: boolean;
}

export const DEFAULT_GENERATOR: PasswordGeneratorOptions = { length: 20, includeUppercase: true, includeLowercase: true, includeNumbers: true, includeSymbols: true, excludeAmbiguous: true };

const CHARSETS = { lowercase: 'abcdefghijklmnopqrstuvwxyz', uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', numbers: '0123456789', symbols: '!@#$%^&*()_+=[]{}' };
const AMBIGUOUS = 'O0lI1';

/** `randomInt(max)` must return a uniformly random integer in [0, max) from a secure source (crypto), never Math.random. */
export function generatePassword(options: PasswordGeneratorOptions, randomInt: (max: number) => number): string {
  const keep = (set: string) => (options.excludeAmbiguous ? [...set].filter((c) => !AMBIGUOUS.includes(c)).join('') : set);
  const pools: string[] = [];
  if (options.includeLowercase) pools.push(keep(CHARSETS.lowercase));
  if (options.includeUppercase) pools.push(keep(CHARSETS.uppercase));
  if (options.includeNumbers) pools.push(keep(CHARSETS.numbers));
  if (options.includeSymbols) pools.push(keep(CHARSETS.symbols));
  if (pools.length === 0) throw new Error('At least one character set must be selected');
  const all = pools.join('');
  const out: string[] = pools.map((p) => p[randomInt(p.length)]);
  while (out.length < options.length) out.push(all[randomInt(all.length)]);
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.slice(0, options.length).join('');
}

export type EntryStrengthLabel = 'Strong' | 'Weak' | 'Reused';

/** Which entries the health report flagged, by their id. */
export function entryStrengthMap(actionRequired: { id: string; issue: string }[]): Map<string, EntryStrengthLabel> {
  const result = new Map<string, EntryStrengthLabel>();
  for (const item of actionRequired) result.set(item.id, item.issue.toLowerCase().includes('weak') ? 'Weak' : 'Reused');
  return result;
}

export const CARD_NETWORKS: ApiCardNetwork[] = ['VISA', 'MASTERCARD', 'AMEX', 'DISCOVER'];

/** The API only ever returns the last four digits, so that is all that is shown. */
export function maskCard(card: Pick<VaultCard, 'lastFourDigits' | 'network'>): string {
  const last4 = String(card.lastFourDigits).padStart(4, '0');
  return card.network === 'AMEX' ? `**** ****** *${last4}` : `**** **** **** ${last4}`;
}
