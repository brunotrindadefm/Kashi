export type CategoryType = 'expense' | 'income' | 'both';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  color: string;
  icon: string;
  isDefault?: boolean;
}

export type TransactionType = 'expense' | 'income';

export type TransactionStatus = 'completed' | 'upcoming';

export type TransactionSource = 'manual' | 'bank' | 'import';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  categoryId: string;
  suggestedCategoryId?: string;
  pendingCategoryConfirmation: boolean;
  source: TransactionSource;
  bankId?: string;
  bankName?: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
}

export type BankInstitutionId = 'nubank' | 'itau' | 'inter' | 'bradesco';

export interface BankAccount {
  id: string;
  institutionId: BankInstitutionId;
  institutionName: string;
  shortCode: string;
  accountType: string;
  balance: number;
  color: string;
  accentBg: string;
  connected: boolean;
  lastSyncAt?: string;
  pluggyItemId?: string;
}

export interface ClassificationRule {
  id: string;
  keyword: string;
  categoryId: string;
  hitCount: number;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  darkMode: boolean;
  autoClassify: boolean;
}

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

export interface ClassificationMatch {
  categoryId: string;
  categoryName: string;
  confidence: number;
  reason: 'memory' | 'keyword' | 'fallback';
  matchedKeyword?: string;
}
