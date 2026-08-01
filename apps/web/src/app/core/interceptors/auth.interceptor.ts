import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { TokenService } from '../services/token.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const accessToken = tokenService.getAccessToken();

  if (!accessToken || !req.url.startsWith('/v1/')) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${accessToken}` },
    }),
  );
};
