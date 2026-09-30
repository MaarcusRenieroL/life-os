import { api, unwrap } from '@/lib/api-client';

import type {
  SaveSubscriptionRequest,
  SubscriptionChargeResponse,
  SubscriptionResponse,
  SubscriptionStatus,
  SubscriptionSummaryResponse,
} from './types';

const baseUrl = '/v1/finance/subscriptions';

export const subscriptionApi = {
  list(status?: SubscriptionStatus): Promise<SubscriptionResponse[]> {
    return unwrap(api.get(baseUrl, { params: { status } }));
  },
  summary(): Promise<SubscriptionSummaryResponse> {
    return unwrap(api.get(`${baseUrl}/summary`));
  },
  create(request: SaveSubscriptionRequest): Promise<SubscriptionResponse> {
    return unwrap(api.post(baseUrl, request));
  },
  update(id: string, request: SaveSubscriptionRequest): Promise<SubscriptionResponse> {
    return unwrap(api.put(`${baseUrl}/${id}`, request));
  },
  async delete(id: string): Promise<void> {
    await api.delete(`${baseUrl}/${id}`);
  },
  pause(id: string): Promise<SubscriptionResponse> {
    return unwrap(api.post(`${baseUrl}/${id}/pause`, {}));
  },
  resume(id: string): Promise<SubscriptionResponse> {
    return unwrap(api.post(`${baseUrl}/${id}/resume`, {}));
  },
  cancel(id: string): Promise<SubscriptionResponse> {
    return unwrap(api.post(`${baseUrl}/${id}/cancel`, {}));
  },
  logUse(id: string): Promise<SubscriptionResponse> {
    return unwrap(api.post(`${baseUrl}/${id}/log-use`, {}));
  },
  chargeNow(id: string): Promise<SubscriptionResponse> {
    return unwrap(api.post(`${baseUrl}/${id}/charge`, {}));
  },
  charges(id: string): Promise<SubscriptionChargeResponse[]> {
    return unwrap(api.get(`${baseUrl}/${id}/charges`));
  },
  fromPattern(patternId: string): Promise<SubscriptionResponse> {
    return unwrap(api.post(`${baseUrl}/from-pattern/${patternId}`, {}));
  },
};
