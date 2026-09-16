import { api, unwrap } from '@/lib/api-client';

import type { CategorizationRuleResponse, CreateCategorizationRuleRequest, UpdateCategorizationRuleRequest } from './types';

const baseUrl = '/v1/finance/categorization-rules';

export const ruleApi = {
  getRules(): Promise<CategorizationRuleResponse[]> {
    return unwrap(api.get(baseUrl));
  },
  createRule(request: CreateCategorizationRuleRequest): Promise<CategorizationRuleResponse> {
    return unwrap(api.post(baseUrl, request));
  },
  updateRule(id: string, request: UpdateCategorizationRuleRequest): Promise<CategorizationRuleResponse> {
    return unwrap(api.put(`${baseUrl}/${id}`, request));
  },
  async deleteRule(id: string): Promise<void> {
    await api.delete(`${baseUrl}/${id}`);
  },
};
