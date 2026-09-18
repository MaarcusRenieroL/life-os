import { api, unwrap } from '@/lib/api-client';

import type { VaultCategory, VaultCategoryWriteRequest } from './types';

const baseUrl = '/v1/vault/categories';

export const vaultCategoryApi = {
  getCategories(): Promise<VaultCategory[]> {
    return unwrap(api.get(baseUrl));
  },

  createCategory(request: VaultCategoryWriteRequest): Promise<VaultCategory> {
    return unwrap(api.post(baseUrl, request));
  },

  updateCategory(id: string, request: VaultCategoryWriteRequest): Promise<VaultCategory> {
    return unwrap(api.put(`${baseUrl}/${id}`, request));
  },

  async deleteCategory(id: string): Promise<void> {
    await api.delete(`${baseUrl}/${id}`);
  },
};
