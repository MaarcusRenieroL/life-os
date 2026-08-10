import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../models/auth.model';
import { CreateInterviewRequest, InterviewResponse, UpdateInterviewRequest } from '../models/job-tracker.model';

@Injectable({ providedIn: 'root' })
export class InterviewApiService {
  private readonly http = inject(HttpClient);

  private baseUrl(applicationId: string): string {
    return `/v1/jobs/applications/${applicationId}/interviews`;
  }

  getInterviews(applicationId: string): Observable<InterviewResponse[]> {
    return this.http
      .get<ApiResponse<InterviewResponse[]>>(this.baseUrl(applicationId))
      .pipe(map((response) => response.data));
  }

  createInterview(applicationId: string, request: CreateInterviewRequest): Observable<InterviewResponse> {
    return this.http
      .post<ApiResponse<InterviewResponse>>(this.baseUrl(applicationId), request)
      .pipe(map((response) => response.data));
  }

  updateInterview(
    applicationId: string,
    interviewId: string,
    request: UpdateInterviewRequest,
  ): Observable<InterviewResponse> {
    return this.http
      .put<ApiResponse<InterviewResponse>>(`${this.baseUrl(applicationId)}/${interviewId}`, request)
      .pipe(map((response) => response.data));
  }

  deleteInterview(applicationId: string, interviewId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl(applicationId)}/${interviewId}`)
      .pipe(map(() => undefined));
  }
}
