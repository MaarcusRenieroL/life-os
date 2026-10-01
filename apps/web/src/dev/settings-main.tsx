import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import '@/index.css';

import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/features/auth/auth-context';
import { AccountDialog } from '@/features/finance/account-dialog';
import { AddTransactionDialog } from '@/features/finance/add-transaction-dialog';
import { AccountsPage } from '@/features/finance/accounts-page';
import { TransactionsPage } from '@/features/finance/transactions-page';
import { AttachLinkDialog } from '@/features/job-tracker/attach-link-dialog';
import { FinanceDashboardPage } from '@/features/finance/dashboard-page';
import { TransferDialog } from '@/features/finance/transfer-dialog';
import { ModuleSetupPage, SetupPage } from '@/features/setup/setup-page';
import { SettingsPage } from '@/features/settings/settings-page';
import { api } from '@/lib/api-client';
import { tokenStore } from '@/lib/token';

// Entry for settings-preview.html: the real Settings page against canned API answers, so the look
// can be reviewed without a login or a backend. Not part of the production build.
tokenStore.setTokens('preview', 'preview', 'preview');

const days = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
const acct = (id: string, accountName: string, accountType: string, bankName: string | null, balance: number, isPrimary = false, isActive = true) => ({
  id, accountName, accountType, bankName, accountNumberLastFour: id.padStart(4, '0').slice(-4), currencyCode: 'INR', openedDate: days(400),
  currentBalance: balance, isActive, isPrimary, emailForAlerts: null, notes: null, createdAt: days(400), updatedAt: days(1),
});
const merchants = ['Swiggy', 'Amazon', 'Uber', 'Netflix', 'HDFC Credit Card bill', 'Salary', 'Zomato', 'Electricity', 'Rent', 'BookMyShow'];
const txs = Array.from({ length: 64 }, (_, i) => {
  const m = merchants[i % merchants.length];
  const credit = m === 'Salary';
  return {
    id: `t${i}`, accountId: i % 3 === 0 ? '1043' : '2277', transactionDate: days(i * 1.7), description: `${m} ${i % 7 === 0 ? 'Bangalore' : ''}`.trim(),
    amount: credit ? 125000 : 200 + ((i * 937) % 4800), type: credit ? 'CREDIT' : 'DEBIT', categoryId: i % 4 === 0 ? null : 'c1', categoryManuallySet: false,
    categoryIds: i % 4 === 0 ? [] : ['c1'], notes: i % 9 === 0 ? 'check this' : null, receiptUrl: null, disputeReason: null, disputeDate: null, isRecurring: i % 5 === 0,
    sourceType: i % 2 ? 'EMAIL_ALERT' : 'CSV_IMPORT', sourceReference: null, isReconciled: i % 6 === 0, isDuplicate: i === 11, duplicateOf: null, status: 'ACTIVE',
    importedAt: days(i), createdAt: days(i), updatedAt: days(i),
  };
});
const answers: Record<string, unknown> = {
  '/v1/finance/analytics/overview': {
    cycleStart: '2026-09-30', cycleEnd: '2026-10-29', payCycleStartDay: 1, daysLeft: 19, incomeSoFar: 125000, expectedIncome: 125000, spentSoFar: 38200,
    upcomingBills: 5400, safeToSpend: 81400, safeToSpendPerDay: 4284.21, netWorth: 141949.75, suggestedPayCycleStartDay: 30,
  },
  '/v1/finance/analytics/dashboard': { totalIncome: 125000, totalExpenses: 38200, savings: 86800, fixedMonthlyIncome: 125000 },
  '/v1/finance/import-failures': [
    { id: 'f1', source: 'EMAIL_ALERT', reason: 'NO_ACCOUNT', reference: 'm1', sender: null, subject: null, snippet: null, detail: 'No SAVINGS account found for bank: HDFC Bank', bankName: 'HDFC Bank', accountType: 'SAVINGS', amount: 125000, type: 'CREDIT', transactionDate: days(1), description: 'Credit via NEFT', createdAt: days(1) },
    { id: 'f2', source: 'EMAIL_ALERT', reason: 'UNPARSED', reference: 'm2', sender: 'alerts@hdfcbank.bank.in', subject: 'Rs. 4,200 debited from A/c XX2277', snippet: 'Dear Customer, Rs. 4,200.00 has been debited from your account towards ...', detail: null, bankName: null, accountType: null, amount: null, type: null, transactionDate: null, description: null, createdAt: days(2) },
  ],
  '/v1/finance/transactions': { content: txs, totalElements: txs.length, totalPages: 1, size: 500, number: 0, numberOfElements: txs.length, first: true, last: true },
  '/v1/finance/categories': [{ id: 'c1', name: 'Food & dining', type: 'EXPENSE', color: '#3ddc97', icon: null, parentCategoryId: null, isActive: true, excludeFromAutoLearning: false, displayOrder: 1, createdAt: days(100) }],
  '/v1/finance/accounts': [
    acct('2277', 'HDFC Savings', 'SAVINGS', 'HDFC Bank', 184250.5, true),
    acct('1043', 'Canara Savings', 'SAVINGS', 'Canara Bank', 12480),
    acct('9911', 'HDFC Regalia', 'CREDIT_CARD', 'HDFC Bank', -42300.75),
    acct('5520', 'Zerodha', 'INVESTMENT', 'Zerodha', 560000),
    acct('0001', 'Wallet', 'CASH', null, 2300, false, false),
  ],
  '/v1/auth/me': { id: 'u1', email: 'maarcusreniero.l@gmail.com', name: 'Maarcus Reniero L', hasAvatar: false },
  '/v1/core/modules': [{ moduleCode: 'WK', enabled: false }],
  '/v1/core/settings': [{ module: 'finance', key: 'budget-alert-threshold', value: '0.9' }],
  '/v1/batches/gmail/status': {
    connected: true, connectedAt: days(14), lastRefreshedAt: days(0), email: 'maarcusreniero@gmail.com',
    mailboxes: [{ purpose: 'FINANCE', email: 'maarcusreniero@gmail.com', connectedAt: days(14), lastRefreshedAt: days(0) }],
  },
};

