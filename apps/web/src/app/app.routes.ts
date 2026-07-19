import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { vaultUnlockGuard } from './core/guards/vault-unlock.guard';
import { AppShell } from './core/layout/app-shell/app-shell';
import { Login } from './features/auth/login/login';
import { Home } from './features/home/home';
import { VaultUnlock } from './features/vault/vault-unlock/vault-unlock';
import { VaultEntryList } from './features/vault/vault-entry-list/vault-entry-list';
import { VaultEntryForm } from './features/vault/vault-entry-form/vault-entry-form';

export const routes: Routes = [
  { path: 'login', component: Login },
  {
    path: '',
    component: AppShell,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: Home, data: { module: 'home' } },
      { path: 'vault', component: VaultUnlock, data: { module: 'password-manager' } },
      {
        path: 'vault/entries',
        component: VaultEntryList,
        data: { module: 'password-manager', tab: 'vault' },
      },
      {
        path: 'vault/entry/:id',
        component: VaultEntryForm,
        canActivate: [vaultUnlockGuard],
        data: { module: 'password-manager', tab: 'vault' },
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
