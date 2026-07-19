export type CardNetwork = 'Visa' | 'Mastercard' | 'Amex' | 'Discover';

export type BillingCycle = 'monthly' | 'yearly' | 'weekly';

export interface CardSummary {
  id: string;
  nickname: string;
  network: CardNetwork;
  maskedNumber: string;
  cardholderName: string;
  expiry: string;
}

export interface AddCardFormValue {
  nickname: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
  network: CardNetwork;
  cardholderName: string;
  billingZip: string;
}

export interface SubscriptionSummary {
  id: string;
  serviceName: string;
  cardId: string | null;
  billingCycle: BillingCycle;
  amount: number;
  nextRenewalDate: string;
  linkedVaultEntryId: string | null;
  remindBeforeRenewal: boolean;
}

export interface AddSubscriptionFormValue {
  serviceName: string;
  cardId: string | null;
  billingCycle: BillingCycle;
  amount: number;
  nextRenewalDate: string;
  linkedVaultEntryId: string | null;
  remindBeforeRenewal: boolean;
}

/** Masks a raw card number to the shortest reasonable "last 4 digits" form,
 * matching the design's `**** **** **** 4471` (16-digit) and
 * `**** ****** *1009` (15-digit / Amex) styles. */
export function maskCardNumber(rawCardNumber: string): string {
  const digits = rawCardNumber.replace(/\D/g, '');
  const last4 = digits.slice(-4).padStart(4, '0');

  if (digits.length === 15) {
    return `**** ****** *${last4}`;
  }

  return `**** **** **** ${last4}`;
}

/** Short "Chase •4471" style label used in the subscriptions table. */
export function cardShortLabel(card: CardSummary): string {
  const firstWord = card.nickname.trim().split(/\s+/)[0] || card.nickname;
  const last4 = card.maskedNumber.replace(/\D/g, '').slice(-4);
  return `${firstWord} •${last4}`;
}
