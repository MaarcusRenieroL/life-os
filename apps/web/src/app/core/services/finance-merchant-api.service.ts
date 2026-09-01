import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../models/auth.model';
import { CreateMerchantRequest, MerchantResponse, UpdateMerchantRequest } from '../models/finance.model';

@Injectable({ providedIn: 'root' })
export class FinanceMerchantApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/v1/finance/merchants';

  getMerchants(): Observable<MerchantResponse[]> {
    return this.http
      .get<ApiResponse<MerchantResponse[]>>(this.baseUrl)
      .pipe(map((response) => response.data));
  }

  createMerchant(request: CreateMerchantRequest): Observable<MerchantResponse> {
    return this.http
      .post<ApiResponse<MerchantResponse>>(this.baseUrl, request)
      .pipe(map((response) => response.data));
  }

  updateMerchant(id: string, request: UpdateMerchantRequest): Observable<MerchantResponse> {
    return this.http
      .put<ApiResponse<MerchantResponse>>(`${this.baseUrl}/${id}`, request)
      .pipe(map((response) => response.data));
  }

  deleteMerchant(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`).pipe(map(() => undefined));
  }
}
