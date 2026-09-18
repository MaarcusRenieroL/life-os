import { api, unwrap } from '@/lib/api-client';

import type { Folder } from './types';

const baseUrl = '/v1/folders';

export const foldersApi = {
  list(): Promise<Folder[]> {
    return unwrap(api.get(baseUrl));
  },

  create(name: string, parentFolderId?: string | null): Promise<Folder> {
    return unwrap(api.post(baseUrl, { name, parentFolderId }));
  },

  rename(id: string, name: string): Promise<Folder> {
    return unwrap(api.put(`${baseUrl}/${id}`, { name }));
  },

  async delete(id: string, cascade = false): Promise<void> {
    await api.delete(`${baseUrl}/${id}`, { params: { cascade } });
  },
};
