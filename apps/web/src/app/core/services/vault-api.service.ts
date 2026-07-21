import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../models/auth.model';
import {
  BulkImportResult,
  HealthSummary,
  MasterPasswordRequest,
  RecoveryCodeStatus,
  RecoveryCodesResponse,
  VaultEntryDetail,
  VaultEntrySummary,
  VaultEntryWriteRequest,
  VaultExport,
  VaultStatus,
} from '../models/vault.model';

@Injectable({ providedIn: 'root' })
export class VaultApiService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = '/v1/vault';

  getStatus(): Observable<VaultStatus> {
    return this.http
      .get<ApiResponse<VaultStatus>>(`${this.baseUrl}/status`)
      .pipe(map((response) => response.data));
  }

  setup(request: MasterPasswordRequest): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${this.baseUrl}/setup`, request)
      .pipe(map(() => undefined));
  }

  verify(request: MasterPasswordRequest): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${this.baseUrl}/verify`, request)
      .pipe(map(() => undefined));
  }

  getEntries(): Observable<VaultEntrySummary[]> {
    return this.http
      .get<ApiResponse<VaultEntrySummary[]>>(`${this.baseUrl}/entries`)
      .pipe(map((response) => response.data));
  }

  getEntry(id: string): Observable<VaultEntryDetail> {
    return this.http
      .get<ApiResponse<VaultEntryDetail>>(`${this.baseUrl}/entry/${id}`)
      .pipe(map((response) => response.data));
  }

  createEntry(request: VaultEntryWriteRequest): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${this.baseUrl}/entry`, request)
      .pipe(map(() => undefined));
  }

  updateEntry(id: string, request: VaultEntryWriteRequest): Observable<void> {
    return this.http
      .put<ApiResponse<void>>(`${this.baseUrl}/entry/${id}`, request)
      .pipe(map(() => undefined));
  }

  deleteEntry(id: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/entry/${id}`)
      .pipe(map(() => undefined));
  }

  getHealthSummary(): Observable<HealthSummary> {
    return this.http
      .get<ApiResponse<HealthSummary>>(`${this.baseUrl}/health/summary`)
      .pipe(map((response) => response.data));
  }

  changeMasterPassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${this.baseUrl}/master-password/change`, {
        currentPassword,
        newPassword,
      })
      .pipe(map(() => undefined));
  }

  generateRecoveryCodes(currentPassword: string): Observable<RecoveryCodesResponse> {
    return this.http
      .post<ApiResponse<RecoveryCodesResponse>>(`${this.baseUrl}/recovery-codes/generate`, {
        currentPassword,
      })
      .pipe(map((response) => response.data));
  }

  listRecoveryCodes(): Observable<RecoveryCodeStatus[]> {
    return this.http
      .get<ApiResponse<RecoveryCodeStatus[]>>(`${this.baseUrl}/recovery-codes`)
      .pipe(map((response) => response.data));
  }

  resetWithRecoveryCode(code: string, newMasterPassword: string): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${this.baseUrl}/recovery-codes/reset`, {
        code,
        newMasterPassword,
      })
      .pipe(map(() => undefined));
  }

  exportVault(): Observable<VaultExport> {
    return this.http
      .get<ApiResponse<VaultExport>>(`${this.baseUrl}/export`)
      .pipe(map((response) => response.data));
  }

  bulkCreateEntries(entries: VaultEntryWriteRequest[]): Observable<BulkImportResult> {
    return this.http
      .post<ApiResponse<BulkImportResult>>(`${this.baseUrl}/entries/bulk`, { entries })
      .pipe(map((response) => response.data));
  }

  deleteAccount(): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/account`)
      .pipe(map(() => undefined));
  }
}
