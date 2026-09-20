import { api, unwrap } from '@/lib/api-client';

export interface ModuleSetting {
  moduleCode: string;
  enabled: boolean;
}

export interface UserSetting {
  module: string;
  key: string;
  value: string | null;
}

export interface Notification {
  id: string;
  module: string;
  type: string;
  title: string;
  body: string | null;
  metadata: Record<string, string> | null;
  read: boolean;
  requiresAiFallbackApproval: boolean;
  aiFallbackApproved: boolean | null;
  occurredAt: string;
}

export interface NotificationPage {
  content: Notification[];
  totalElements: number;
  totalPages: number;
  number: number;
  last: boolean;
}

export interface QuickCaptureResult {
  status: 'created' | 'needs_ai_approval';
  module: string | null;
  summary: string | null;
}

export interface TodayItem {
  module: string;
  type: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  entityId: string | null;
  priority: 'info' | 'warning' | 'urgent' | string;
}

const baseUrl = '/v1/core';

export const coreApi = {
  getModuleSettings(): Promise<ModuleSetting[]> {
    return unwrap(api.get(`${baseUrl}/modules`));
  },

  setModuleEnabled(moduleCode: string, enabled: boolean): Promise<ModuleSetting> {
    return unwrap(api.put(`${baseUrl}/modules/${moduleCode}`, { enabled }));
  },

  getSettings(): Promise<UserSetting[]> {
    return unwrap(api.get(`${baseUrl}/settings`));
  },

  getSettingsForModule(module: string): Promise<UserSetting[]> {
    return unwrap(api.get(`${baseUrl}/settings/${module}`));
  },

  setSetting(module: string, key: string, value: string | null): Promise<UserSetting> {
    return unwrap(api.put(`${baseUrl}/settings/${module}/${key}`, { value }));
  },

  deleteSetting(module: string, key: string): Promise<void> {
    return unwrap(api.delete(`${baseUrl}/settings/${module}/${key}`));
  },

  getNotifications(page = 0, size = 20): Promise<NotificationPage> {
    return unwrap(api.get(`${baseUrl}/notifications`, { params: { page, size } }));
  },

  getUnreadCount(): Promise<{ count: number }> {
    return unwrap(api.get(`${baseUrl}/notifications/unread-count`));
  },

  markNotificationRead(id: string): Promise<Notification> {
    return unwrap(api.put(`${baseUrl}/notifications/${id}/read`));
  },

  markAllNotificationsRead(): Promise<void> {
    return unwrap(api.put(`${baseUrl}/notifications/read-all`));
  },

  setAiFallbackApproval(id: string, approved: boolean): Promise<Notification> {
    return unwrap(api.put(`${baseUrl}/notifications/${id}/ai-fallback-approval`, { approved }));
  },

  getToday(): Promise<TodayItem[]> {
    return unwrap(api.get(`${baseUrl}/today`));
  },

  quickCapture(text: string, useClaudeFallback = false): Promise<QuickCaptureResult> {
    return unwrap(api.post(`${baseUrl}/quick-capture`, { text, useClaudeFallback }));
  },
};
