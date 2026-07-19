import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { vaultUnlockGuard } from './core/guards/vault-unlock.guard';
import { AppShell } from './core/layout/app-shell/app-shell';
import { Login } from './features/auth/login/login';
import { Home } from './features/home/home';
import { VaultUnlock } from './features/vault/vault-unlock/vault-unlock';
import { VaultEntryList } from './features/vault/vault-entry-list/vault-entry-list';
import { VaultEntryForm } from './features/vault/vault-entry-form/vault-entry-form';
import { VaultHealth } from './features/vault/vault-health/vault-health';
import { CardList } from './features/cards/card-list/card-list';
import { SecurityPage } from './features/security/security-page/security-page';
import { AuditLogPage } from './features/audit-log/audit-log/audit-log';

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
      {
        path: 'vault/health',
        component: VaultHealth,
        data: { module: 'password-manager', tab: 'vault' },
      },
      {
        path: 'vault/cards',
        component: CardList,
        data: { module: 'password-manager', tab: 'vault' },
      },
      {
        path: 'vault/security',
        component: SecurityPage,
        data: { module: 'password-manager', tab: 'vault' },
      },
      {
        path: 'vault/audit-log',
        component: AuditLogPage,
        data: { module: 'password-manager', tab: 'vault' },
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
