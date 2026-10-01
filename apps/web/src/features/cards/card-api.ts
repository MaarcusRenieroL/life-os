import { api, unwrap } from '@/lib/api-client';

import {
  cardApiResponseToSummary,
  cardNetworkToApiNetwork,
  type AddCardFormValue,
  type CardApiResponse,
  type CardSummary,
} from './types';

const baseUrl = '/v1/vault/cards';

export const cardApi = {
  async getCards(): Promise<CardSummary[]> {
    const cards = await unwrap<CardApiResponse[]>(api.get(baseUrl));
    return cards.map(cardApiResponseToSummary);
  },

  async createCard(value: AddCardFormValue): Promise<CardSummary> {
    const card = await unwrap<CardApiResponse>(
      api.post(baseUrl, {
        nickname: value.nickname,
        network: cardNetworkToApiNetwork(value.network),
        cardNumber: value.cardNumber.replace(/\D/g, ''),
        cvv: value.cvv,
        expiry: value.expiry,
        cardHolderName: value.cardholderName,
        billingZip: value.billingZip,
      }),
    );
    return cardApiResponseToSummary(card);
  },

  async deleteCard(id: string): Promise<void> {
    await api.delete(`${baseUrl}/${id}`);
  },
};
