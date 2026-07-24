import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../models/auth.model';
import { ModuleSetting } from '../models/core.model';

@Injectable({ providedIn: 'root' })
export class CoreApiService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = '/v1/core';

  getModuleSettings(): Observable<ModuleSetting[]> {
    return this.http
      .get<ApiResponse<ModuleSetting[]>>(`${this.baseUrl}/modules`)
      .pipe(map((response) => response.data));
  }

  setModuleEnabled(moduleCode: string, enabled: boolean): Observable<ModuleSetting> {
    return this.http
      .put<ApiResponse<ModuleSetting>>(`${this.baseUrl}/modules/${moduleCode}`, { enabled })
      .pipe(map((response) => response.data));
  }
}
