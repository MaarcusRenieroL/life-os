import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../models/auth.model';
import { NoteSettings, NoteType } from '../models/notes.model';

@Injectable({ providedIn: 'root' })
export class NoteSettingsApiService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = '/v1/notes/settings';

  get(): Observable<NoteSettings> {
    return this.http.get<ApiResponse<NoteSettings>>(this.baseUrl).pipe(map((response) => response.data));
  }

  update(patch: {
    defaultNoteType?: NoteType;
    autoArchiveEnabled?: boolean;
    autoArchiveDays?: number;
  }): Observable<NoteSettings> {
    return this.http
      .put<ApiResponse<NoteSettings>>(this.baseUrl, patch)
      .pipe(map((response) => response.data));
  }

  exportAllUrl(format: 'markdown' | 'pdf' | 'json'): string {
    return `${this.baseUrl}/export-all?format=${format}`;
  }

  deleteAllData(): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/all-data`, { params: { confirm: true } })
      .pipe(map(() => undefined));
  }
}
