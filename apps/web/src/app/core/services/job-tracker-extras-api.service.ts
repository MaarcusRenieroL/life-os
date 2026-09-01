import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../models/auth.model';

export interface FollowUpTask {
  id: string;
  applicationId: string | null;
  type: string;
  title: string;
  dueDate: string;
  status: 'OPEN' | 'DONE' | 'DISMISSED';
  priority: string;
  notes: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface JobNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  read: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class JobTrackerExtrasApiService {
  private readonly http = inject(HttpClient);

  analytics(): Observable<Record<string, unknown>> {
    return this.http
      .get<ApiResponse<Record<string, unknown>>>('/v1/analytics')
      .pipe(map((response) => response.data));
  }

  offerComparison(): Observable<Array<Record<string, unknown>>> {
    return this.http
      .get<ApiResponse<Array<Record<string, unknown>>>>('/v1/analytics/offer-comparison')
      .pipe(map((response) => response.data));
  }

  followUps(status?: string): Observable<FollowUpTask[]> {
    const params = status ? new HttpParams().set('status', status) : undefined;
    return this.http
      .get<ApiResponse<FollowUpTask[]>>('/v1/follow-ups', { params })
      .pipe(map((response) => response.data));
  }

  completeFollowUp(id: string): Observable<FollowUpTask> {
    return this.http
      .post<ApiResponse<FollowUpTask>>(`/v1/follow-ups/${id}/complete`, {})
      .pipe(map((response) => response.data));
  }

  dismissFollowUp(id: string): Observable<FollowUpTask> {
    return this.http
      .post<ApiResponse<FollowUpTask>>(`/v1/follow-ups/${id}/dismiss`, {})
      .pipe(map((response) => response.data));
  }

  notifications(): Observable<JobNotification[]> {
    return this.http
      .get<ApiResponse<JobNotification[]>>('/v1/notifications')
      .pipe(map((response) => response.data));
  }

  markNotificationRead(id: string): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`/v1/notifications/${id}/read`, {})
      .pipe(map(() => undefined));
  }

  markAllNotificationsRead(): Observable<void> {
    return this.http
      .post<ApiResponse<void>>('/v1/notifications/read-all', {})
      .pipe(map(() => undefined));
  }
}
