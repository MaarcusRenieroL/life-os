import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../models/auth.model';
import { PageResponse, RecentSearch, SearchResult, SearchSuggestion } from '../models/notes.model';

@Injectable({ providedIn: 'root' })
export class NoteSearchApiService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = '/v1/notes/search';

  search(query: string, page = 0, size = 20): Observable<PageResponse<SearchResult>> {
    return this.http
      .get<ApiResponse<PageResponse<SearchResult>>>(this.baseUrl, { params: { q: query, page, size } })
      .pipe(map((response) => response.data));
  }

  suggestions(query: string, type?: 'title' | 'tag' | 'folder'): Observable<SearchSuggestion[]> {
    return this.http
      .get<ApiResponse<SearchSuggestion[]>>(`${this.baseUrl}/suggestions`, {
        params: type ? { q: query, type } : { q: query },
      })
      .pipe(map((response) => response.data));
  }

  recent(): Observable<RecentSearch[]> {
    return this.http
      .get<ApiResponse<RecentSearch[]>>(`${this.baseUrl}/recent`)
      .pipe(map((response) => response.data));
  }
}