api.defaults.adapter = async (config) => {
  const path = (config.url ?? '').split('?')[0];
  if (path.endsWith('/link')) {
    const body = JSON.parse(String(config.data ?? '{}')) as { url?: string; jobDescriptionText?: string };
    if (!body.jobDescriptionText) {
      // LinkedIn blocks server-side reads: the real API answers 422 and the UI asks for the description.
      return Promise.reject({ response: { status: 422, data: { message: 'That site blocked the read - paste the job description below.' } } });
    }
    return { data: { success: true, message: 'ok', data: { id: 'j1', title: 'Back End Developer', company: 'Meetswap', jobDescriptionText: body.jobDescriptionText, fitScore: 82 }, timestamp: '' }, status: 200, statusText: 'OK', headers: {}, config };
  }
  const data = path in answers ? { success: true, message: 'ok', data: answers[path], timestamp: '' } : { success: true, message: 'ok', data: [], timestamp: '' };
  return { data, status: 200, statusText: 'OK', headers: {}, config };
};

// ?dialog=account | transaction renders that form dialog open, for reviewing form spacing.
const dialog = new URLSearchParams(location.search).get('dialog');
const table = new URLSearchParams(location.search).get('table');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[table === 'module-setup' ? '/setup/FN' : '/']}>
        <TooltipProvider>
          <AuthProvider>
            <div className="dark hud-bg min-h-screen bg-background p-6 text-foreground">
              <div className="mx-auto max-w-6xl">
                {table === 'module-setup' ? (
                  <Routes><Route path="/setup/:code" element={<ModuleSetupPage />} /></Routes>
                ) : dialog === 'account' ? (
                  <AccountDialog open onOpenChange={() => {}} editing={null} onSaved={() => {}} />
                ) : dialog === 'transaction' ? (
                  <AddTransactionDialog open onOpenChange={() => {}} editing={null} onSaved={() => {}} />
                ) : dialog === 'transfer' ? (
                  <TransferDialog open onOpenChange={() => {}} onSaved={() => {}} />
                ) : table === 'setup' ? (
                  <SetupPage />
                ) : table === 'finance-dashboard' ? (
                  <FinanceDashboardPage />
                ) : dialog === 'attach' ? (
                  <AttachLinkDialog job={{ id: 'j1', title: 'Back End Developer', company: 'Meetswap' }} open onOpenChange={() => {}} onAttached={() => document.title = 'attached'} />
                ) : table === 'transactions' ? (
                  <TransactionsPage />
                ) : table === 'accounts' ? (
                  <AccountsPage />
                ) : (
                  <SettingsPage />
                )}
              </div>
            </div>
          </AuthProvider>
        </TooltipProvider>
      </MemoryRouter>
    </QueryClientProvider>
  </StrictMode>,
);
