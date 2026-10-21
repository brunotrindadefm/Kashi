'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  BankAccount,
  BankInstitutionId,
  Category,
  ClassificationMatch,
  ClassificationRule,
  ToastMessage,
  ToastVariant,
  Transaction,
  TransactionStatus,
  TransactionType,
  UserProfile,
} from '@/types/finance';
import { DEFAULT_CATEGORIES, INITIAL_BANK_ACCOUNTS } from '@/lib/constants';
import { classifyTransaction, extractMerchantKey } from '@/lib/classifier';
import { getTodayIsoDate } from '@/lib/formatters';
import { ParsedStatementItem } from '@/lib/statementParser';
import {
  parseBankNotification,
  ParsedBankNotification,
} from '@/lib/notificationParser';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import {
  clearAllTransactionsFromSupabase,
  deleteTransactionFromSupabase,
  fetchUserStoreFromSupabase,
  insertTransactionsToSupabase,
  syncProfileToSupabase,
  updateTransactionInSupabase,
  upsertBankToSupabase,
} from '@/lib/supabaseDb';

interface NewTransactionInput {
  description: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  categoryId: string;
  date: string;
  bankId?: string;
}

interface NewCategoryInput {
  name: string;
  type: Category['type'];
  color: string;
  icon: string;
}

interface StoredAccountCredentials {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
}

interface UserScopedStore {
  profile: UserProfile;
  categories: Category[];
  transactions: Transaction[];
  banks: BankAccount[];
  rules: ClassificationRule[];
}

