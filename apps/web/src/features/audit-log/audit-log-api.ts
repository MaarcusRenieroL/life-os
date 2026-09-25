import { api, unwrap } from '@/lib/api-client';

import type { AuditEventResponse, PageResponse } from './types';

// Lives in the "batches" microservice, not vault - a different base path.
export const auditLogApi = {
  // audit_events is unbounded (every module publishes to it over Kafka), so this endpoint is
  // paginated - it used to return the user's entire table on every call.
  getEvents(page = 0, size = 500): Promise<PageResponse<AuditEventResponse>> {
    return unwrap(api.get('/v1/batches/audit-events', { params: { page, size } }));
  },
};
