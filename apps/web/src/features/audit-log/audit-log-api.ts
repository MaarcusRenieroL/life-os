import { api, unwrap } from '@/lib/api-client';

import type { AuditEventResponse } from './types';

// Lives in the "batches" microservice, not vault - a different base path.
export const auditLogApi = {
  getEvents(): Promise<AuditEventResponse[]> {
    return unwrap(api.get('/v1/batches/audit-events'));
  },
};
