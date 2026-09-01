import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { vaultUnlockGuard } from './core/guards/vault-unlock.guard';
import { AppShell } from './core/layout/app-shell/app-shell';
import { Login } from './features/auth/login/login';
import { Home } from './features/home/home';
import { VaultUnlock } from './features/vault/vault-unlock/vault-unlock';
import { VaultEntryList } from './features/vault/vault-entry-list/vault-entry-list';
import { VaultHealth } from './features/vault/vault-health/vault-health';
import { CardList } from './features/cards/card-list/card-list';
import { SecurityPage } from './features/security/security-page/security-page';
import { AuditLogPage } from './features/audit-log/audit-log/audit-log';
import { DataManagementPage } from './features/data-management/data-management/data-management';
import { GlobalSettings } from './features/global-settings/global-settings/global-settings';

export const routes: Routes = [
  { path: 'login', component: Login },
  {
    path: '',
    component: AppShell,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: Home, data: { module: 'home' } },
      { path: 'settings', component: GlobalSettings, data: { module: 'home' } },
      { path: 'vault', component: VaultUnlock, data: { module: 'PM' } },
      {
        path: 'vault/entries',
        component: VaultEntryList,
        canActivate: [vaultUnlockGuard],
        data: { module: 'PM', tab: 'vault' },
      },
      {
        path: 'vault/health',
        component: VaultHealth,
        canActivate: [vaultUnlockGuard],
        data: { module: 'PM', tab: 'vault' },
      },
      {
        path: 'vault/cards',
        component: CardList,
        canActivate: [vaultUnlockGuard],
        data: { module: 'PM', tab: 'vault' },
      },
      {
        path: 'vault/security',
        component: SecurityPage,
        canActivate: [vaultUnlockGuard],
        data: { module: 'PM', tab: 'vault' },
      },
      {
        path: 'vault/audit-log',
        component: AuditLogPage,
        canActivate: [vaultUnlockGuard],
        data: { module: 'PM', tab: 'vault' },
      },
      {
        path: 'vault/data',
        component: DataManagementPage,
        canActivate: [vaultUnlockGuard],
        data: { module: 'PM', tab: 'vault' },
      },
      {
        path: 'notes',
        loadComponent: () => import('./features/notes/notes-list/notes-list').then((m) => m.NotesList),
        data: { module: 'NT', tab: 'notes' },
      },
      {
        path: 'notes/search',
        loadComponent: () => import('./features/notes/note-search/note-search').then((m) => m.NoteSearch),
        data: { module: 'NT', tab: 'notes/search' },
      },
      {
        path: 'notes/templates',
        loadComponent: () =>
          import('./features/notes/note-templates/note-templates').then((m) => m.NoteTemplates),
        data: { module: 'NT', tab: 'notes/templates' },
      },
      {
        path: 'notes/attachments',
        loadComponent: () =>
          import('./features/notes/notes-attachments/notes-attachments').then((m) => m.NotesAttachments),
        data: { module: 'NT', tab: 'notes/attachments' },
      },
      {
        path: 'notes/graph',
        loadComponent: () => import('./features/notes/notes-graph/notes-graph').then((m) => m.NotesGraph),
        data: { module: 'NT', tab: 'notes/graph' },
      },
      {
        path: 'notes/settings',
        loadComponent: () =>
          import('./features/notes/notes-settings/notes-settings').then((m) => m.NotesSettings),
        data: { module: 'NT', tab: 'notes/settings' },
      },
      {
        path: 'notes/:id',
        loadComponent: () => import('./features/notes/note-editor/note-editor').then((m) => m.NoteEditorPage),
        data: { module: 'NT', tab: 'notes' },
      },
      {
        path: 'finance/dashboard',
        loadComponent: () => import('./features/finance/dashboard/dashboard').then((m) => m.FinanceDashboard),
        data: { module: 'FN', tab: 'finance' },
      },
      {
        path: 'finance/transactions',
        loadComponent: () =>
          import('./features/finance/transactions/transactions').then((m) => m.FinanceTransactions),
        data: { module: 'FN', tab: 'finance' },
      },
      {
        path: 'finance/transactions/:id',
        loadComponent: () =>
          import('./features/finance/transaction-detail/transaction-detail').then((m) => m.TransactionDetail),
        data: { module: 'FN', tab: 'finance' },
      },
      {
        path: 'finance/subscriptions',
        loadComponent: () =>
          import('./features/finance/subscriptions/subscriptions').then((m) => m.FinanceSubscriptions),
        data: { module: 'FN', tab: 'finance' },
      },
      {
        path: 'finance/budgets',
        loadComponent: () => import('./features/finance/budgets/budgets').then((m) => m.FinanceBudgets),
        data: { module: 'FN', tab: 'finance' },
      },
      {
        path: 'finance/analytics',
        loadComponent: () => import('./features/finance/analytics/analytics').then((m) => m.FinanceAnalytics),
        data: { module: 'FN', tab: 'finance' },
      },
      {
        path: 'finance/import',
        loadComponent: () => import('./features/finance/import/import').then((m) => m.FinanceImport),
        data: { module: 'FN', tab: 'finance' },
      },
      {
        path: 'finance/rules',
        loadComponent: () => import('./features/finance/rules/rules').then((m) => m.FinanceRules),
        data: { module: 'FN', tab: 'finance' },
      },
      {
        path: 'finance/report',
        loadComponent: () => import('./features/finance/report/report').then((m) => m.FinanceReport),
        data: { module: 'FN', tab: 'finance' },
      },
      {
        path: 'finance/accounts',
        loadComponent: () => import('./features/finance/accounts/accounts').then((m) => m.FinanceAccounts),
        data: { module: 'FN', tab: 'finance' },
      },
      {
        path: 'finance/categories',
        loadComponent: () => import('./features/finance/categories/categories').then((m) => m.FinanceCategories),
        data: { module: 'FN', tab: 'finance' },
      },
      {
        path: 'finance/merchants',
        loadComponent: () => import('./features/finance/merchants/merchants').then((m) => m.FinanceMerchants),
        data: { module: 'FN', tab: 'finance' },
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
