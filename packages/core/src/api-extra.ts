import type { Client } from './client';
import type {
  CareerProfile, CareerProfileBundle, CareerProfileInput, DeviceSession, DiscoveredJob, DiscoveryPreferences, GmailPurpose, GmailStatus, ImportFailure, ProjectEntry, ProjectInput,
  Resume, StatementImportResult, UserProfile, WatchedCompany, WorkExperience, WorkExperienceInput, JobBoard,
  HabitConsistencyScore, HabitReminder,
  AuditEvent, AutomationExecution, AutomationRule, AutomationTemplate, BackupSummary, EmailHubItem, EmailHubStatus, JournalEntry, JournalInsights, JournalPrompt,
  NoteAttachment, NoteGraph, NoteSearchResult, NoteSettings, NoteTemplate, RecoveryCodeStatus, SaveJournalEntryRequest, SaveRuleRequest, VaultCard, VaultCardInput,
  VaultCategory, VaultEntryDetail, VaultEntrySummary, VaultEntryWriteRequest, VaultExport, VaultHealthSummary, VaultStatus,
} from './models-extra';
import type { JobListing, Merchant, Note, NoteFolder, NoteType, Page } from './models';
import type { Anomaly, Insight, PeriodSummary } from './types';

export interface ModuleSetting { moduleCode: string; enabled: boolean }
export interface UserSetting { module: string; key: string; value: string | null }
export interface AppNotification {
  id: string;
  module: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  /** Ids and numbers the module attached (e.g. `taskId`), used to open the right item. */
  metadata?: Record<string, string> | null;
  /** An AI-fallback question; it needs a yes/no (on the web app) before it can be cleared. */
  requiresAiFallbackApproval?: boolean;
  aiFallbackApproved?: boolean | null;
  occurredAt: string;
}

/** True while a notification is asking for an answer and so must not be deleted. */
export const needsAnswer = (n: Pick<AppNotification, 'requiresAiFallbackApproval' | 'aiFallbackApproved'>) => !!n.requiresAiFallbackApproval && (n.aiFallbackApproved === null || n.aiFallbackApproved === undefined);

