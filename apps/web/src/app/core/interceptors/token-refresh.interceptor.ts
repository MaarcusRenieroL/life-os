import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Subject, catchError, switchMap, take, throwError } from 'rxjs';
import { AuthApiService } from '../services/auth-api.service';
import { TokenService } from '../services/token.service';
import { Router } from '@angular/router';

let isRefreshing = false;
// A fresh Subject per refresh cycle (recreated below) — unlike a BehaviorSubject,
// this can propagate BOTH the new token (next) and a failed refresh (error) to
// every request that's waiting on it, so a failed refresh doesn't leave other
// concurrent requests hanging forever with no response.
let refreshSubject = new Subject<string>();

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
        refreshSubject = new Subject<string>();

        return authApi.refresh().pipe(
          switchMap((newAuth) => {
            isRefreshing = false;
            refreshSubject.next(newAuth.accessToken);
            refreshSubject.complete();

            return next(attachToken(request, newAuth.accessToken));
          }),
          catchError((refreshError) => {
            isRefreshing = false;
            tokenService.clear();
            // Propagate the failure to every request currently waiting below,
            // instead of leaving them subscribed to an observable that never
            // emits again — without this they'd hang indefinitely.
            refreshSubject.error(refreshError);

            router.navigateByUrl('/login');

            return throwError(() => refreshError);
          }),
        );
      } else {
        return refreshSubject.pipe(
          take(1),
          switchMap((token) => next(attachToken(request, token))),
        );
      }
    }),
  );
};
