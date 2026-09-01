// Mirrors services/finance-tracker DTOs (com.lifeos.finance_tracker.domains.dto/enums).

export type AccountType = 'SAVINGS' | 'CHECKING' | 'CREDIT_CARD' | 'INVESTMENT' | 'CASH';
export type CurrencyCode = 'INR' | 'USD' | 'EUR';
export type BudgetPeriod = 'MONTHLY' | 'YEARLY' | 'CUSTOM';
export type CategoryType = 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INVESTMENT';
export type MatchType = 'EXACT' | 'CONTAINS' | 'REGEX';
export type MatchField = 'MERCHANT_NAME' | 'DESCRIPTION';
export type RecurringFrequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
export type SourceType = 'EMAIL_ALERT' | 'CSV_IMPORT' | 'MANUAL_ENTRY' | 'API';
export type TransactionStatus = 'PENDING' | 'ACTIVE' | 'RECONCILED' | 'DISPUTED' | 'IGNORED';
export type TransactionType = 'DEBIT' | 'CREDIT' | 'TRANSFER';

export interface SpringPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  numberOfElements: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

// --- Accounts ---

export interface AccountResponse {
  id: string;
  accountName: string;
  accountType: AccountType;
  bankName: string | null;
  accountNumberLastFour: string;
  currencyCode: CurrencyCode;
  openedDate: string | null;
  currentBalance: number;
  isActive: boolean;
  isPrimary: boolean;
  emailForAlerts: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountRequest {
  accountName: string;
  accountType: AccountType;
  bankName?: string;
  accountNumber: string;
  currencyCode: CurrencyCode;
  openedDate?: string;
  currentBalance?: number;
  isPrimary: boolean;
  emailForAlerts?: string;
  notes?: string;
}

export interface UpdateAccountRequest {
  accountName?: string;
  accountType?: AccountType;
  bankName?: string;
  accountNumber?: string;
  currencyCode?: CurrencyCode;
  openedDate?: string;
  currentBalance?: number;
  isActive?: boolean;
  isPrimary?: boolean;
  emailForAlerts?: string;
  notes?: string;
}

export interface ReconcileAccountRequest {
  statementBalance: number;
  statementDate: string;
}

// --- Categories ---

export interface CategoryResponse {
  id: string;
  name: string;
  type: CategoryType;
  color: string | null;
  icon: string | null;
  parentCategoryId: string | null;
  isActive: boolean;
  excludeFromAutoLearning: boolean;
  displayOrder: number;
  createdAt: string;
}

export interface CreateCategoryRequest {
  name: string;
  type: CategoryType;
  color?: string;
  icon?: string;
  parentCategoryId?: string;
  displayOrder: number;
}

export interface UpdateCategoryRequest {
  name?: string;
  type?: CategoryType;
  color?: string;
  icon?: string;
  parentCategoryId?: string;
  isActive?: boolean;
  excludeFromAutoLearning?: boolean;
  displayOrder?: number;
}

// --- Transactions ---

export interface TransactionResponse {
  id: string;
  accountId: string;
  transactionDate: string;
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: string | null;
  categoryManuallySet: boolean;
  categoryIds: string[];
  notes: string | null;
  receiptUrl: string | null;
  disputeReason: string | null;
  disputeDate: string | null;
  isRecurring: boolean;
  sourceType: SourceType;
  sourceReference: string | null;
  isReconciled: boolean;
  isDuplicate: boolean;
  duplicateOf: string | null;
  status: TransactionStatus;
  importedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionRequest {
  accountId: string;
  transactionDate: string;
  description: string;
  amount: number;
  type: TransactionType;
  notes?: string;
  receiptUrl?: string;
}

export interface UpdateTransactionRequest {
  description?: string;
  amount?: number;
  type?: TransactionType;
  notes?: string;
  receiptUrl?: string;
}

export interface CategorizeTransactionRequest {
  categoryId: string;
}

export interface UpdateTransactionCategoriesRequest {
  categoryIds: string[];
}

export interface MergeTransactionsRequest {
  duplicateTransactionIds: string[];
}

export interface DisputeTransactionRequest {
  reason: string;
}

// --- Budgets ---

export interface BudgetResponse {
  id: string;
  categoryId: string;
  budgetAmount: number;
  period: BudgetPeriod;
  startDate: string;
  endDate: string | null;
  alertThreshold: number;
  alertEnabled: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBudgetRequest {
  categoryId: string;
  budgetAmount: number;
  period: BudgetPeriod;
  startDate: string;
  endDate?: string;
  alertThreshold: number;
  alertEnabled: boolean;
  notes?: string;
}

export interface UpdateBudgetRequest {
  categoryId?: string;
  budgetAmount?: number;
  period?: BudgetPeriod;
  startDate?: string;
  endDate?: string;
  alertThreshold?: number;
  alertEnabled?: boolean;
  notes?: string;
}

// --- Categorization rules ---

export interface CategorizationRuleResponse {
  id: string;
  categoryId: string;
  matchType: MatchType;
  matchField: MatchField;
  matchValue: string;
  priority: number;
  isActive: boolean;
  hitCount: number;
  autoLearned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategorizationRuleRequest {
  categoryId: string;
  matchType: MatchType;
  matchField: MatchField;
  matchValue: string;
  priority: number;
}

export interface UpdateCategorizationRuleRequest {
  categoryId?: string;
  matchType?: MatchType;
  matchField?: MatchField;
  matchValue?: string;
  priority?: number;
  isActive?: boolean;
}

// --- Merchants ---

export interface MerchantResponse {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  logoUrl: string | null;
  website: string | null;
  transactionCount: number;
  lastTransactionDate: string | null;
  averageTransactionAmount: number | null;
  aliases: string[] | null;
  isRecognized: boolean;
  createdAt: string;
}

export interface CreateMerchantRequest {
  name: string;
  description?: string;
  categoryId?: string;
  logoUrl?: string;
  website?: string;
  aliases?: string[];
}

export type UpdateMerchantRequest = Partial<CreateMerchantRequest>;

// --- Recurring patterns (design's "Subscriptions") ---

export interface RecurringPatternResponse {
  id: string;
  merchantId: string;
  categoryId: string | null;
  averageAmount: number;
  frequency: RecurringFrequency;
  expectedDayOfCycle: number;
  lastTransactionDate: string | null;
  nextExpectedDate: string | null;
  variance: number;
  confidenceScore: number;
  lastDetectedAt: string | null;
  createdAt: string;
}

// --- Analytics ---

export interface DashboardSummary {
  totalIncome: number | null;
  totalExpenses: number | null;
  savings: number;
  fixedMonthlyIncome: number | null;
}

export interface CategoryComparison {
  categoryId: string;
  currentMonthSpend: number;
  lastMonthSpend: number;
  difference: number;
  percentageChange: number;
}

export interface MonthlyTrend {
  month: string;
  totalSpend: number;
}

export interface MerchantSpend {
  merchant: string;
  totalSpend: number;
}
