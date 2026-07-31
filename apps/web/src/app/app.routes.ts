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
import { FinanceDashboard } from './features/finance/dashboard/dashboard';
import { FinanceTransactions } from './features/finance/transactions/transactions';
import { FinanceSubscriptions } from './features/finance/subscriptions/subscriptions';
import { FinanceBudgets } from './features/finance/budgets/budgets';
import { FinanceAnalytics } from './features/finance/analytics/analytics';
import { FinanceImport } from './features/finance/import/import';
import { FinanceRules } from './features/finance/rules/rules';
import { FinanceReport } from './features/finance/report/report';
import { FinanceAccounts } from './features/finance/accounts/accounts';
import { FinanceCategories } from './features/finance/categories/categories';
import { FinanceMerchants } from './features/finance/merchants/merchants';
import { TransactionDetail } from './features/finance/transaction-detail/transaction-detail';

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
        path: 'finance/dashboard',
        component: FinanceDashboard,
        data: { module: 'FN', tab: 'finance' },
      },
      {
        path: 'finance/transactions',
        component: FinanceTransactions,
        data: { module: 'FN', tab: 'finance' },
      },
      {
        path: 'finance/transactions/:id',
        component: TransactionDetail,
        data: { module: 'FN', tab: 'finance' },
      },
      {
        path: 'finance/subscriptions',
        component: FinanceSubscriptions,
        data: { module: 'FN', tab: 'finance' },
      },
      {
        path: 'finance/budgets',
        component: FinanceBudgets,
        data: { module: 'FN', tab: 'finance' },
      },
      {
        path: 'finance/analytics',
        component: FinanceAnalytics,
        data: { module: 'FN', tab: 'finance' },
      },
      {
        path: 'finance/import',
        component: FinanceImport,
        data: { module: 'FN', tab: 'finance' },
      },
      {
        path: 'finance/rules',
        component: FinanceRules,
        data: { module: 'FN', tab: 'finance' },
      },
      {
        path: 'finance/report',
        component: FinanceReport,
        data: { module: 'FN', tab: 'finance' },
      },
      {
        path: 'finance/accounts',
        component: FinanceAccounts,
        data: { module: 'FN', tab: 'finance' },
      },
      {
        path: 'finance/categories',
        component: FinanceCategories,
        data: { module: 'FN', tab: 'finance' },
      },
      {
        path: 'finance/merchants',
        component: FinanceMerchants,
        data: { module: 'FN', tab: 'finance' },
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
