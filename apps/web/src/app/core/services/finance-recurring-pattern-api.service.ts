import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../models/auth.model';
import { RecurringPatternResponse } from '../models/finance.model';

@Injectable({ providedIn: 'root' })
export class FinanceRecurringPatternApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/v1/finance/recurring-patterns';

  getPatterns(): Observable<RecurringPatternResponse[]> {
    return this.http
      .get<ApiResponse<RecurringPatternResponse[]>>(this.baseUrl)
      .pipe(map((response) => response.data));
  }

  updateCategory(id: string, categoryId: string): Observable<RecurringPatternResponse> {
    return this.http
      .put<ApiResponse<RecurringPatternResponse>>(`${this.baseUrl}/${id}`, { categoryId })
      .pipe(map((response) => response.data));
  }

  dismiss(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`).pipe(map(() => undefined));
  }
}
