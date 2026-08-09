import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../models/auth.model';
import {
  ApplicationResponse,
  CreateApplicationRequest,
  ScoreApplicationRequest,
  UpdateApplicationRequest,
} from '../models/job-tracker.model';

@Injectable({ providedIn: 'root' })
export class ApplicationApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/v1/jobs/applications';

  getApplications(): Observable<ApplicationResponse[]> {
    return this.http
      .get<ApiResponse<ApplicationResponse[]>>(this.baseUrl)
      .pipe(map((response) => response.data));
  }

  getApplication(id: string): Observable<ApplicationResponse> {
    return this.http
      .get<ApiResponse<ApplicationResponse>>(`${this.baseUrl}/${id}`)
      .pipe(map((response) => response.data));
  }

  createApplication(request: CreateApplicationRequest): Observable<ApplicationResponse> {
    return this.http
      .post<ApiResponse<ApplicationResponse>>(this.baseUrl, request)
      .pipe(map((response) => response.data));
  }

  updateApplication(id: string, request: UpdateApplicationRequest): Observable<ApplicationResponse> {
    return this.http
      .put<ApiResponse<ApplicationResponse>>(`${this.baseUrl}/${id}`, request)
      .pipe(map((response) => response.data));
  }

  scoreApplication(id: string, request: ScoreApplicationRequest): Observable<ApplicationResponse> {
    return this.http
      .post<ApiResponse<ApplicationResponse>>(`${this.baseUrl}/${id}/score`, request)
      .pipe(map((response) => response.data));
  }

  tailorResume(id: string): Observable<ApplicationResponse> {
    return this.http
      .post<ApiResponse<ApplicationResponse>>(`${this.baseUrl}/${id}/tailor-resume`, {})
      .pipe(map((response) => response.data));
  }

  deleteApplication(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`).pipe(map(() => undefined));
  }
}
