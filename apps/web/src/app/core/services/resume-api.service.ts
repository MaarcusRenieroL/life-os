import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../models/auth.model';
import { ResumeUploadResponse } from '../models/job-tracker.model';

@Injectable({ providedIn: 'root' })
export class ResumeApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/v1/jobs/resumes';

  uploadResume(file: File): Observable<ResumeUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .post<ApiResponse<ResumeUploadResponse>>(`${this.baseUrl}/upload`, formData)
      .pipe(map((response) => response.data));
  }

  getActiveResume(): Observable<ResumeUploadResponse> {
    return this.http
      .get<ApiResponse<ResumeUploadResponse>>(`${this.baseUrl}/active`)
      .pipe(map((response) => response.data));
  }
}
