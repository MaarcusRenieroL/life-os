import { api, unwrap } from '@/lib/api-client';

import type { Tag } from './types';

const baseUrl = '/v1/tags';

export const tagsApi = {
  list(search?: string, limit = 100): Promise<Tag[]> {
    return unwrap(api.get(baseUrl, { params: { search, limit } }));
  },

  create(name: string, color?: string | null): Promise<Tag> {
    return unwrap(api.post(baseUrl, { name, color }));
  },

  update(id: string, name?: string, color?: string | null): Promise<Tag> {
    return unwrap(api.put(`${baseUrl}/${id}`, { name, color }));
  },

  async delete(id: string): Promise<void> {
    await api.delete(`${baseUrl}/${id}`);
  },
};
