export type VaultEntryType = 'LOGIN' | 'CARD' | 'NOTE';

export interface VaultStatus {
  hasMasterPassword: boolean;
  unlocked: boolean;
}

export interface MasterPasswordRequest {
  masterPassword: string;
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

export interface VaultCategoryWriteRequest {
  name: string;
  color?: string | null;
}

export interface PasswordAgeBucket {
  label: string;
  count: number;
}

export interface ActionRequiredEntry {
  id: string;
  title: string;
  issue: string;
}

export interface HealthSummary {
  score: number;
  totalCount: number;
  weakCount: number;
  duplicateCount: number;
  compromisedCount: number;
  ageBuckets: PasswordAgeBucket[];
  actionRequired: ActionRequiredEntry[];
}

export interface RecoveryCodesResponse {
  codes: string[];
}

export interface RecoveryCodeStatus {
  id: string;
  used: boolean;
  usedAt: string | null;
  createdAt: string;
}
