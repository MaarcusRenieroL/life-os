import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { vaultUnlockGuard } from './core/guards/vault-unlock.guard';
import { Login } from './features/auth/login/login';
import { Home } from './features/home/home';
import { VaultUnlock } from './features/vault/vault-unlock/vault-unlock';
import { VaultEntryList } from './features/vault/vault-entry-list/vault-entry-list';
import { VaultEntryForm } from './features/vault/vault-entry-form/vault-entry-form';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'home', component: Home, canActivate: [authGuard] },
  { path: 'vault', component: VaultUnlock, canActivate: [authGuard] },
  { path: 'vault/entries', component: VaultEntryList, canActivate: [authGuard] },
  {
    path: 'vault/entry/:id',
    component: VaultEntryForm,
    canActivate: [authGuard, vaultUnlockGuard],
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
