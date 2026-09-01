import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../models/auth.model';
import {
  Application,
  ApplicationDetail,
  InterviewRound,
  Referral,
} from '../models/job-tracker.model';

export interface CreateApplicationPayload {
  jobListingId: string;
  resumeId?: string;
  applicationMethod?: string;
  coverLetterText?: string;
  customMessageText?: string;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class ApplicationApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/v1/applications';

  list(status?: string): Observable<Application[]> {
    const params = status ? new HttpParams().set('status', status) : undefined;
    return this.http
      .get<ApiResponse<Application[]>>(this.baseUrl, { params })
      .pipe(map((response) => response.data));
  }

  needsFollowUp(): Observable<Application[]> {
    return this.http
      .get<ApiResponse<Application[]>>(`${this.baseUrl}/needs-followup`)
      .pipe(map((response) => response.data));
  }

  detail(applicationId: string): Observable<ApplicationDetail> {
    return this.http
      .get<ApiResponse<ApplicationDetail>>(`${this.baseUrl}/${applicationId}`)
      .pipe(map((response) => response.data));
  }

  create(payload: CreateApplicationPayload): Observable<Application> {
    return this.http
      .post<ApiResponse<Application>>(this.baseUrl, payload)
      .pipe(map((response) => response.data));
  }

  updateStatus(applicationId: string, status: string, note?: string): Observable<Application> {
    return this.http
      .patch<ApiResponse<Application>>(`${this.baseUrl}/${applicationId}/status`, { status, note })
      .pipe(map((response) => response.data));
  }

  addInterview(applicationId: string, payload: Partial<InterviewRound> & { type: string }): Observable<InterviewRound> {
    return this.http
      .post<ApiResponse<InterviewRound>>(`${this.baseUrl}/${applicationId}/interviews`, payload)
      .pipe(map((response) => response.data));
  }

  referralSuggestions(applicationId: string): Observable<{ company: string; contacts: unknown[]; draftMessage: string | null }> {
    return this.http
      .get<ApiResponse<{ company: string; contacts: unknown[]; draftMessage: string | null }>>(
        `${this.baseUrl}/${applicationId}/referral-suggestions`,
      )
      .pipe(map((response) => response.data));
  }

  createReferral(applicationId: string, contactId: string, generateMessage = true): Observable<Referral> {
    return this.http
      .post<ApiResponse<Referral>>(`${this.baseUrl}/${applicationId}/referrals`, { contactId, generateMessage })
      .pipe(map((response) => response.data));
  }
}
