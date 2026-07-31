import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../models/auth.model';

export interface GmailConnectionStatus {
  connected: boolean;
  connectedAt: string | null;
  lastRefreshedAt: string | null;
}

export interface StatementImportResult {
  rowsParsed: number;
  rowsImported: number;
}

@Injectable({ providedIn: 'root' })
export class FinanceImportApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/v1/batches/finance';
  private readonly gmailBaseUrl = '/v1/batches/gmail';

  importStatement(file: File, accountId: string, password?: string): Observable<StatementImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('accountId', accountId);
    if (password) formData.append('password', password);
    return this.http
      .post<ApiResponse<StatementImportResult>>(`${this.baseUrl}/import-statement`, formData)
      .pipe(map((response) => response.data));
  }

  getGmailStatus(): Observable<GmailConnectionStatus> {
    return this.http
      .get<ApiResponse<GmailConnectionStatus>>(`${this.gmailBaseUrl}/status`)
      .pipe(map((response) => response.data));
  }

  gmailConnectUrl(): string {
    return '/v1/batches/gmail/connect';
  }

  syncAllGmailHistory(): Observable<number> {
    return this.http
      .post<ApiResponse<number>>(`${this.gmailBaseUrl}/sync-all`, {})
      .pipe(map((response) => response.data));
  }
}
