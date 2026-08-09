import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../models/auth.model';
import {
  NotificationResponse,
  NotificationSettingsResponse,
  UpdateNotificationSettingsRequest,
} from '../models/job-tracker.model';

@Injectable({ providedIn: 'root' })
export class NotificationApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/v1/jobs/notifications';

  getNotifications(): Observable<NotificationResponse[]> {
    return this.http
      .get<ApiResponse<NotificationResponse[]>>(this.baseUrl)
      .pipe(map((response) => response.data));
  }

  markAsRead(id: string): Observable<NotificationResponse> {
    return this.http
      .post<ApiResponse<NotificationResponse>>(`${this.baseUrl}/${id}/read`, {})
      .pipe(map((response) => response.data));
  }

  getSettings(): Observable<NotificationSettingsResponse> {
    return this.http
      .get<ApiResponse<NotificationSettingsResponse>>(`${this.baseUrl}/settings`)
      .pipe(map((response) => response.data));
  }

  updateSettings(request: UpdateNotificationSettingsRequest): Observable<NotificationSettingsResponse> {
    return this.http
      .put<ApiResponse<NotificationSettingsResponse>>(`${this.baseUrl}/settings`, request)
      .pipe(map((response) => response.data));
  }
}
