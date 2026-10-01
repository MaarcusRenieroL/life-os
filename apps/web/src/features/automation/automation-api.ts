import { api, unwrap } from '@/lib/api-client';

import type { AutomationExecution, AutomationRule, AutomationTemplate, SaveRuleRequest } from './types';

const baseUrl = '/v1/core/automation';

export const automationApi = {
  rules(): Promise<AutomationRule[]> {
    return unwrap(api.get(`${baseUrl}/rules`));
  },
  createRule(request: SaveRuleRequest): Promise<AutomationRule> {
    return unwrap(api.post(`${baseUrl}/rules`, request));
  },
  updateRule(id: string, request: SaveRuleRequest): Promise<AutomationRule> {
    return unwrap(api.put(`${baseUrl}/rules/${id}`, request));
  },
  setEnabled(id: string, enabled: boolean): Promise<AutomationRule> {
    return unwrap(api.post(`${baseUrl}/rules/${id}/enabled`, { enabled }));
  },
  async deleteRule(id: string): Promise<void> {
    await api.delete(`${baseUrl}/rules/${id}`);
  },
  testRule(id: string): Promise<AutomationExecution> {
    return unwrap(api.post(`${baseUrl}/rules/${id}/test`, {}));
  },
  executions(ruleId?: string, limit = 50): Promise<AutomationExecution[]> {
    return unwrap(api.get(`${baseUrl}/executions`, { params: { ruleId, limit } }));
  },
  templates(): Promise<AutomationTemplate[]> {
    return unwrap(api.get(`${baseUrl}/templates`));
  },
  applyTemplate(key: string): Promise<AutomationRule> {
    return unwrap(api.post(`${baseUrl}/templates/${key}/apply`, {}));
  },
};
