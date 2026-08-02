import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../models/auth.model';
import {
  CategoryComparison,
  DashboardSummary,
  MerchantSpend,
  MonthlyTrend,
} from '../models/finance.model';

@Injectable({ providedIn: 'root' })
export class FinanceAnalyticsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/v1/finance/analytics';

  getDashboardSummary(): Observable<DashboardSummary> {
    return this.http
      .get<ApiResponse<DashboardSummary>>(`${this.baseUrl}/dashboard`)
      .pipe(map((response) => response.data));
  }

  getCategoryComparison(categoryId: string): Observable<CategoryComparison> {
    return this.http
      .get<ApiResponse<CategoryComparison>>(`${this.baseUrl}/category/${categoryId}`)
      .pipe(map((response) => response.data));
  }

  getTrends(): Observable<MonthlyTrend[]> {
    return this.http
      .get<ApiResponse<MonthlyTrend[]>>(`${this.baseUrl}/trends`)
      .pipe(map((response) => response.data));
  }

  getTopMerchants(limit = 10): Observable<MerchantSpend[]> {
    const params = new HttpParams().set('limit', limit);
    return this.http
      .get<ApiResponse<MerchantSpend[]>>(`${this.baseUrl}/merchants`, { params })
      .pipe(map((response) => response.data));
  }

  updateMonthlyIncome(monthlyIncome: number): Observable<DashboardSummary> {
    return this.http
      .put<ApiResponse<DashboardSummary>>(`${this.baseUrl}/monthly-income`, { monthlyIncome })
      .pipe(map((response) => response.data));
  }
}
