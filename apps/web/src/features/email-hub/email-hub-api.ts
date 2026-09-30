import { api, unwrap } from '@/lib/api-client';

export type EmailCategory = 'TASK' | 'BILL' | 'EVENT' | 'SUBSCRIPTION' | 'IGNORE';
export type EmailHubStatus = 'APPLIED' | 'NEEDS_REVIEW' | 'DISMISSED' | 'UNDONE' | 'IGNORED' | 'FAILED';

/** What the hub would create - present on anything it proposed or did. */
export interface EmailProposal {
  kind: 'TASK' | 'EVENT' | 'SUBSCRIPTION';
  title: string;
  description?: string | null;
  priority?: string | null;
  dueDate?: string | null;
  allDay?: boolean;
  startAt?: string | null;
  endAt?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  location?: string | null;
  amount?: number | null;
  billingCycle?: string | null;
  nextBillingDate?: string | null;
}

export interface EmailHubItem {
  id: string;
  fromAddress: string | null;
  subject: string | null;
  snippet: string | null;
  receivedAt: string | null;
  category: EmailCategory;
  confidence: string | null;
  summary: string | null;
  proposal: EmailProposal | null;
  status: EmailHubStatus;
  targetModule: string | null;
  targetId: string | null;
  note: string | null;
  createdAt: string;
}

const baseUrl = '/v1/core/email-hub';

export const emailHubApi = {
  items(statuses: EmailHubStatus[], limit = 100): Promise<EmailHubItem[]> {
    return unwrap(api.get(`${baseUrl}/items`, { params: { status: statuses, limit }, paramsSerializer: { indexes: null } }));
  },

  async pendingCount(): Promise<number> {
    const result = await unwrap<{ count: number }>(api.get(`${baseUrl}/pending-count`));
    return result.count;
  },

  approve(id: string): Promise<EmailHubItem> {
    return unwrap(api.post(`${baseUrl}/items/${id}/approve`, {}));
  },

  dismiss(id: string): Promise<EmailHubItem> {
    return unwrap(api.post(`${baseUrl}/items/${id}/dismiss`, {}));
  },

  undo(id: string): Promise<EmailHubItem> {
    return unwrap(api.post(`${baseUrl}/items/${id}/undo`, {}));
  },

  /** Pulls the last few days of inbox mail through the classifier now instead of at the next poll. */
  syncNow(): Promise<number> {
    return unwrap(api.post('/v1/batches/gmail/hub/sync-recent', {}));
  },
};
