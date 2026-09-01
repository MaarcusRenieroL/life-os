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

  outreach(applicationId: string): Observable<OutreachAttempt[]> {
    return this.http
      .get<ApiResponse<OutreachAttempt[]>>(`${this.baseUrl}/${applicationId}/outreach`)
      .pipe(map((response) => response.data));
  }

  planOutreach(applicationId: string): Observable<OutreachAttempt[]> {
    return this.http
      .post<ApiResponse<OutreachAttempt[]>>(`${this.baseUrl}/${applicationId}/outreach/plan`, {})
      .pipe(map((response) => response.data));
  }

  prep(applicationId: string, roundId: string): Observable<InterviewPrepItem[]> {
    return this.http
      .get<ApiResponse<InterviewPrepItem[]>>(`${this.baseUrl}/${applicationId}/interviews/${roundId}/prep`)
      .pipe(map((response) => response.data));
  }

  togglePrep(applicationId: string, roundId: string, prepId: string): Observable<InterviewPrepItem> {
    return this.http
      .post<ApiResponse<InterviewPrepItem>>(
        `${this.baseUrl}/${applicationId}/interviews/${roundId}/prep/${prepId}/toggle`,
        {},
      )
      .pipe(map((response) => response.data));
  }

  emails(applicationId: string): Observable<EmailMessage[]> {
    return this.http
      .get<ApiResponse<EmailMessage[]>>(`${this.baseUrl}/${applicationId}/emails`)
      .pipe(map((response) => response.data));
  }

  upsertOffer(applicationId: string, payload: Record<string, unknown>): Observable<unknown> {
    return this.http
      .put<ApiResponse<unknown>>(`${this.baseUrl}/${applicationId}/offer`, payload)
      .pipe(map((response) => response.data));
  }
}

export interface OutreachAttempt {
  id: string;
  channel: string;
  recipient: string | null;
  subject: string | null;
  messageBody: string | null;
  status: string;
  scheduledFor: string | null;
  sentAt: string | null;
  opened: boolean;
  clicked: boolean;
  replied: boolean;
}

export interface InterviewPrepItem {
  id: string;
  interviewRoundId: string;
  title: string;
  description: string | null;
  resourceLink: string | null;
  completed: boolean;
}

export interface EmailMessage {
  id: string;
  direction: string;
  fromAddress: string | null;
  subject: string | null;
  body: string | null;
  category: string;
  receivedAt: string | null;
}
