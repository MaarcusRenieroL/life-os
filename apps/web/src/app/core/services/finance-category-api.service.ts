import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../models/auth.model';
import { CategoryResponse, CreateCategoryRequest, UpdateCategoryRequest } from '../models/finance.model';

@Injectable({ providedIn: 'root' })
export class FinanceCategoryApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/v1/finance/categories';

  getCategories(): Observable<CategoryResponse[]> {
    return this.http
      .get<ApiResponse<CategoryResponse[]>>(this.baseUrl)
      .pipe(map((response) => response.data));
  }

  createCategory(request: CreateCategoryRequest): Observable<CategoryResponse> {
    return this.http
      .post<ApiResponse<CategoryResponse>>(this.baseUrl, request)
      .pipe(map((response) => response.data));
  }

  updateCategory(id: string, request: UpdateCategoryRequest): Observable<CategoryResponse> {
    return this.http
      .put<ApiResponse<CategoryResponse>>(`${this.baseUrl}/${id}`, request)
      .pipe(map((response) => response.data));
  }

  deleteCategory(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`).pipe(map(() => undefined));
  }
}
