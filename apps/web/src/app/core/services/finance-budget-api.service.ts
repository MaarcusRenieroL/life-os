import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../models/auth.model';
import { BudgetResponse, CreateBudgetRequest, UpdateBudgetRequest } from '../models/finance.model';

@Injectable({ providedIn: 'root' })
export class FinanceBudgetApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/v1/finance/budgets';

  getBudgets(): Observable<BudgetResponse[]> {
    return this.http
      .get<ApiResponse<BudgetResponse[]>>(this.baseUrl)
      .pipe(map((response) => response.data));
  }

  createBudget(request: CreateBudgetRequest): Observable<BudgetResponse> {
    return this.http
      .post<ApiResponse<BudgetResponse>>(this.baseUrl, request)
      .pipe(map((response) => response.data));
  }

  updateBudget(id: string, request: UpdateBudgetRequest): Observable<BudgetResponse> {
    return this.http
      .put<ApiResponse<BudgetResponse>>(`${this.baseUrl}/${id}`, request)
      .pipe(map((response) => response.data));
  }

  deleteBudget(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`).pipe(map(() => undefined));
  }
}
