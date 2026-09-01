import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../models/auth.model';
import { JobFitResult, JobListing, PageResponse } from '../models/job-tracker.model';

export interface CreateJobListingPayload {
  title: string;
  company: string;
  location?: string;
  workModel?: string;
  url?: string;
  source?: string;
  jobDescriptionText?: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  seniorityLevel?: string;
  visaSponsorship?: string;
  tags?: string[];
}

@Injectable({ providedIn: 'root' })
export class JobApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/v1/jobs';

  curated(since?: string, page = 0, size = 20): Observable<PageResponse<JobListing>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (since) {
      params = params.set('since', since);
    }
    return this.http
      .get<ApiResponse<PageResponse<JobListing>>>(`${this.baseUrl}/curated`, { params })
      .pipe(map((response) => response.data));
  }

  search(query: Record<string, string | number>): Observable<PageResponse<JobListing>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== '' && value != null) {
        params = params.set(key, value);
      }
    }
    return this.http
      .get<ApiResponse<PageResponse<JobListing>>>(this.baseUrl, { params })
      .pipe(map((response) => response.data));
  }

  saved(): Observable<JobListing[]> {
    return this.http
      .get<ApiResponse<JobListing[]>>(`${this.baseUrl}/saved`)
      .pipe(map((response) => response.data));
  }

  get(jobId: string): Observable<JobListing> {
    return this.http
      .get<ApiResponse<JobListing>>(`${this.baseUrl}/${jobId}`)
      .pipe(map((response) => response.data));
  }

  create(payload: CreateJobListingPayload): Observable<JobListing> {
    return this.http
      .post<ApiResponse<JobListing>>(this.baseUrl, payload)
      .pipe(map((response) => response.data));
  }

  update(jobId: string, patch: Partial<Pick<JobListing, 'saved' | 'dismissed' | 'tags'>>): Observable<JobListing> {
    return this.http
      .patch<ApiResponse<JobListing>>(`${this.baseUrl}/${jobId}`, patch)
      .pipe(map((response) => response.data));
  }

  fitScore(jobId: string): Observable<JobFitResult> {
    return this.http
      .get<ApiResponse<JobFitResult>>(`${this.baseUrl}/${jobId}/fit-score`)
      .pipe(map((response) => response.data));
  }
}
