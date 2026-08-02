import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../models/auth.model';
import {
  AccountResponse,
  CreateAccountRequest,
  ReconcileAccountRequest,
  UpdateAccountRequest,
} from '../models/finance.model';

@Injectable({ providedIn: 'root' })
export class FinanceAccountApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/v1/finance/accounts';

  getAccounts(): Observable<AccountResponse[]> {
    return this.http
      .get<ApiResponse<AccountResponse[]>>(this.baseUrl)
      .pipe(map((response) => response.data));
  }

  createAccount(request: CreateAccountRequest): Observable<AccountResponse> {
    return this.http
      .post<ApiResponse<AccountResponse>>(this.baseUrl, request)
      .pipe(map((response) => response.data));
  }

  updateAccount(id: string, request: UpdateAccountRequest): Observable<AccountResponse> {
    return this.http
      .put<ApiResponse<AccountResponse>>(`${this.baseUrl}/${id}`, request)
      .pipe(map((response) => response.data));
  }

  deleteAccount(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`).pipe(map(() => undefined));
  }

  reconcileAccount(id: string, request: ReconcileAccountRequest): Observable<AccountResponse> {
    return this.http
      .post<ApiResponse<AccountResponse>>(`${this.baseUrl}/${id}/reconcile`, request)
      .pipe(map((response) => response.data));
  }
}
