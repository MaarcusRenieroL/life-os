import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';

import '@/index.css';

import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/features/auth/auth-context';
import { AccountDialog } from '@/features/finance/account-dialog';
import { AddTransactionDialog } from '@/features/finance/add-transaction-dialog';
import { SettingsPage } from '@/features/settings/settings-page';
import { api } from '@/lib/api-client';
import { tokenStore } from '@/lib/token';

// Entry for settings-preview.html: the real Settings page against canned API answers, so the look
// can be reviewed without a login or a backend. Not part of the production build.
tokenStore.setTokens('preview', 'preview', 'preview');

const days = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
const answers: Record<string, unknown> = {
  '/v1/auth/me': { id: 'u1', email: 'maarcusreniero.l@gmail.com', name: 'Maarcus Reniero L', hasAvatar: false },
  '/v1/core/modules': [{ moduleCode: 'FINANCE', enabled: false }],
  '/v1/core/settings': [{ module: 'finance', key: 'budget-alert-threshold', value: '0.9' }],
  '/v1/batches/gmail/status': {
    connected: true, connectedAt: days(14), lastRefreshedAt: days(0), email: 'maarcusreniero@gmail.com',
    mailboxes: [{ purpose: 'FINANCE', email: 'maarcusreniero@gmail.com', connectedAt: days(14), lastRefreshedAt: days(0) }],
  },
};

api.defaults.adapter = async (config) => {
  const path = (config.url ?? '').split('?')[0];
  const data = path in answers ? { success: true, message: 'ok', data: answers[path], timestamp: '' } : { success: true, message: 'ok', data: [], timestamp: '' };
  return { data, status: 200, statusText: 'OK', headers: {}, config };
};

// ?dialog=account | transaction renders that form dialog open, for reviewing form spacing.
const dialog = new URLSearchParams(location.search).get('dialog');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <TooltipProvider>
          <AuthProvider>
            <div className="dark hud-bg min-h-screen bg-background p-6 text-foreground">
              <div className="mx-auto max-w-6xl">
                {dialog === 'account' ? (
                  <AccountDialog open onOpenChange={() => {}} editing={null} onSaved={() => {}} />
                ) : dialog === 'transaction' ? (
                  <AddTransactionDialog open onOpenChange={() => {}} editing={null} onSaved={() => {}} />
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
