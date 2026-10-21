import { getSupabaseClient, isSupabaseConfigured } from './supabase';
import { DEFAULT_CATEGORIES, INITIAL_BANK_ACCOUNTS } from './constants';
import type {
  BankAccount,
  BankInstitutionId,
  Category,
  ClassificationRule,
  Transaction,
  UserProfile,
} from '../types/finance';

/**
 * Cloud DB persistence is disabled by default so that bank balances and
 * transactions stay 100% local on the user's PC (localStorage) unless
 * NEXT_PUBLIC_ENABLE_SUPABASE_DB=true is explicitly set.
 */
const isCloudDbSyncEnabled =
  isSupabaseConfigured &&
  process.env.NEXT_PUBLIC_ENABLE_SUPABASE_DB === 'true';

export async function fetchUserStoreFromSupabase(user: {
  id: string;
  name: string;
  email: string;
}): Promise<{
  profile: UserProfile;
  categories: Category[];
  transactions: Transaction[];
  banks: BankAccount[];
  rules: ClassificationRule[];
} | null> {
  const supabase = getSupabaseClient();
  if (!supabase || !isCloudDbSyncEnabled) return null;

  try {
    const [profileRes, categoriesRes, banksRes, txRes, rulesRes] =
      await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase
          .from('categories')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true }),
        supabase.from('bank_accounts').select('*').eq('user_id', user.id),
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false }),
        supabase.from('classification_rules').select('*').eq('user_id', user.id),
      ]);

    const profile: UserProfile = profileRes.data
      ? {
          id: user.id,
          name: profileRes.data.name || user.name,
          email: profileRes.data.email || user.email,
          darkMode: Boolean(profileRes.data.dark_mode),
          autoClassify: profileRes.data.auto_classify ?? true,
        }
      : {
          id: user.id,
          name: user.name,
          email: user.email,
          darkMode: false,
          autoClassify: true,
        };

    const categories: Category[] =
      categoriesRes.data && categoriesRes.data.length > 0
        ? categoriesRes.data.map((row) => ({
            id: row.id,
            name: row.name,
            type: row.type,
            color: row.color,
            icon: row.icon,
            isDefault: row.is_default,
          }))
        : DEFAULT_CATEGORIES;

    const dbBanks = banksRes.data ?? [];
    const banks: BankAccount[] = INITIAL_BANK_ACCOUNTS.map((template) => {
      const matched = dbBanks.find(
        (b) => b.institution_id === template.institutionId
      );
      if (!matched) return template;
      return {
        ...template,
        balance: Number(matched.balance || 0),
        connected: Boolean(matched.connected),
        pluggyItemId: matched.pluggy_item_id || undefined,
        lastSyncAt: matched.last_sync_at || undefined,
      };
    });

    const transactions: Transaction[] = (txRes.data ?? []).map((row) => ({
      id: row.id,
      description: row.description,
      amount: Number(row.amount),
      type: row.type,
      status: row.status,
      categoryId: row.category_id || categories[0]?.id || '',
      suggestedCategoryId: row.suggested_category_id || undefined,
      pendingCategoryConfirmation: Boolean(row.pending_category_confirmation),
      source: row.source || 'manual',
      bankId: row.bank_id || undefined,
      bankName: row.bank_name || undefined,
      date: row.date,
      createdAt: row.created_at,
    }));

    const rules: ClassificationRule[] = (rulesRes.data ?? []).map((row) => ({
      id: row.id,
      keyword: row.keyword,
      categoryId: row.category_id,
      hitCount: Number(row.hit_count || 1),
      updatedAt: row.updated_at,
    }));

    return {
      profile,
      categories,
      transactions,
      banks,
      rules,
    };
  } catch {
    return null;
  }
}

export async function syncProfileToSupabase(profile: UserProfile) {
  const supabase = getSupabaseClient();
  if (!supabase || !isCloudDbSyncEnabled || !profile.id) return;
  await supabase.from('profiles').upsert({
    id: profile.id,
    name: profile.name,
    email: profile.email,
    dark_mode: profile.darkMode,
    auto_classify: profile.autoClassify,
    updated_at: new Date().toISOString(),
  });
}

export async function insertTransactionsToSupabase(
  userId: string,
  txs: Transaction[]
) {
  const supabase = getSupabaseClient();
  if (!supabase || !isCloudDbSyncEnabled || !userId || txs.length === 0) return;
  await supabase.from('transactions').upsert(
    txs.map((tx) => ({
      id: tx.id,
      user_id: userId,
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
      status: tx.status,
      category_id: tx.categoryId,
      suggested_category_id: tx.suggestedCategoryId ?? null,
      pending_category_confirmation: tx.pendingCategoryConfirmation,
      source: tx.source,
      bank_id: tx.bankId ?? null,
      bank_name: tx.bankName ?? null,
      date: tx.date,
      created_at: tx.createdAt,
    }))
  );
}

export async function updateTransactionInSupabase(
  userId: string,
  txId: string,
  updates: Record<string, unknown>
) {
  const supabase = getSupabaseClient();
  if (!supabase || !isCloudDbSyncEnabled || !userId) return;
  await supabase
    .from('transactions')
    .update(updates)
    .eq('id', txId)
    .eq('user_id', userId);
}

export async function deleteTransactionFromSupabase(
  userId: string,
  txId: string
) {
  const supabase = getSupabaseClient();
  if (!supabase || !isCloudDbSyncEnabled || !userId) return;
  await supabase
    .from('transactions')
    .delete()
    .eq('id', txId)
    .eq('user_id', userId);
}

export async function clearAllTransactionsFromSupabase(userId: string) {
  const supabase = getSupabaseClient();
  if (!supabase || !isCloudDbSyncEnabled || !userId) return;
  await supabase.from('transactions').delete().eq('user_id', userId);
  await supabase.from('bank_accounts').delete().eq('user_id', userId);
}

export async function upsertBankToSupabase(userId: string, bank: BankAccount) {
  const supabase = getSupabaseClient();
  if (!supabase || !isCloudDbSyncEnabled || !userId) return;
  await supabase.from('bank_accounts').upsert(
    {
      user_id: userId,
      institution_id: bank.institutionId as BankInstitutionId,
      institution_name: bank.institutionName,
      account_type: bank.accountType,
      balance: bank.balance,
      color: bank.color,
      connected: bank.connected,
      pluggy_item_id: bank.pluggyItemId ?? null,
      last_sync_at: bank.lastSyncAt ?? null,
    },
    { onConflict: 'user_id,institution_id' }
  );
}
