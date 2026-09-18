// Mirrors apps/web's features/cards/card.model.ts.

export type CardNetwork = 'Visa' | 'Mastercard' | 'Amex' | 'Discover';

// Backend's NetworkType enum is upper-cased - these are NOT the same strings
// as CardNetwork above, hence the two-way mapping.
export type ApiCardNetwork = 'VISA' | 'MASTERCARD' | 'AMEX' | 'DISCOVER';

const API_TO_UI_NETWORK: Record<ApiCardNetwork, CardNetwork> = {
  VISA: 'Visa',
  MASTERCARD: 'Mastercard',
  AMEX: 'Amex',
  DISCOVER: 'Discover',
};

export function apiNetworkToCardNetwork(network: ApiCardNetwork): CardNetwork {
  return API_TO_UI_NETWORK[network];
}

export function cardNetworkToApiNetwork(network: CardNetwork): ApiCardNetwork {
  return network.toUpperCase() as ApiCardNetwork;
}

/** Shape of CardController's JSON responses - number/CVV are deliberately never
 * returned, only lastFourDigits; expiry IS returned decrypted. */
export interface CardApiResponse {
  id: string;
  nickname: string;
  network: ApiCardNetwork;
  lastFourDigits: number;
  expiry: string;
  cardHolderName: string;
  billingZip: string;
  createdAt: string;
  updatedAt: string;
}

/** Masks using only the last-4-digits the API actually returns - amex uses a
 * 15-digit grouping, everything else 16. */
export function maskFromLastFour(lastFourDigits: number, network: ApiCardNetwork): string {
  const last4 = String(lastFourDigits).padStart(4, '0');
  if (network === 'AMEX') return `**** ****** *${last4}`;
  return `**** **** **** ${last4}`;
}

export interface CardSummary {
  id: string;
  nickname: string;
  network: CardNetwork;
  maskedNumber: string;
  cardholderName: string;
  expiry: string;
}

export function cardApiResponseToSummary(response: CardApiResponse): CardSummary {
  return {
    id: response.id,
    nickname: response.nickname,
    network: apiNetworkToCardNetwork(response.network),
    maskedNumber: maskFromLastFour(response.lastFourDigits, response.network),
    cardholderName: response.cardHolderName,
    expiry: response.expiry,
  };
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