interface FinanceContextValue {
  isHydrated: boolean;
  isAuthenticated: boolean;
  profile: UserProfile;
  categories: Category[];
  transactions: Transaction[];
  banks: BankAccount[];
  rules: ClassificationRule[];
  pendingBankCount: number;
  toasts: ToastMessage[];
  notify: (title: string, description?: string, variant?: ToastVariant) => void;
  dismissToast: (id: string) => void;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (
    name: string,
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  recoverPassword: (email: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Omit<UserProfile, 'id'>>) => void;
  addTransaction: (input: NewTransactionInput) => void;
  updateTransactionCategory: (transactionId: string, categoryId: string) => void;
  confirmTransactionCategory: (transactionId: string) => void;
  settleUpcomingTransaction: (transactionId: string) => void;
  deleteTransaction: (transactionId: string) => void;
  clearAllTransactions: () => void;
  addCategory: (input: NewCategoryInput) => void;
  deleteCategory: (categoryId: string) => void;
  toggleBankConnection: (
    institutionId: BankInstitutionId,
    pluggyItemId?: string
  ) => void;
  updateBankBalance: (institutionId: BankInstitutionId, balance: number) => void;
  syncConnectedBanks: (specificInstitutionId?: BankInstitutionId) => Promise<number>;
  importStatementItems: (items: ParsedStatementItem[], bankId?: string) => number;
  ingestNotificationText: (rawText: string, appOrTitle?: string) => boolean;
  predictCategory: (description: string, type: TransactionType) => ClassificationMatch;
  deleteClassificationRule: (ruleId: string) => void;
}

const FinanceContext = createContext<FinanceContextValue | undefined>(undefined);

const STORAGE_SESSION_KEY = 'kashi_active_session_v1';
const STORAGE_USERS_KEY = 'kashi_registered_users_v1';
const getStoreKeyForUser = (userId: string) => `kashi_store_${userId}_v1`;

function createEmptyUserStore(user: { id: string; name: string; email: string }): UserScopedStore {
  return {
    profile: {
      id: user.id,
      name: user.name,
      email: user.email,
      darkMode: false,
      autoClassify: true,
    },
    categories: DEFAULT_CATEGORIES,
    transactions: [],
    banks: INITIAL_BANK_ACCOUNTS,
    rules: [],
  };
}

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    id: '',
    name: 'Usuário',
    email: '',
    darkMode: false,
    autoClassify: true,
  });
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [banks, setBanks] = useState<BankAccount[]>(INITIAL_BANK_ACCOUNTS);
  const [rules, setRules] = useState<ClassificationRule[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (title: string, description?: string, variant: ToastVariant = 'success') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [{ id, title, description, variant }, ...prev.slice(0, 3)]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3800);
    },
    []
  );

  const applyStoreToState = useCallback((store: UserScopedStore) => {
    setProfile(store.profile);
    setCategories(store.categories.length > 0 ? store.categories : DEFAULT_CATEGORIES);
    setTransactions(store.transactions);
    setBanks(store.banks.length > 0 ? store.banks : INITIAL_BANK_ACCOUNTS);
    setRules(store.rules);
  }, []);

  // Hydrate initial session from Supabase or LocalStorage
  useEffect(() => {
    async function initSession() {
      try {
        const supabase = getSupabaseClient();
        if (supabase) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.user) {
            const userId = session.user.id;
            const userEmail = session.user.email ?? '';
            const userName =
              (session.user.user_metadata?.name as string) ||
              userEmail.split('@')[0] ||
              'Usuário';

            const rawLocal = localStorage.getItem(getStoreKeyForUser(userId));
            if (rawLocal) {
              const parsed = JSON.parse(rawLocal) as UserScopedStore;
              applyStoreToState(parsed);
            } else {
              const fresh = createEmptyUserStore({
                id: userId,
                name: userName,
                email: userEmail,
              });
              localStorage.setItem(getStoreKeyForUser(userId), JSON.stringify(fresh));
              applyStoreToState(fresh);
            }
            setIsAuthenticated(true);
            setIsHydrated(true);

            const remoteStore = await fetchUserStoreFromSupabase({
              id: userId,
              name: userName,
              email: userEmail,
            });
            if (remoteStore) {
              localStorage.setItem(
                getStoreKeyForUser(userId),
                JSON.stringify(remoteStore)
              );
              applyStoreToState(remoteStore);
            }
            return;
          }
        }

        const rawSession = localStorage.getItem(STORAGE_SESSION_KEY);
        if (rawSession) {
          const sessionUser = JSON.parse(rawSession) as {
            id: string;
            name: string;
            email: string;
          };
          const rawStore = localStorage.getItem(getStoreKeyForUser(sessionUser.id));
          if (rawStore) {
            const parsed = JSON.parse(rawStore) as UserScopedStore;
            applyStoreToState(parsed);
          } else {
            const fresh = createEmptyUserStore(sessionUser);
            localStorage.setItem(getStoreKeyForUser(sessionUser.id), JSON.stringify(fresh));
            applyStoreToState(fresh);
          }
          setIsAuthenticated(true);
        }
      } catch {
        // Fallback if localStorage is blocked or corrupted
      } finally {
        setIsHydrated(true);
      }
    }

    initSession();
  }, [applyStoreToState]);

  // Sync dark mode class on <html>
  useEffect(() => {
    if (!isHydrated) return;
    const root = document.documentElement;
    if (profile.darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [profile.darkMode, isHydrated]);

  // Persist user-scoped store whenever state changes
  useEffect(() => {
    if (!isHydrated || !isAuthenticated || !profile.id) return;
    const store: UserScopedStore = {
      profile,
      categories,
      transactions,
      banks,
      rules,
    };
    try {
      localStorage.setItem(getStoreKeyForUser(profile.id), JSON.stringify(store));
    } catch {
      // Ignore storage quota errors
    }
  }, [isHydrated, isAuthenticated, profile, categories, transactions, banks, rules]);

  const learnMerchantRule = useCallback(
    (description: string, categoryId: string) => {
      if (!profile.autoClassify) return;
      const keyword = extractMerchantKey(description);
      if (!keyword || keyword.length < 2) return;

      setRules((prev) => {
        const existingIndex = prev.findIndex((r) => r.keyword === keyword);
        if (existingIndex >= 0) {
          const updated = [...prev];
          const current = updated[existingIndex];
          updated[existingIndex] = {
            ...current,
            categoryId,
            hitCount:
              current.categoryId === categoryId ? current.hitCount + 1 : 1,
            updatedAt: new Date().toISOString(),
          };
          return updated;
        }
        return [
          {
            id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            keyword,
            categoryId,
            hitCount: 1,
            updatedAt: new Date().toISOString(),
          },
          ...prev,
        ];
      });
    },
    [profile.autoClassify]
  );

  const predictCategory = useCallback(
    (description: string, type: TransactionType): ClassificationMatch => {
      return classifyTransaction(
        description,
        type,
        categories,
        profile.autoClassify ? rules : []
      );
    },
    [categories, rules, profile.autoClassify]
  );

  const appendParsedNotificationItem = useCallback(
    (parsed: ParsedBankNotification) => {
      const match = classifyTransaction(
        parsed.description,
        parsed.type,
        categories,
        profile.autoClassify ? rules : []
      );
      const matchedBank = parsed.institutionId
        ? banks.find((b) => b.institutionId === parsed.institutionId)
        : undefined;

      const newTx: Transaction = {
        id: `tx-wh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        description: parsed.description,
        amount: parsed.amount,
        type: parsed.type,
        status: 'completed',
        categoryId: match.categoryId,
        suggestedCategoryId: match.categoryId,
        pendingCategoryConfirmation: true,
        source: 'bank',
        bankId: matchedBank?.id,
        bankName: parsed.bankName,
        date: parsed.date,
        createdAt: new Date().toISOString(),
      };

      setTransactions((prev) => [newTx, ...prev]);
      insertTransactionsToSupabase(profile.id, [newTx]);
      return { newTx, categoryName: match.categoryName };
    },
    [banks, categories, profile.autoClassify, profile.id, rules]
  );

  // Poll /api/webhook/notification for incoming real-time phone notifications
  const drainQueuedWebhookNotifications = useCallback(async (): Promise<number> => {
    try {
      const res = await fetch('/api/webhook/notification', {
        method: 'GET',
        cache: 'no-store',
      });
      if (!res.ok) return 0;
      const data = (await res.json()) as {
        ok?: boolean;
        notifications?: ParsedBankNotification[];
      };
      const items = data.notifications ?? [];
      if (items.length === 0) return 0;

      for (const item of items) {
        appendParsedNotificationItem(item);
      }

      notify(
        `${items.length} notificação(ões) recebida(s) em tempo real!`,
        'Classificadas automaticamente e prontas para revisão.'
      );
      return items.length;
    } catch {
      return 0;
    }
  }, [appendParsedNotificationItem, notify]);

  useEffect(() => {
    if (!isHydrated || !isAuthenticated) return;
    drainQueuedWebhookNotifications();
    const interval = setInterval(() => {
      drainQueuedWebhookNotifications();
    }, 12000);
    return () => clearInterval(interval);
  }, [isHydrated, isAuthenticated, drainQueuedWebhookNotifications]);

  const ingestNotificationText = useCallback(
    (rawText: string, appOrTitle?: string): boolean => {
      const parsed = parseBankNotification(rawText, appOrTitle);
      if (!parsed) {
        notify(
          'Texto de notificação inválido',
          'Inclua um valor em Reais (ex: R$ 64,90) como nas notificações do banco.',
          'warning'
        );
        return false;
      }

      const { newTx, categoryName } = appendParsedNotificationItem(parsed);
      notify(
        'Notificação bancária capturada!',
        `${newTx.description} (R$ ${newTx.amount
          .toFixed(2)
          .replace('.', ',')}) → Sugestão: ${categoryName}`
      );
      return true;
    },
    [appendParsedNotificationItem, notify]
  );

  // Authentication Actions (Single-Owner Mode — Public Signups Disabled)
  const login = useCallback(
    async (
      email: string,
      password: string
    ): Promise<{ ok: boolean; error?: string }> => {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail || !password) {
        return { ok: false, error: 'Preencha seu e-mail e senha.' };
      }

      const configuredOwnerEmail = process.env.NEXT_PUBLIC_OWNER_EMAIL?.trim().toLowerCase();
      if (
        configuredOwnerEmail &&
        configuredOwnerEmail !== 'your-owner-email@example.com' &&
        normalizedEmail !== configuredOwnerEmail
      ) {
        return {
          ok: false,
          error: 'Acesso restrito exclusivamente ao proprietário do Kashi.',
        };
      }

      const supabase = getSupabaseClient();
      if (supabase && isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (error || !data.user) {
          return {
            ok: false,
            error: error?.message || 'Credenciais inválidas.',
          };
        }
        const userObj = {
          id: data.user.id,
          name:
            (data.user.user_metadata?.name as string) ||
            normalizedEmail.split('@')[0],
          email: normalizedEmail,
        };
        const remoteStore = await fetchUserStoreFromSupabase(userObj);
        const rawStore = localStorage.getItem(getStoreKeyForUser(userObj.id));
        const store =
          remoteStore ??
          (rawStore
            ? (JSON.parse(rawStore) as UserScopedStore)
            : createEmptyUserStore(userObj));
        localStorage.setItem(getStoreKeyForUser(userObj.id), JSON.stringify(store));
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(userObj));
        applyStoreToState(store);
        setIsAuthenticated(true);
        notify('Bem-vindo de volta!', `Sessão iniciada como ${store.profile.name}.`);
        return { ok: true };
      }

      const rawUsers = localStorage.getItem(STORAGE_USERS_KEY);
      const users: StoredAccountCredentials[] = rawUsers
        ? JSON.parse(rawUsers)
        : [];
      const found = users.find((u) => u.email.toLowerCase() === normalizedEmail);

      if (found) {
        if (found.passwordHash !== password) {
          return { ok: false, error: 'Senha incorreta para este e-mail.' };
        }
        const rawStore = localStorage.getItem(getStoreKeyForUser(found.id));
        const store = rawStore
          ? (JSON.parse(rawStore) as UserScopedStore)
          : createEmptyUserStore(found);
        localStorage.setItem(getStoreKeyForUser(found.id), JSON.stringify(store));
        localStorage.setItem(
          STORAGE_SESSION_KEY,
          JSON.stringify({ id: found.id, name: found.name, email: found.email })
        );
        applyStoreToState(store);
        setIsAuthenticated(true);
        notify('Bem-vindo de volta!', `Olá, ${store.profile.name}!`);
        return { ok: true };
      }

      // Single-Owner Lock in local mode: only allow bootstrapping if 0 accounts exist
      if (users.length >= 1) {
        return {
          ok: false,
          error:
            'Acesso restrito: este dispositivo já possui a conta única do proprietário configurada.',
        };
      }

      const inferredName = normalizedEmail
        .split('@')[0]
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());
      const newUser: StoredAccountCredentials = {
        id: `user-${Date.now()}`,
        name: inferredName || 'Proprietário',
        email: normalizedEmail,
        passwordHash: password,
      };
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify([newUser]));
      const freshStore = createEmptyUserStore(newUser);
      localStorage.setItem(getStoreKeyForUser(newUser.id), JSON.stringify(freshStore));
      localStorage.setItem(
        STORAGE_SESSION_KEY,
        JSON.stringify({
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
        })
      );
      applyStoreToState(freshStore);
      setIsAuthenticated(true);
      notify('Acesso do Proprietário configurado!', `Bem-vindo ao Kashi, ${newUser.name}.`);
      return { ok: true };
    },
    [applyStoreToState, notify]
  );

  const register = useCallback(async (): Promise<{
    ok: boolean;
    error?: string;
  }> => {
    return {
      ok: false,
      error:
        'Cadastros públicos estão desativados. O Kashi opera em modo proprietário único.',
    };
  }, []);

  const recoverPassword = useCallback(
    async (email: string): Promise<{ ok: boolean; error?: string }> => {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) {
        return { ok: false, error: 'Informe um endereço de e-mail válido.' };
      }

      const supabase = getSupabaseClient();
      if (supabase && isSupabaseConfigured) {
        const { error } = await supabase.auth.resetPasswordForEmail(
          normalizedEmail
        );
        if (error) {
          return { ok: false, error: error.message };
        }
      }

      notify(
        'Instruções enviadas!',
        `Enviamos o link de recuperação para ${normalizedEmail}.`,
        'info'
      );
      return { ok: true };
    },
    [notify]
  );

  const logout = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem(STORAGE_SESSION_KEY);
    setIsAuthenticated(false);
    document.documentElement.classList.remove('dark');
    notify('Sessão encerrada', 'Você saiu da sua conta com segurança.', 'info');
  }, [notify]);

  const updateProfile = useCallback(
    (updates: Partial<Omit<UserProfile, 'id'>>) => {
      setProfile((prev) => {
        const next = { ...prev, ...updates };
        syncProfileToSupabase(next);
        return next;
      });
      notify('Preferências salvas', 'Suas configurações foram atualizadas.');
    },
    [notify]
  );

  // Transactions Actions
  const addTransaction = useCallback(
    (input: NewTransactionInput) => {
      const selectedBank = banks.find((b) => b.id === input.bankId);
      const newTx: Transaction = {
        id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        description: input.description.trim(),
        amount: Math.abs(input.amount),
        type: input.type,
        status: input.status,
        categoryId: input.categoryId,
        pendingCategoryConfirmation: false,
        source: 'manual',
        bankId: selectedBank?.id,
        bankName: selectedBank?.institutionName,
        date: input.date || getTodayIsoDate(),
        createdAt: new Date().toISOString(),
      };

      setTransactions((prev) => [newTx, ...prev]);
      insertTransactionsToSupabase(profile.id, [newTx]);
      learnMerchantRule(newTx.description, newTx.categoryId);

      notify(
        input.status === 'completed'
          ? 'Lançamento registrado!'
          : 'Lançamento futuro agendado!',
        `${newTx.description} • R$ ${newTx.amount.toFixed(2).replace('.', ',')}`
      );
    },
    [banks, learnMerchantRule, notify, profile.id]
  );

  const updateTransactionCategory = useCallback(
    (transactionId: string, categoryId: string) => {
      const category = categories.find((c) => c.id === categoryId);
      let txDesc = '';
      setTransactions((prev) =>
        prev.map((tx) => {
          if (tx.id !== transactionId) return tx;
          txDesc = tx.description;
          return {
            ...tx,
            categoryId,
            suggestedCategoryId: categoryId,
            pendingCategoryConfirmation: false,
          };
        })
      );

      updateTransactionInSupabase(profile.id, transactionId, {
        category_id: categoryId,
        suggested_category_id: categoryId,
        pending_category_confirmation: false,
      });

      if (txDesc) {
        learnMerchantRule(txDesc, categoryId);
      }

      if (category) {
        notify(
          'Categoria atualizada',
          `Classificado em "${category.name}" (regra memorizada).`
        );
      }
    },
    [categories, learnMerchantRule, notify, profile.id]
  );

  const confirmTransactionCategory = useCallback(
    (transactionId: string) => {
      let confirmedTx: Transaction | undefined;
      setTransactions((prev) =>
        prev.map((tx) => {
          if (tx.id !== transactionId) return tx;
          confirmedTx = tx;
          return {
            ...tx,
            pendingCategoryConfirmation: false,
          };
        })
      );

      updateTransactionInSupabase(profile.id, transactionId, {
        pending_category_confirmation: false,
      });

      if (confirmedTx) {
        learnMerchantRule(confirmedTx.description, confirmedTx.categoryId);
        const cat = categories.find((c) => c.id === confirmedTx?.categoryId);
        notify(
          'Categoria confirmada!',
          `"${confirmedTx.description}" confirmado em ${cat?.name ?? 'Categoria'}.`
        );
      }
    },
    [categories, learnMerchantRule, notify, profile.id]
  );

  const settleUpcomingTransaction = useCallback(
    (transactionId: string) => {
      let settledTx: Transaction | undefined;
      const todayIso = getTodayIsoDate();
      setTransactions((prev) =>
        prev.map((tx) => {
          if (tx.id !== transactionId) return tx;
          settledTx = tx;
          return {
            ...tx,
            status: 'completed',
            date: todayIso,
          };
        })
      );

      updateTransactionInSupabase(profile.id, transactionId, {
        status: 'completed',
        date: todayIso,
      });

      if (settledTx) {
        notify(
          'Lançamento efetivado!',
          `"${settledTx.description}" foi movido para Últimas (Realizadas).`
        );
      }
    },
    [notify, profile.id]
  );

  const deleteTransaction = useCallback(
    (transactionId: string) => {
      const target = transactions.find((t) => t.id === transactionId);
      setTransactions((prev) => prev.filter((t) => t.id !== transactionId));
      deleteTransactionFromSupabase(profile.id, transactionId);
      if (target) {
        notify(
          'Transação excluída',
          `"${target.description}" foi removida com segurança.`,
          'info'
        );
      }
    },
    [notify, profile.id, transactions]
  );

  const clearAllTransactions = useCallback(() => {
    setTransactions([]);
    setBanks((prev) =>
      prev.map((b) => ({ ...b, balance: 0, connected: false, pluggyItemId: undefined }))
    );
    clearAllTransactionsFromSupabase(profile.id);
    notify(
      'Dados limpos!',
      'Todas as transações e conexões de teste foram removidas.',
      'info'
    );
  }, [notify, profile.id]);

  // Categories Actions
  const addCategory = useCallback(
    (input: NewCategoryInput) => {
      const trimmed = input.name.trim();
      if (!trimmed) return;
      const newCategory: Category = {
        id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: trimmed,
        type: input.type,
        color: input.color,
        icon: input.icon,
        isDefault: false,
      };
      setCategories((prev) => [...prev, newCategory]);
      notify('Nova categoria criada!', `A categoria "${trimmed}" já está disponível.`);
    },
    [notify]
  );

  const deleteCategory = useCallback(
    (categoryId: string) => {
      if (categories.length <= 1) {
        notify(
          'Ação não permitida',
          'Mantenha pelo menos uma categoria cadastrada.',
          'warning'
        );
        return;
      }
      const removed = categories.find((c) => c.id === categoryId);
      const remaining = categories.filter((c) => c.id !== categoryId);
      const fallbackId = remaining[0].id;

      setCategories(remaining);
      setTransactions((prev) =>
        prev.map((tx) =>
          tx.categoryId === categoryId
            ? { ...tx, categoryId: fallbackId }
            : tx
        )
      );
      setRules((prev) => prev.filter((r) => r.categoryId !== categoryId));

      if (removed) {
        notify(
          'Categoria removida',
          `"${removed.name}" foi excluída e os gráficos foram atualizados.`,
          'info'
        );
      }
    },
    [categories, notify]
  );

  // Bank Account Activation, Meu Pluggy (Free Personal Open Finance) & Webhook Sync
  const toggleBankConnection = useCallback(
    (institutionId: BankInstitutionId, pluggyItemId?: string) => {
      let connectedNow = false;
      let bankLabel = '';

      setBanks((prev) =>
        prev.map((bank) => {
          if (bank.institutionId !== institutionId) return bank;
          connectedNow = pluggyItemId ? true : !bank.connected;
          bankLabel = bank.institutionName;
          const updatedBank: BankAccount = {
            ...bank,
            connected: connectedNow,
            pluggyItemId: connectedNow
              ? pluggyItemId ?? bank.pluggyItemId
              : undefined,
            balance: connectedNow ? bank.balance : 0,
            lastSyncAt: connectedNow ? new Date().toISOString() : undefined,
          };
          upsertBankToSupabase(profile.id, updatedBank);
          return updatedBank;
        })
      );

      if (connectedNow) {
        notify(
          `${bankLabel} ativado!`,
          pluggyItemId
            ? 'Item ID do Meu Pluggy salvo! Clique em Sincronizar para puxar seu extrato real.'
            : 'Use o Meu Pluggy (meu.pluggy.ai), Webhook de Notificação ou CSV/OFX.'
        );
      } else {
        notify(
          `${bankLabel} desativado`,
          'A instituição foi desmarcada.',
          'info'
        );
      }
    },
    [notify, profile.id]
  );

  const updateBankBalance = useCallback(
    (institutionId: BankInstitutionId, balance: number) => {
      setBanks((prev) =>
        prev.map((b) => {
          if (b.institutionId !== institutionId) return b;
          const updatedBank = { ...b, balance, connected: true };
          upsertBankToSupabase(profile.id, updatedBank);
          return updatedBank;
        })
      );
      notify('Saldo atualizado', 'O saldo da conta foi salvo.');
    },
    [notify, profile.id]
  );

  const syncConnectedBanks = useCallback(
    async (specificInstitutionId?: BankInstitutionId): Promise<number> => {
      const webhookCount = await drainQueuedWebhookNotifications();

      const targetBanks = banks.filter((b) =>
        specificInstitutionId
          ? b.institutionId === specificInstitutionId && b.connected
          : b.connected
      );

      let totalImportedFromPluggy = 0;
      let lastErrorMsg = '';

      const existingSignatures = new Set(
        transactions.map(
          (tx) =>
            `${tx.date}|${tx.amount.toFixed(2)}|${tx.description
              .toLowerCase()
              .trim()}`
        )
      );

      let authHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const supabase = getSupabaseClient();
      if (supabase && isSupabaseConfigured) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token) {
          authHeaders = {
            ...authHeaders,
            Authorization: `Bearer ${session.access_token}`,
          };
        }
      }

      for (const bank of targetBanks) {
        try {
          const res = await fetch('/api/pluggy/sync', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ itemId: bank.pluggyItemId }),
          });
          const data = (await res.json()) as {
            ok?: boolean;
            totalBalance?: number;
            transactions?: {
              description: string;
              amount: number;
              type: 'expense' | 'income';
              status: 'completed' | 'upcoming';
              date: string;
            }[];
            error?: string;
          };

          if (!data.ok && data.error) {
            lastErrorMsg = data.error;
          }

          if (data.ok && data.transactions) {
            const uniquePluggyTxs = data.transactions.filter((t) => {
              const sig = `${t.date}|${t.amount.toFixed(
                2
              )}|${t.description.toLowerCase().trim()}`;
              if (existingSignatures.has(sig)) return false;
              existingSignatures.add(sig);
              return true;
            });

            const realTxs: Transaction[] = uniquePluggyTxs.map((t, idx) => {
              const match = classifyTransaction(
                t.description,
                t.type,
                categories,
                profile.autoClassify ? rules : []
              );
              return {
                id: `tx-pluggy-${bank.institutionId}-${Date.now()}-${idx}`,
                description: t.description,
                amount: t.amount,
                type: t.type,
                status: t.status,
                categoryId: match.categoryId,
                suggestedCategoryId: match.categoryId,
                pendingCategoryConfirmation: t.status === 'completed',
                source: 'bank',
                bankId: bank.id,
                bankName: bank.institutionName,
                date: t.date,
                createdAt: new Date().toISOString(),
              };
            });

            if (realTxs.length > 0) {
              setTransactions((prev) => [...realTxs, ...prev]);
              insertTransactionsToSupabase(profile.id, realTxs);
              totalImportedFromPluggy += realTxs.length;
            }

            if (typeof data.totalBalance === 'number') {
              setBanks((prev) =>
                prev.map((b) => {
                  if (b.id !== bank.id) return b;
                  const updatedBank = {
                    ...b,
                    balance: data.totalBalance ?? b.balance,
                    lastSyncAt: new Date().toISOString(),
                  };
                  upsertBankToSupabase(profile.id, updatedBank);
                  return updatedBank;
                })
              );
            }
          }
        } catch {
          // Continue to next bank
        }
      }

      const total = webhookCount + totalImportedFromPluggy;
      if (total > 0) {
        notify(
          'Sincronização Open Finance concluída!',
          `${total} nova(s) transação(ões) real(is) importada(s) e classificada(s).`
        );
      } else if (lastErrorMsg) {
        notify('Atenção na Sincronização', lastErrorMsg, 'info');
      } else {
        notify(
          'Tudo atualizado!',
          'Nenhuma transação nova pendente no Meu Pluggy ou Webhook neste momento.',
          'info'
        );
      }

      return total;
    },
    [
      banks,
      categories,
      drainQueuedWebhookNotifications,
      notify,
      profile.autoClassify,
      profile.id,
      rules,
      transactions,
    ]
  );

  const importStatementItems = useCallback(
    (items: ParsedStatementItem[], bankId?: string): number => {
      if (items.length === 0) {
        notify(
          'Nenhuma transação encontrada',
          'Verifique se o arquivo CSV ou OFX possui lançamentos válidos.',
          'warning'
        );
        return 0;
      }

      const selectedBank = banks.find((b) => b.id === bankId);

      // Deduplicate against existing transactions (same date + amount + description)
      const existingSignatures = new Set(
        transactions.map(
          (tx) =>
            `${tx.date}|${tx.amount.toFixed(2)}|${tx.description
              .toLowerCase()
              .trim()}`
        )
      );

      const uniqueItems = items.filter((item) => {
        const sig = `${item.date}|${item.amount.toFixed(
          2
        )}|${item.description.toLowerCase().trim()}`;
        if (existingSignatures.has(sig)) return false;
        existingSignatures.add(sig);
        return true;
      });

      if (uniqueItems.length === 0) {
        notify(
          'Nenhuma transação nova',
          'Todos os lançamentos deste extrato já haviam sido importados antes.',
          'info'
        );
        return 0;
      }

      const imported: Transaction[] = uniqueItems.map((item, idx) => {
        const match = classifyTransaction(
          item.description,
          item.type,
          categories,
          profile.autoClassify ? rules : []
        );
        return {
          id: `tx-import-${Date.now()}-${idx}-${Math.random()
            .toString(36)
            .slice(2, 6)}`,
          description: item.description,
          amount: item.amount,
          type: item.type,
          status: item.status,
          categoryId: match.categoryId,
          suggestedCategoryId: match.categoryId,
          pendingCategoryConfirmation: item.status === 'completed',
          source: 'import',
          bankId: selectedBank?.id,
          bankName: selectedBank?.institutionName ?? 'Extrato Importado',
          date: item.date,
          createdAt: new Date().toISOString(),
        };
      });

      setTransactions((prev) => [...imported, ...prev]);
      insertTransactionsToSupabase(profile.id, imported);
      const skipped = items.length - uniqueItems.length;
      notify(
        'Extrato importado com sucesso!',
        `${imported.length} novas transações classificadas${
          skipped > 0 ? ` (${skipped} duplicadas ignoradas)` : ''
        }.`
      );
      return imported.length;
    },
    [banks, categories, notify, profile.autoClassify, profile.id, rules, transactions]
  );

  const deleteClassificationRule = useCallback(
    (ruleId: string) => {
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
      notify('Regra removida', 'A memória deste estabelecimento foi apagada.', 'info');
    },
    [notify]
  );

  const pendingBankCount = useMemo(
    () => transactions.filter((t) => t.pendingCategoryConfirmation).length,
    [transactions]
  );

  const value = useMemo<FinanceContextValue>(
    () => ({
      isHydrated,
      isAuthenticated,
      profile,
      categories,
      transactions,
      banks,
      rules,
      pendingBankCount,
      toasts,
      notify,
      dismissToast,
      login,
      register,
      recoverPassword,
      logout,
      updateProfile,
      addTransaction,
      updateTransactionCategory,
      confirmTransactionCategory,
      settleUpcomingTransaction,
      deleteTransaction,
      clearAllTransactions,
      addCategory,
      deleteCategory,
      toggleBankConnection,
      updateBankBalance,
      syncConnectedBanks,
      importStatementItems,
      ingestNotificationText,
      predictCategory,
      deleteClassificationRule,
    }),
    [
      isHydrated,
      isAuthenticated,
      profile,
      categories,
      transactions,
      banks,
      rules,
      pendingBankCount,
      toasts,
      notify,
      dismissToast,
      login,
      register,
      recoverPassword,
      logout,
      updateProfile,
      addTransaction,
      updateTransactionCategory,
      confirmTransactionCategory,
      settleUpcomingTransaction,
      deleteTransaction,
      clearAllTransactions,
      addCategory,
      deleteCategory,
      toggleBankConnection,
      updateBankBalance,
      syncConnectedBanks,
      importStatementItems,
      ingestNotificationText,
      predictCategory,
      deleteClassificationRule,
    ]
  );

  return (
    <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
  );
}

export function useFinance(): FinanceContextValue {
  const ctx = useContext(FinanceContext);
  if (!ctx) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return ctx;
}
