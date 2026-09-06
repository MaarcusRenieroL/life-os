import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../models/auth.model';
import { Resume, Skill } from '../models/job-tracker.model';

@Injectable({ providedIn: 'root' })
export class ResumeApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/v1/resumes';

  list(): Observable<Resume[]> {
    return this.http
      .get<ApiResponse<Resume[]>>(this.baseUrl)
      .pipe(map((response) => response.data));
  }

  get(resumeId: string): Observable<Resume> {
    return this.http
      .get<ApiResponse<Resume>>(`${this.baseUrl}/${resumeId}`)
      .pipe(map((response) => response.data));
  }

  upload(file: File, label?: string, base = false): Observable<Resume> {
    const form = new FormData();
    form.append('file', file);
    if (label) {
      form.append('label', label);
    }
    form.append('base', String(base));
    return this.http
      .post<ApiResponse<Resume>>(`${this.baseUrl}/upload`, form)
      .pipe(map((response) => response.data));
  }

  skills(resumeId: string): Observable<Skill[]> {
    return this.http
      .get<ApiResponse<Skill[]>>(`${this.baseUrl}/${resumeId}/skills`)
      .pipe(map((response) => response.data));
  }

  tailor(
    resumeId: string,
    jobListingId: string,
  ): Observable<{ resume: Resume; markdown: string; latex: string | null }> {
    return this.http
      .post<ApiResponse<{ resume: Resume; markdown: string; latex: string | null }>>(
        `${this.baseUrl}/${resumeId}/tailor`,
        { jobListingId },
      )
      .pipe(map((response) => response.data));
  }

  getLatexTemplate(resumeId: string): Observable<string | null> {
    return this.http
      .get<ApiResponse<{ source: string | null }>>(`${this.baseUrl}/${resumeId}/latex`)
      .pipe(map((response) => response.data.source));
  }

  saveLatexTemplate(resumeId: string, source: string): Observable<Resume> {
    return this.http
      .put<ApiResponse<Resume>>(`${this.baseUrl}/${resumeId}/latex`, { source })
      .pipe(map((response) => response.data));
  }

  skillLibrary(): Observable<Skill[]> {
    return this.http
      .get<ApiResponse<Skill[]>>('/v1/skills')
      .pipe(map((response) => response.data));
  }
}
