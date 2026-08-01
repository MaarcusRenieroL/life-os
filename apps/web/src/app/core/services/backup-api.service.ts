import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../models/auth.model';
import { BackupSummaryResponse } from '../models/backup.model';

@Injectable({ providedIn: 'root' })
export class BackupApiService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = '/v1/batches/backup';

  getLatest(): Observable<BackupSummaryResponse | null> {
    return this.http
      .get<ApiResponse<BackupSummaryResponse | null>>(`${this.baseUrl}/latest`)
      .pipe(map((response) => response.data));
  }

  runBackup(): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/run`, {}).pipe(map(() => undefined));
  }

  restoreBackup(): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${this.baseUrl}/restore`, {})
      .pipe(map(() => undefined));
  }
}
