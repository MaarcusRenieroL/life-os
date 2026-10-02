// Wire types for the pages added to the native apps after the first release. Hand-mirrored from the
// feature type files in apps/web/src/features/*.

import type { NoteType } from './models';

// ---------------------------------------------------------------- email hub
export type EmailCategory = 'TASK' | 'BILL' | 'EVENT' | 'SUBSCRIPTION' | 'IGNORE';
export type EmailHubStatus = 'APPLIED' | 'NEEDS_REVIEW' | 'DISMISSED' | 'UNDONE' | 'IGNORED' | 'FAILED';

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

// ---------------------------------------------------------------- automation
export type TriggerType = 'ON_CREATE' | 'ON_COMPLETE' | 'ON_UPDATE' | 'SCHEDULED' | 'THRESHOLD';
export type ActionType = 'CREATE_TASK' | 'CREATE_EVENT' | 'SEND_NOTIFICATION' | 'LINK_ITEMS' | 'UPDATE_STATUS' | 'GENERATE_REPORT';

export const TRIGGER_TYPES: { value: TriggerType; label: string; hint: string }[] = [
  { value: 'ON_CREATE', label: 'When something is created', hint: 'A task, goal or job application is added' },
  { value: 'ON_COMPLETE', label: 'When something is completed', hint: 'A task, goal or habit is finished' },
  { value: 'ON_UPDATE', label: 'When something changes', hint: 'A status or field is updated' },
  { value: 'SCHEDULED', label: 'On a schedule', hint: 'Daily, weekly or monthly at a set time' },
  { value: 'THRESHOLD', label: 'When a number crosses a line', hint: 'Goal progress drops, spending rises...' },
];

export const ACTION_TYPES: { value: ActionType; label: string }[] = [
  { value: 'CREATE_TASK', label: 'Create a task' },
  { value: 'CREATE_EVENT', label: 'Create a calendar event' },
  { value: 'SEND_NOTIFICATION', label: 'Send a notification' },
  { value: 'LINK_ITEMS', label: 'Link the task to a goal' },
  { value: 'UPDATE_STATUS', label: 'Update the item’s status' },
  { value: 'GENERATE_REPORT', label: 'Generate a report' },
];

export interface AutomationRule {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  triggerType: TriggerType;
  triggerConfig: Record<string, unknown>;
  actionType: ActionType;
  actionConfig: Record<string, unknown>;
  templateKey: string | null;
  lastRunAt: string | null;
  runCount: number;
  createdAt: string;
}

export interface AutomationExecution {
  id: string;
  ruleId: string;
  status: 'SUCCESS' | 'FAILED';
  message: string | null;
  triggerSummary: string | null;
  executedAt: string;
}

export interface AutomationTemplate {
  key: string;
  name: string;
  description: string;
  triggerType: TriggerType;
  triggerConfig: Record<string, unknown>;
  actionType: ActionType;
  actionConfig: Record<string, unknown>;
}

export interface SaveRuleRequest {
  name: string;
  description?: string | null;
  triggerType: TriggerType;
  triggerConfig: Record<string, unknown>;
  actionType: ActionType;
  actionConfig: Record<string, unknown>;
  enabled?: boolean;
}

// ---------------------------------------------------------------- vault
export type VaultEntryType = 'LOGIN' | 'CARD' | 'NOTE';
export type PasswordStrength = 'VERY_WEAK' | 'WEAK' | 'FAIR' | 'STRONG' | 'VERY_STRONG';

export interface VaultStatus {
  hasMasterPassword: boolean;
  unlocked: boolean;
  masterPasswordStrength: PasswordStrength | null;
  masterPasswordUpdatedAt: string | null;
}

