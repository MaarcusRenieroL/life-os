import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';

import { ApiResponse, AuthResponse, DeviceSession, LoginRequest } from '../models/auth.model';
import { TokenService } from './token.service';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly tokenService = inject(TokenService);

  private readonly baseUrl = '/v1/auth';

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.baseUrl}/login`, request).pipe(
      map((response) => response.data),
      tap((auth) =>
        this.tokenService.setTokens(auth.accessToken, auth.refreshToken, auth.deviceSessionId),
      ),
    );
  }

  logout(): Observable<void> {
    const deviceSessionId = this.tokenService.getDeviceSessionId();

    if (!deviceSessionId) {
      return new Observable((subscriber) => subscriber.complete());
    }

    return this.http
      .post<ApiResponse<void>>(`${this.baseUrl}/logout`, { deviceSessionId })
      .pipe(map(() => undefined));
  }

  refresh(): Observable<AuthResponse> {
    return this.http
      .post<ApiResponse<AuthResponse>>(`${this.baseUrl}/refresh`, {
        refreshToken: this.tokenService.getRefreshToken(),
      })
      .pipe(
        map((response) => response.data),
        tap((auth) =>
          this.tokenService.setTokens(auth.accessToken, auth.refreshToken, auth.deviceSessionId),
        ),
      );
  }

  listSessions(): Observable<DeviceSession[]> {
    return this.http
      .get<ApiResponse<DeviceSession[]>>(`${this.baseUrl}/sessions`)
      .pipe(map((response) => response.data));
  }

  revokeSession(sessionId: string): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${this.baseUrl}/sessions/${sessionId}/revoke`, {})
      .pipe(map(() => undefined));
  }
}
