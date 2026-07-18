import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, catchError, switchMap, take, throwError, filter } from 'rxjs';
import { AuthApiService } from '../services/auth-api.service';
import { TokenService } from '../services/token.service';
import { Router } from '@angular/router';

let isRefreshing = false;
const refreshedToken$ = new BehaviorSubject<string | null>(null);

function attachToken(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

export const tokenRefreshInterceptor: HttpInterceptorFn = (request, next) => {
  const authApi = inject(AuthApiService);
  const tokenService = inject(TokenService);
  const router = inject(Router);

  return next(request).pipe(
    catchError((error) => {
      const isAuthFailure = error.status === 403;
      const isExemptUrl =
        request.url.includes('/auth/login') || request.url.includes('/auth/refresh');

      if (!isAuthFailure || isExemptUrl) {
        return throwError(() => error);
      }

      if (!isRefreshing) {
        isRefreshing = true;

        refreshedToken$.next(null);

        return authApi.refresh().pipe(
          switchMap((newAuth) => {
            isRefreshing = false;

            refreshedToken$.next(newAuth.accessToken);

            return next(attachToken(request, newAuth.accessToken));
          }),
          catchError((refreshError) => {
            isRefreshing = false;
            tokenService.clear();

            router.navigateByUrl('/login');

            return throwError(() => refreshError);
          }),
        );
      } else {
        return refreshedToken$.pipe(
          filter((token) => token !== null),
          take(1),
          switchMap((token) => next(attachToken(request, token))),
        );
      }
    }),
  );
};
