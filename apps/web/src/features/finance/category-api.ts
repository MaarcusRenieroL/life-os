import { api, unwrap } from '@/lib/api-client';

import type { CategoryResponse, CreateCategoryRequest, UpdateCategoryRequest } from './types';

const baseUrl = '/v1/finance/categories';

export const categoryApi = {
  getCategories(): Promise<CategoryResponse[]> {
    return unwrap(api.get(baseUrl));
  },
  createCategory(request: CreateCategoryRequest): Promise<CategoryResponse> {
    return unwrap(api.post(baseUrl, request));
  },
  updateCategory(id: string, request: UpdateCategoryRequest): Promise<CategoryResponse> {
    return unwrap(api.put(`${baseUrl}/${id}`, request));
  },
  async deleteCategory(id: string): Promise<void> {
    await api.delete(`${baseUrl}/${id}`);
  },
};
