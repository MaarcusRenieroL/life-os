import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../models/auth.model';
import { Tag } from '../models/notes.model';

@Injectable({ providedIn: 'root' })
export class NoteTagsApiService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = '/v1/tags';

  list(search?: string, limit = 100): Observable<Tag[]> {
    return this.http
      .get<ApiResponse<Tag[]>>(this.baseUrl, { params: { search: search ?? '', limit } })
      .pipe(map((response) => response.data));
  }

  create(name: string, color?: string | null): Observable<Tag> {
    return this.http
      .post<ApiResponse<Tag>>(this.baseUrl, { name, color })
      .pipe(map((response) => response.data));
  }

  update(id: string, name?: string, color?: string | null): Observable<Tag> {
    return this.http
      .put<ApiResponse<Tag>>(`${this.baseUrl}/${id}`, { name, color })
      .pipe(map((response) => response.data));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`).pipe(map(() => undefined));
  }
}
