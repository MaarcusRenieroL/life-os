import { api, unwrap } from '@/lib/api-client';

import type { Note, NoteTemplate, PageResponse } from './types';

const baseUrl = '/v1/templates';

export const templatesApi = {
  list(category?: string, page = 0, size = 50): Promise<PageResponse<NoteTemplate>> {
    return unwrap(api.get(baseUrl, { params: { category, page, size } }));
  },

  create(name: string, content: string, category?: string): Promise<NoteTemplate> {
    return unwrap(api.post(baseUrl, { name, content, category }));
  },

  update(
    id: string,
    name?: string,
    content?: string,
    category?: string,
  ): Promise<NoteTemplate> {
    return unwrap(api.put(`${baseUrl}/${id}`, { name, content, category }));
  },

  async delete(id: string): Promise<void> {
    await api.delete(`${baseUrl}/${id}`);
  },

  use(id: string, title: string): Promise<Note> {
    return unwrap(api.post(`${baseUrl}/${id}/use`, { title }));
  },
};
