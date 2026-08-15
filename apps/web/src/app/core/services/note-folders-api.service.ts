import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../models/auth.model';
import { Folder } from '../models/notes.model';

@Injectable({ providedIn: 'root' })
export class NoteFoldersApiService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = '/v1/folders';

  list(): Observable<Folder[]> {
    return this.http.get<ApiResponse<Folder[]>>(this.baseUrl).pipe(map((response) => response.data));
  }

  create(name: string, parentFolderId?: string | null): Observable<Folder> {
    return this.http
      .post<ApiResponse<Folder>>(this.baseUrl, { name, parentFolderId })
      .pipe(map((response) => response.data));
  }

  rename(id: string, name: string): Observable<Folder> {
    return this.http
      .put<ApiResponse<Folder>>(`${this.baseUrl}/${id}`, { name })
      .pipe(map((response) => response.data));
  }

  delete(id: string, cascade = false): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/${id}`, { params: { cascade } })
      .pipe(map(() => undefined));
  }
}
