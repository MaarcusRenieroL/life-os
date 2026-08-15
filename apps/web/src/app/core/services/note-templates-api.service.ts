import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../models/auth.model';
import { Note, NoteTemplate, PageResponse } from '../models/notes.model';

@Injectable({ providedIn: 'root' })
export class NoteTemplatesApiService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = '/v1/templates';

  list(category?: string, page = 0, size = 50): Observable<PageResponse<NoteTemplate>> {
    return this.http
      .get<ApiResponse<PageResponse<NoteTemplate>>>(this.baseUrl, {
        params: category ? { category, page, size } : { page, size },
      })
      .pipe(map((response) => response.data));
  }

  create(name: string, content: string, category?: string): Observable<NoteTemplate> {
    return this.http
      .post<ApiResponse<NoteTemplate>>(this.baseUrl, { name, content, category })
      .pipe(map((response) => response.data));
  }

  update(id: string, name?: string, content?: string, category?: string): Observable<NoteTemplate> {
    return this.http
      .put<ApiResponse<NoteTemplate>>(`${this.baseUrl}/${id}`, { name, content, category })
      .pipe(map((response) => response.data));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`).pipe(map(() => undefined));
  }

  use(id: string, title: string): Observable<Note> {
    return this.http
      .post<ApiResponse<Note>>(`${this.baseUrl}/${id}/use`, { title })
      .pipe(map((response) => response.data));
  }
}
