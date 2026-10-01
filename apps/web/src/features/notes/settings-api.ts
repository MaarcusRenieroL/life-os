import { api, unwrap } from '@/lib/api-client';

import type { NoteSettings, NoteType } from './types';

const baseUrl = '/v1/notes/settings';

export const noteSettingsApi = {
  get(): Promise<NoteSettings> {
    return unwrap(api.get(baseUrl));
  },

  update(patch: {
    defaultNoteType?: NoteType;
    autoArchiveEnabled?: boolean;
    autoArchiveDays?: number;
  }): Promise<NoteSettings> {
    return unwrap(api.put(baseUrl, patch));
  },

  exportAllUrl(format: 'markdown' | 'pdf' | 'json'): string {
    return `${baseUrl}/export-all?format=${format}`;
  },

  async deleteAllData(): Promise<void> {
    await api.delete(`${baseUrl}/all-data`, { params: { confirm: true } });
  },
};
