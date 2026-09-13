import { api, unwrap } from '@/lib/api-client';

import type { PageResponse, RecentSearch, SearchResult, SearchSuggestion } from './types';

const baseUrl = '/v1/notes/search';

export const noteSearchApi = {
  search(query: string, page = 0, size = 20): Promise<PageResponse<SearchResult>> {
    return unwrap(api.get(baseUrl, { params: { q: query, page, size } }));
  },

  suggestions(query: string, type?: 'title' | 'tag' | 'folder'): Promise<SearchSuggestion[]> {
    return unwrap(api.get(`${baseUrl}/suggestions`, { params: { q: query, type } }));
  },

  recent(): Promise<RecentSearch[]> {
    return unwrap(api.get(`${baseUrl}/recent`));
  },
};
