import { api, unwrap } from '@/lib/api-client';

import type { CreateMerchantRequest, MerchantResponse, UpdateMerchantRequest } from './types';

const baseUrl = '/v1/finance/merchants';

export const merchantApi = {
  getMerchants(): Promise<MerchantResponse[]> {
    return unwrap(api.get(baseUrl));
  },
  createMerchant(request: CreateMerchantRequest): Promise<MerchantResponse> {
    return unwrap(api.post(baseUrl, request));
  },
  updateMerchant(id: string, request: UpdateMerchantRequest): Promise<MerchantResponse> {
    return unwrap(api.put(`${baseUrl}/${id}`, request));
  },
  async deleteMerchant(id: string): Promise<void> {
    await api.delete(`${baseUrl}/${id}`);
  },
};
