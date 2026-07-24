import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../models/auth.model';
import { AuditEventResponse } from '../models/audit-event.model';

@Injectable({ providedIn: 'root' })
export class AuditLogApiService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = '/v1/batches/audit-events';

  getEvents(): Observable<AuditEventResponse[]> {
    return this.http
      .get<ApiResponse<AuditEventResponse[]>>(this.baseUrl)
      .pipe(map((response) => response.data));
  }
}
