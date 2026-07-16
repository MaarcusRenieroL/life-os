import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';

import { VaultApiService } from '../services/vault-api.service';
import { VaultStateService } from '../services/vault-state.service';

export const vaultUnlockGuard: CanActivateFn = () => {
  const vaultApi = inject(VaultApiService);
  const vaultState = inject(VaultStateService);
  const router = inject(Router);

  return vaultApi.getStatus().pipe(
    map((status) => {
      vaultState.setUnlocked(status.unlocked);
      return status.unlocked ? true : router.createUrlTree(['/vault']);
    }),
    catchError(() => of(router.createUrlTree(['/vault']))),
  );
};
