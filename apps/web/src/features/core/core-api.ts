import { api, unwrap } from '@/lib/api-client';

export interface ModuleSetting {
  moduleCode: string;
  enabled: boolean;
}

const baseUrl = '/v1/core';

export const coreApi = {
  getModuleSettings(): Promise<ModuleSetting[]> {
    return unwrap(api.get(`${baseUrl}/modules`));
  },

  setModuleEnabled(moduleCode: string, enabled: boolean): Promise<ModuleSetting> {
    return unwrap(api.put(`${baseUrl}/modules/${moduleCode}`, { enabled }));
  },
};
