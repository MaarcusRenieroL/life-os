import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../models/auth.model';
import {
  JobFitResult,
  JobListing,
  JobStatus,
  ResumeTailoringResult,
} from '../models/job-tracker.model';

@Injectable({ providedIn: 'root' })
export class JobApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/v1/jobs';

  list(): Observable<JobListing[]> {
    return this.http
      .get<ApiResponse<JobListing[]>>(this.baseUrl)
      .pipe(map((response) => response.data));
  }

  get(jobId: string): Observable<JobListing> {
    return this.http
      .get<ApiResponse<JobListing>>(`${this.baseUrl}/${jobId}`)
      .pipe(map((response) => response.data));
  }

  /**
   * Add a job from a pasted URL. Pass `jobDescriptionText` on the retry when the first call
   * returned 422 (the site blocked a server-side read).
   */
  fromLink(url: string, jobDescriptionText?: string): Observable<JobListing> {
    return this.http
      .post<ApiResponse<JobListing>>(`${this.baseUrl}/from-link`, { url, jobDescriptionText })
      .pipe(map((response) => response.data));
  }

  setStatus(jobId: string, status: JobStatus): Observable<JobListing> {
    return this.http
      .patch<ApiResponse<JobListing>>(`${this.baseUrl}/${jobId}`, { status })
      .pipe(map((response) => response.data));
  }

  rescore(jobId: string): Observable<JobFitResult> {
    return this.http
      .post<ApiResponse<JobFitResult>>(`${this.baseUrl}/${jobId}/rescore`, {})
      .pipe(map((response) => response.data));
  }

  tailorResume(jobId: string): Observable<ResumeTailoringResult> {
    return this.http
      .post<ApiResponse<ResumeTailoringResult>>(`${this.baseUrl}/${jobId}/tailor-resume`, {})
      .pipe(map((response) => response.data));
  }

  delete(jobId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/${jobId}`)
      .pipe(map(() => undefined));
  }
}
