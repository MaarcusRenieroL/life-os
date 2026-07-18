import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../models/auth.model';
import { VaultCategory, VaultCategoryWriteRequest } from '../models/vault.model';

@Injectable({ providedIn: 'root' })
export class VaultCategoryApiService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = '/v1/vault/categories';

  getCategories(): Observable<VaultCategory[]> {
    return this.http
      .get<ApiResponse<VaultCategory[]>>(this.baseUrl)
      .pipe(map((response) => response.data));
  }

  getCategory(id: string): Observable<VaultCategory> {
    return this.http
      .get<ApiResponse<VaultCategory>>(`${this.baseUrl}/${id}`)
      .pipe(map((response) => response.data));
  }

  createCategory(request: VaultCategoryWriteRequest): Observable<VaultCategory> {
    return this.http
      .post<ApiResponse<VaultCategory>>(this.baseUrl, request)
      .pipe(map((response) => response.data));
  }

  updateCategory(id: string, request: VaultCategoryWriteRequest): Observable<VaultCategory> {
    return this.http
      .put<ApiResponse<VaultCategory>>(`${this.baseUrl}/${id}`, request)
      .pipe(map((response) => response.data));
  }

  deleteCategory(id: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/${id}`)
      .pipe(map(() => undefined));
  }
}
