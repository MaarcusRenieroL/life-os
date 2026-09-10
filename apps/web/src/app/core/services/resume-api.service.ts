import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../models/auth.model';
import { Resume, Skill } from '../models/job-tracker.model';

@Injectable({ providedIn: 'root' })
export class ResumeApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/v1/resumes';

  /** The single saved resume, or null (404) if none uploaded yet. */
  current(): Observable<Resume | null> {
    return this.http.get<ApiResponse<Resume>>(this.baseUrl).pipe(
      map((response) => response.data),
    );
  }

  upload(file: File, label?: string): Observable<Resume> {
    const form = new FormData();
    form.append('file', file);
    if (label) {
      form.append('label', label);
    }
    return this.http
      .post<ApiResponse<Resume>>(`${this.baseUrl}/upload`, form)
      .pipe(map((response) => response.data));
  }

  delete(resumeId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/${resumeId}`)
      .pipe(map(() => undefined));
  }

  skillLibrary(): Observable<Skill[]> {
    return this.http
      .get<ApiResponse<Skill[]>>('/v1/skills')
      .pipe(map((response) => response.data));
  }
}
