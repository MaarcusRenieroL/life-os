import { api, unwrap } from '@/lib/api-client';

import type { JournalEntry, JournalFilters, JournalInsights, JournalPrompt, SaveJournalEntryRequest } from './journal-types';

const baseUrl = '/v1/notes/journal';

export const journalApi = {
  list(filters: JournalFilters = {}): Promise<JournalEntry[]> {
    return unwrap(api.get(baseUrl, { params: filters }));
  },
  get(noteId: string): Promise<JournalEntry> {
    return unwrap(api.get(`${baseUrl}/${noteId}`));
  },
  create(request: SaveJournalEntryRequest): Promise<JournalEntry> {
    return unwrap(api.post(baseUrl, request));
  },
  update(noteId: string, request: SaveJournalEntryRequest): Promise<JournalEntry> {
    return unwrap(api.put(`${baseUrl}/${noteId}`, request));
  },
  async delete(noteId: string): Promise<void> {
    await api.delete(`${baseUrl}/${noteId}`);
  },
  prompts(): Promise<JournalPrompt[]> {
    return unwrap(api.get(`${baseUrl}/prompts`));
  },
  suggestedPrompts(date?: string): Promise<JournalPrompt[]> {
    return unwrap(api.get(`${baseUrl}/prompts/suggested`, { params: { date } }));
  },
  insights(from?: string, to?: string): Promise<JournalInsights> {
    return unwrap(api.get(`${baseUrl}/insights`, { params: { from, to } }));
  },
};
