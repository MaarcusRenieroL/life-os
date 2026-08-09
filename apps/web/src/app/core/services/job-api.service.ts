import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../models/auth.model';
import { JobResponse } from '../models/job-tracker.model';

@Injectable({ providedIn: 'root' })
export class JobApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/v1/jobs';

  getJobs(): Observable<JobResponse[]> {
    return this.http.get<ApiResponse<JobResponse[]>>(this.baseUrl).pipe(map((response) => response.data));
  }

  getJob(id: string): Observable<JobResponse> {
    return this.http.get<ApiResponse<JobResponse>>(`${this.baseUrl}/${id}`).pipe(map((response) => response.data));
  }

  scrapeLinkedIn(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/scrape/linkedin`, {});
  }

  scrapeNaukri(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/scrape/naukri`, {});
  }
}
