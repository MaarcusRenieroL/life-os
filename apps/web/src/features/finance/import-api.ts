import { api, unwrap } from '@/lib/api-client';

import type { GmailConnectionStatus, GmailPurpose, StatementImportResult } from './types';

// Lives in the "batches" microservice, not finance-tracker.
export const importApi = {
  importStatement(file: File, accountId: string, password?: string): Promise<StatementImportResult> {
    const form = new FormData();
    form.append('file', file);
    form.append('accountId', accountId);
    if (password) form.append('password', password);
    return unwrap(api.post('/v1/batches/finance/import-statement', form));
  },

  getGmailStatus(): Promise<GmailConnectionStatus> {
    return unwrap(api.get('/v1/batches/gmail/status'));
  },

  /** Bank alerts and job emails can live in different Google accounts, so each connects separately. */
  gmailConnectUrl(purpose: GmailPurpose = 'FINANCE'): string {
    return `/v1/batches/gmail/connect?purpose=${purpose}`;
  },

  syncRecentJobEmails(): Promise<number> {
    return unwrap(api.post('/v1/batches/gmail/jobs/sync-recent', {}));
  },

  syncAllGmailHistory(): Promise<number> {
    return unwrap(api.post('/v1/batches/gmail/sync-all', {}));
  },
};
