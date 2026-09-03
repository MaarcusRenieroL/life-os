import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../models/auth.model';
import {
  CategorizationRuleResponse,
  CreateCategorizationRuleRequest,
  UpdateCategorizationRuleRequest,
} from '../models/finance.model';

@Injectable({ providedIn: 'root' })
export class FinanceRuleApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/v1/finance/categorization-rules';

  getRules(): Observable<CategorizationRuleResponse[]> {
    return this.http
      .get<ApiResponse<CategorizationRuleResponse[]>>(this.baseUrl)
      .pipe(map((response) => response.data));
  }

  createRule(request: CreateCategorizationRuleRequest): Observable<CategorizationRuleResponse> {
    return this.http
      .post<ApiResponse<CategorizationRuleResponse>>(this.baseUrl, request)
      .pipe(map((response) => response.data));
  }

  updateRule(id: string, request: UpdateCategorizationRuleRequest): Observable<CategorizationRuleResponse> {
    return this.http
      .put<ApiResponse<CategorizationRuleResponse>>(`${this.baseUrl}/${id}`, request)
      .pipe(map((response) => response.data));
  }

  deleteRule(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`).pipe(map(() => undefined));
  }
}
