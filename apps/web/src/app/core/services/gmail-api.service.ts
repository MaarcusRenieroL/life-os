import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../models/auth.model';

export interface GmailConnectionStatus {
  connected: boolean;
  connectedAt: string | null;
  lastRefreshedAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class GmailApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/v1/batches/gmail';

  /** Full-page navigation target (OAuth redirect to Google) - not an HttpClient call. */
  readonly connectUrl = `${this.base}/connect`;

  status(): Observable<GmailConnectionStatus> {
    return this.http.get<ApiResponse<GmailConnectionStatus>>(`${this.base}/status`).pipe(map((r) => r.data));
  }

  syncRecentJobEmails(): Observable<number> {
    return this.http.post<ApiResponse<number>>(`${this.base}/jobs/sync-recent`, {}).pipe(map((r) => r.data));
  }

  syncAllJobEmails(): Observable<number> {
    return this.http.post<ApiResponse<number>>(`${this.base}/jobs/sync-all`, {}).pipe(map((r) => r.data));
  }
}
