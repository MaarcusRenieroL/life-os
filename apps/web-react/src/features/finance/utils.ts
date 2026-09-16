import type { AccountResponse, RecurringFrequency, SourceType } from './types';

/** The account's own nickname is the distinguishing label - bank name alone is
 * often identical across several accounts. */
export function accountLabel(a: AccountResponse): string {
  return a.accountName;
}

/** Secondary detail line: bank + masked number. */
export function accountSubLabel(a: AccountResponse): string {
  return a.bankName ? `${a.bankName} ••${a.accountNumberLastFour}` : `••${a.accountNumberLastFour}`;
}

/** Normalizes a recurring charge of any cadence into an average-per-month figure. */
export function monthlyEquivalent(amount: number, frequency: RecurringFrequency): number {
  switch (frequency) {
    case 'DAILY':
      return amount * 30.44;
    case 'WEEKLY':
      return amount * 4.35;
    case 'BIWEEKLY':
      return amount * 2.17;
    case 'MONTHLY':
      return amount;
    case 'QUARTERLY':
      return amount / 3;
    case 'YEARLY':
      return amount / 12;
  }
}

export function frequencyLabel(frequency: RecurringFrequency): string {
  switch (frequency) {
    case 'DAILY':
      return 'Daily';
    case 'WEEKLY':
      return 'Weekly';
    case 'BIWEEKLY':
      return 'Biweekly';
    case 'MONTHLY':
      return 'Monthly';
    case 'QUARTERLY':
      return 'Quarterly';
    case 'YEARLY':
      return 'Annual';
  }
}

export function sourceLabel(source: SourceType): string {
  switch (source) {
    case 'EMAIL_ALERT':
      return 'via email';
    case 'CSV_IMPORT':
      return 'via statement';
    case 'MANUAL_ENTRY':
      return 'manual';
    case 'API':
      return 'via API';
  }
}

/** All money in this module is INR, 0 decimal places, en-IN locale - matches
 * the Angular app's CurrencyPipe usage exactly (never shows paise). */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}