export interface VaultEntrySummary {
  id: string;
  type: VaultEntryType;
  title: string;
  email: string | null;
  username: string | null;
  url: string | null;
  icon: string | null;
  categoryId: string | null;
  favorite: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VaultEntryDetail extends VaultEntrySummary {
  password: string | null;
  notes: string | null;
}

export interface VaultEntryWriteRequest {
  type: VaultEntryType;
  title: string;
  email?: string | null;
  username?: string | null;
  url?: string | null;
  icon?: string | null;
  password?: string | null;
  notes?: string | null;
  categoryId?: string | null;
  favorite?: boolean;
  expiresAt?: string | null;
}

export interface VaultCategory {
  id: string;
  name: string;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VaultHealthSummary {
  score: number;
  totalCount: number;
  weakCount: number;
  duplicateCount: number;
  compromisedCount: number;
  ageBuckets: { label: string; count: number }[];
  actionRequired: { id: string; title: string; issue: string }[];
}

export interface RecoveryCodeStatus {
  id: string;
  used: boolean;
  usedAt: string | null;
  createdAt: string;
}

export type ApiCardNetwork = 'VISA' | 'MASTERCARD' | 'AMEX' | 'DISCOVER';

/** A saved payment card as the API returns it: the number and CVV are never sent back, only the last four. */
export interface VaultCard {
  id: string;
  nickname: string;
  network: ApiCardNetwork;
  lastFourDigits: number;
  expiry: string;
  cardHolderName: string;
  billingZip: string;
  createdAt: string;
  updatedAt: string;
}

export interface VaultCardInput {
  nickname: string;
  network: ApiCardNetwork;
  cardNumber: string;
  cvv: string;
  expiry: string;
  cardHolderName: string;
  billingZip: string;
}

export interface VaultExport {
  entries: VaultEntryDetail[];
  cards: unknown[];
  exportedAt: string;
}

export interface AuditEvent {
  eventId: string;
  service: string;
  eventType: string;
  description: string;
  metadata: Record<string, string> | null;
  occurredAt: string;
}

export interface BackupSummary {
  id: string;
  createdAt: string;
}

// ---------------------------------------------------------------- notes extras
export interface JournalPrompt {
  id: string;
  category: string;
  text: string;
}

export interface JournalPromptAnswer {
  prompt: string;
  answer: string;
}

export interface JournalEntry {
  noteId: string;
  title: string;
  entryDate: string;
  mood: number | null;
  energy: number | null;
  freeWriting: string | null;
  prompts: JournalPromptAnswer[];
  excerpt: string;
  createdAt: string;
  updatedAt: string;
}

export interface JournalInsights {
  totalEntries: number;
  averageMood: number | null;
  averageEnergy: number | null;
  currentStreakDays: number;
  longestStreakDays: number;
  days: { date: string; mood: number | null; energy: number | null; entries: number }[];
}

export interface SaveJournalEntryRequest {
  title?: string | null;
  entryDate?: string | null;
  mood?: number | null;
  energy?: number | null;
  freeWriting?: string | null;
  prompts: JournalPromptAnswer[];
  links: { moduleType: 'GOAL' | 'PROJECT'; moduleId: string }[];
}

export const MOOD_LABELS: Record<number, string> = { 1: 'Rough', 2: 'Low', 3: 'Okay', 4: 'Good', 5: 'Great' };

export interface NoteSearchResult {
  id: string;
  title: string;
  excerpt: string;
  tags: { id: string; name: string }[];
  matchedFields: string[];
  updatedAt: string;
}

export interface NoteTemplate {
  id: string;
  name: string;
  content: string | null;
  category: string | null;
  preview: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteSettings {
  defaultNoteType: NoteType;
  autoArchiveEnabled: boolean;
  autoArchiveDays: number;
}

export interface NoteGraphNode {
  id: string;
  title: string;
  noteType: NoteType;
  folderId: string | null;
  folderName: string | null;
  connectionCount: number;
  tagIds: string[];
}

export interface NoteGraph {
  nodes: NoteGraphNode[];
  edges: { sourceId: string; targetId: string }[];
}

export interface NoteAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string | null;
  uploadDate: string;
  noteId: string;
  noteTitle: string;
}

// ---------------------------------------------------------------- habits extras
export interface HabitReminder {
  id: string;
  habitId: string;
  reminderTime: string;
  /** ISO day-of-week integers (1=Monday..7=Sunday). */
  daysOfWeek: number[] | null;
  enabled: boolean;
}

export interface HabitConsistencyScore {
  period: 'week' | 'month';
  completions: number;
  scheduledOccurrences: number;
  score: number;
}
