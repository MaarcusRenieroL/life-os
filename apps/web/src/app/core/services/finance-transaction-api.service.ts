import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../models/auth.model';
import {
  CategorizeTransactionRequest,
  CreateTransactionRequest,
  DisputeTransactionRequest,
  MergeTransactionsRequest,
  SpringPage,
  TransactionResponse,
  UpdateTransactionCategoriesRequest,
  UpdateTransactionRequest,
} from '../models/finance.model';

@Injectable({ providedIn: 'root' })
export class FinanceTransactionApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/v1/finance/transactions';

  getTransactions(page = 0, size = 50): Observable<SpringPage<TransactionResponse>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http
      .get<ApiResponse<SpringPage<TransactionResponse>>>(this.baseUrl, { params })
      .pipe(map((response) => response.data));
  }

  getTransaction(id: string): Observable<TransactionResponse> {
    return this.http
      .get<ApiResponse<TransactionResponse>>(`${this.baseUrl}/${id}`)
      .pipe(map((response) => response.data));
  }

  createTransaction(request: CreateTransactionRequest): Observable<TransactionResponse> {
    return this.http
      .post<ApiResponse<TransactionResponse>>(this.baseUrl, request)
      .pipe(map((response) => response.data));
  }

  updateTransaction(id: string, request: UpdateTransactionRequest): Observable<TransactionResponse> {
    return this.http
      .put<ApiResponse<TransactionResponse>>(`${this.baseUrl}/${id}`, request)
      .pipe(map((response) => response.data));
  }

  deleteTransaction(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`).pipe(map(() => undefined));
  }

  categorize(id: string, request: CategorizeTransactionRequest): Observable<TransactionResponse> {
    return this.http
      .put<ApiResponse<TransactionResponse>>(`${this.baseUrl}/${id}/categorize`, request)
      .pipe(map((response) => response.data));
  }

  rename(id: string, correctedName: string): Observable<TransactionResponse> {
    return this.http
      .put<ApiResponse<TransactionResponse>>(`${this.baseUrl}/${id}/rename`, { correctedName })
      .pipe(map((response) => response.data));
  }

  merge(id: string, request: MergeTransactionsRequest): Observable<TransactionResponse> {
    return this.http
      .put<ApiResponse<TransactionResponse>>(`${this.baseUrl}/${id}/merge`, request)
      .pipe(map((response) => response.data));
  }

  dispute(id: string, request: DisputeTransactionRequest): Observable<TransactionResponse> {
    return this.http
      .put<ApiResponse<TransactionResponse>>(`${this.baseUrl}/${id}/dispute`, request)
      .pipe(map((response) => response.data));
  }

  updateCategories(id: string, request: UpdateTransactionCategoriesRequest): Observable<TransactionResponse> {
    return this.http
      .put<ApiResponse<TransactionResponse>>(`${this.baseUrl}/${id}/categories`, request)
      .pipe(map((response) => response.data));
  }
}