/** The pages added after the first native release: analytics, automation, email, vault and the notes extras. */
export function createExtraApis(client: Client) {
  const { get, post, put, delete: del } = client;
  return {
    analytics: {
      summary: (period: 'WEEK' | 'MONTH', asOf?: string) => get<PeriodSummary>('/v1/core/analytics/summary', { period, asOf }),
      anomalies: () => get<Anomaly[]>('/v1/core/analytics/anomalies'),
      insights: (days: number) => get<Insight[]>('/v1/core/analytics/insights', { days }),
    },

    automation: {
      rules: () => get<AutomationRule[]>('/v1/core/automation/rules'),
      createRule: (body: SaveRuleRequest) => post<AutomationRule>('/v1/core/automation/rules', body),
      updateRule: (id: string, body: SaveRuleRequest) => put<AutomationRule>(`/v1/core/automation/rules/${id}`, body),
      setEnabled: (id: string, enabled: boolean) => post<AutomationRule>(`/v1/core/automation/rules/${id}/enabled`, { enabled }),
      deleteRule: (id: string) => del<void>(`/v1/core/automation/rules/${id}`),
      testRule: (id: string) => post<AutomationExecution>(`/v1/core/automation/rules/${id}/test`, {}),
      executions: (ruleId?: string, limit = 50) => get<AutomationExecution[]>('/v1/core/automation/executions', { ruleId, limit }),
      templates: () => get<AutomationTemplate[]>('/v1/core/automation/templates'),
      applyTemplate: (key: string) => post<AutomationRule>(`/v1/core/automation/templates/${key}/apply`, {}),
    },

    emailHub: {
      /** The statuses are sent as repeated `status` parameters, which the client's query builder joins itself. */
      items: (statuses: EmailHubStatus[], limit = 100) => get<EmailHubItem[]>('/v1/core/email-hub/items', { status: statuses.join(','), limit }),
      pendingCount: async () => (await get<{ count: number }>('/v1/core/email-hub/pending-count')).count,
      approve: (id: string) => post<EmailHubItem>(`/v1/core/email-hub/items/${id}/approve`, {}),
      dismiss: (id: string) => post<EmailHubItem>(`/v1/core/email-hub/items/${id}/dismiss`, {}),
      undo: (id: string) => post<EmailHubItem>(`/v1/core/email-hub/items/${id}/undo`, {}),
      syncNow: () => post<number>('/v1/batches/gmail/hub/sync-recent', {}),
    },

    vault: {
      status: () => get<VaultStatus>('/v1/vault/status'),
      setup: (masterPassword: string) => post<void>('/v1/vault/setup', { masterPassword }),
      verify: (masterPassword: string) => post<void>('/v1/vault/verify', { masterPassword }),
      entries: () => get<VaultEntrySummary[]>('/v1/vault/entries'),
      entry: (id: string) => get<VaultEntryDetail>(`/v1/vault/entry/${id}`),
      createEntry: (body: VaultEntryWriteRequest) => post<void>('/v1/vault/entry', body),
      updateEntry: (id: string, body: VaultEntryWriteRequest) => put<void>(`/v1/vault/entry/${id}`, body),
      deleteEntry: (id: string) => del<void>(`/v1/vault/entry/${id}`),
      health: () => get<VaultHealthSummary>('/v1/vault/health/summary'),
      changeMasterPassword: (currentPassword: string, newPassword: string) => post<void>('/v1/vault/master-password/change', { currentPassword, newPassword }),
      generateRecoveryCodes: (currentPassword: string) => post<{ codes: string[] }>('/v1/vault/recovery-codes/generate', { currentPassword }),
      recoveryCodes: () => get<RecoveryCodeStatus[]>('/v1/vault/recovery-codes'),
      exportAll: () => get<VaultExport>('/v1/vault/export'),
      categories: () => get<VaultCategory[]>('/v1/vault/categories'),
      createCategory: (name: string, color?: string | null) => post<VaultCategory>('/v1/vault/categories', { name, color: color ?? null }),
      deleteCategory: (id: string) => del<void>(`/v1/vault/categories/${id}`),
      cards: () => get<VaultCard[]>('/v1/vault/cards'),
      createCard: (body: VaultCardInput) => post<VaultCard>('/v1/vault/cards', body),
      deleteCard: (id: string) => del<void>(`/v1/vault/cards/${id}`),
    },

    audit: {
      events: (page = 0, size = 100) => get<Page<AuditEvent>>('/v1/batches/audit-events', { page, size }),
      latestBackup: () => get<BackupSummary | null>('/v1/batches/backup/latest'),
      runBackup: () => post<void>('/v1/batches/backup/run', {}),
      restoreBackup: () => post<void>('/v1/batches/backup/restore', {}),
    },

    journal: {
      list: (filters: { from?: string; to?: string; mood?: number; q?: string } = {}) => get<JournalEntry[]>('/v1/notes/journal', { ...filters }),
      get: (noteId: string) => get<JournalEntry>(`/v1/notes/journal/${noteId}`),
      create: (body: SaveJournalEntryRequest) => post<JournalEntry>('/v1/notes/journal', body),
      update: (noteId: string, body: SaveJournalEntryRequest) => put<JournalEntry>(`/v1/notes/journal/${noteId}`, body),
      remove: (noteId: string) => del<void>(`/v1/notes/journal/${noteId}`),
      prompts: () => get<JournalPrompt[]>('/v1/notes/journal/prompts'),
      suggestedPrompts: (date?: string) => get<JournalPrompt[]>('/v1/notes/journal/prompts/suggested', { date }),
      insights: (from?: string, to?: string) => get<JournalInsights>('/v1/notes/journal/insights', { from, to }),
    },

    noteTools: {
      search: (q: string, page = 0, size = 20) => get<Page<NoteSearchResult>>('/v1/notes/search', { q, page, size }),
      graph: () => get<NoteGraph>('/v1/notes/graph'),
      attachments: () => get<NoteAttachment[]>('/v1/notes/attachments'),
      templates: (category?: string) => get<Page<NoteTemplate>>('/v1/templates', { category, page: 0, size: 100 }),
      createTemplate: (name: string, content: string, category?: string) => post<NoteTemplate>('/v1/templates', { name, content, category }),
      deleteTemplate: (id: string) => del<void>(`/v1/templates/${id}`),
      useTemplate: (id: string, title: string) => post<Note>(`/v1/templates/${id}/use`, { title }),
      settings: () => get<NoteSettings>('/v1/notes/settings'),
      updateSettings: (body: { defaultNoteType?: NoteType; autoArchiveEnabled?: boolean; autoArchiveDays?: number }) => put<NoteSettings>('/v1/notes/settings', body),
      createFolder: (name: string, parentFolderId?: string | null) => post<NoteFolder>('/v1/folders', { name, parentFolderId: parentFolderId ?? null }),
      renameFolder: (id: string, name: string) => put<NoteFolder>(`/v1/folders/${id}`, { name }),
      deleteFolder: (id: string) => del<void>(`/v1/folders/${id}`),
    },

    habitTools: {
      consistency: (id: string, period: 'week' | 'month') => get<HabitConsistencyScore>(`/v1/habits/${id}/consistency`, { period }),
      reminders: (id: string) => get<HabitReminder[]>(`/v1/habits/${id}/reminders`),
      addReminder: (id: string, body: { reminderTime: string; daysOfWeek?: number[] | null; enabled?: boolean }) => post<HabitReminder>(`/v1/habits/${id}/reminders`, body),
      updateReminder: (id: string, reminderId: string, body: { reminderTime?: string; daysOfWeek?: number[] | null; enabled?: boolean }) => put<HabitReminder>(`/v1/habits/${id}/reminders/${reminderId}`, body),
      deleteReminder: (id: string, reminderId: string) => del<void>(`/v1/habits/${id}/reminders/${reminderId}`),
    },

    jobTools: {
      companies: () => get<WatchedCompany[]>('/v1/jobs/discovery/companies'),
      addCompany: (body: { name: string; board: JobBoard; slug: string; domain?: string; alert?: boolean }) => post<WatchedCompany>('/v1/jobs/discovery/companies', body),
      updateCompany: (id: string, body: { active?: boolean; alert?: boolean }) => client.patch<WatchedCompany>(`/v1/jobs/discovery/companies/${id}`, body),
      removeCompany: (id: string) => del<void>(`/v1/jobs/discovery/companies/${id}`),
      scanCompany: (id: string) => post<{ companiesScanned: number; newOpenings: number; closedOpenings: number; errors: string[] }>(`/v1/jobs/discovery/companies/${id}/scan`, {}),
      scanAll: () => post<boolean>('/v1/jobs/discovery/scan', {}),
      openings: (params: { minScore?: number; companyId?: string; limit?: number } = {}) => get<DiscoveredJob[]>('/v1/jobs/discovery/jobs', { ...params }),
      promote: (id: string) => post<JobListing>(`/v1/jobs/discovery/jobs/${id}/promote`, {}),
      dismiss: (id: string) => post<DiscoveredJob>(`/v1/jobs/discovery/jobs/${id}/dismiss`, {}),
      preferences: () => get<DiscoveryPreferences>('/v1/jobs/discovery/preferences'),
      savePreferences: (body: DiscoveryPreferences) => put<DiscoveryPreferences>('/v1/jobs/discovery/preferences', body),
      resume: () => get<Resume>('/v1/resumes'),
      uploadResume: (form: FormData) => client.upload<Resume>('/v1/resumes/upload', form),
      profile: () => get<CareerProfileBundle>('/v1/career-profile'),
      saveProfile: (body: CareerProfileInput) => put<CareerProfile>('/v1/career-profile', body),
      seedFromResume: (form: FormData) => client.upload<CareerProfile>('/v1/career-profile/seed-from-resume', form),
      addExperience: (body: WorkExperienceInput) => post<WorkExperience>('/v1/career-profile/work-experiences', body),
      deleteExperience: (id: string) => del<void>(`/v1/career-profile/work-experiences/${id}`),
      addProject: (body: ProjectInput) => post<ProjectEntry>('/v1/career-profile/projects', body),
      deleteProject: (id: string) => del<void>(`/v1/career-profile/projects/${id}`),
    },

    financeTools: {
      importFailures: () => get<ImportFailure[]>('/v1/finance/import-failures'),
      retryFailure: (id: string) => post<void>(`/v1/finance/import-failures/${id}/retry`, {}),
      dismissFailure: (id: string) => post<void>(`/v1/finance/import-failures/${id}/dismiss`, {}),
      importStatement: (form: FormData) => client.upload<StatementImportResult>('/v1/batches/finance/import-statement', form),
      gmailStatus: () => get<GmailStatus>('/v1/batches/gmail/status'),
      gmailConnectUrl: (purpose: GmailPurpose = 'FINANCE') => get<string>('/v1/batches/gmail/connect-url', { purpose }),
      syncAllGmail: () => post<number>('/v1/batches/gmail/sync-all', {}),
      syncJobEmails: () => post<number>('/v1/batches/gmail/jobs/sync-recent', {}),
      setPayCycle: (startDay: number) => put<unknown>('/v1/finance/analytics/pay-cycle', { startDay }),
      setMonthlyIncome: (monthlyIncome: number) => put<unknown>('/v1/finance/analytics/monthly-income', { monthlyIncome }),
      ownerNames: () => get<string[]>('/v1/finance/analytics/owner-names'),
      setOwnerNames: (names: string[]) => put<number>('/v1/finance/analytics/owner-names', { names }),
      renameMerchant: (id: string, name: string) => put<Merchant>(`/v1/finance/merchants/${id}`, { name }),
    },

    account: {
      me: () => get<UserProfile>('/v1/auth/me'),
      updateName: (name: string) => put<UserProfile>('/v1/auth/me', { name }),
      sessions: () => get<DeviceSession[]>('/v1/auth/sessions'),
      revokeSession: (id: string) => post<void>(`/v1/auth/sessions/${id}/revoke`, {}),
      verifyPassword: (password: string) => post<void>('/v1/auth/me/verify-password', { password }),
      deleteAccount: (password: string) => client.delete<void>('/v1/auth/me', { password }),
    },

    core: {
      modules: () => get<ModuleSetting[]>('/v1/core/modules'),
      setModule: (code: string, enabled: boolean) => put<ModuleSetting>(`/v1/core/modules/${code}`, { enabled }),
      settings: (module: string) => get<UserSetting[]>(`/v1/core/settings/${module}`),
      setSetting: (module: string, key: string, value: string | null) => put<UserSetting>(`/v1/core/settings/${module}/${key}`, { value }),
      deleteSetting: (module: string, key: string) => del<void>(`/v1/core/settings/${module}/${key}`),
      notifications: (page = 0, size = 30) => get<Page<AppNotification>>('/v1/core/notifications', { page, size }),
      unreadCount: async () => (await get<{ count: number }>('/v1/core/notifications/unread-count')).count,
      markRead: (id: string) => put<void>(`/v1/core/notifications/${id}/read`, {}),
      markAllRead: () => put<void>('/v1/core/notifications/read-all', {}),
      /** Yes/no on an "Ollama couldn't do this - use Claude?" question. */
      answerAiFallback: (id: string, approved: boolean) => put<AppNotification>(`/v1/core/notifications/${id}/ai-fallback-approval`, { approved }),
      deleteNotification: (id: string) => del<void>(`/v1/core/notifications/${id}`),
      /** Deletes read notifications, or every one that is not waiting on an answer. Returns how many went. */
      clearNotifications: async (readOnly: boolean) => (await del<{ deleted: number }>(readOnly ? '/v1/core/notifications/read' : '/v1/core/notifications')).deleted,
    },
  };
}
