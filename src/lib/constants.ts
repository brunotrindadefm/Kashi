import type { BankAccount, Category } from '../types/finance';

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'cat-food',
    name: 'Comida',
    type: 'expense',
    color: '#f97316',
    icon: 'Utensils',
    isDefault: true,
  },
  {
    id: 'cat-transport',
    name: 'Transporte',
    type: 'expense',
    color: '#3b82f6',
    icon: 'Car',
    isDefault: true,
  },
  {
    id: 'cat-housing',
    name: 'Moradia',
    type: 'expense',
    color: '#8b5cf6',
    icon: 'Home',
    isDefault: true,
  },
  {
    id: 'cat-subscriptions',
    name: 'Assinaturas',
    type: 'expense',
    color: '#ec4899',
    icon: 'Tv',
    isDefault: true,
  },
  {
    id: 'cat-health',
    name: 'Saúde',
    type: 'expense',
    color: '#ef4444',
    icon: 'HeartPulse',
    isDefault: true,
  },
  {
    id: 'cat-leisure',
    name: 'Lazer',
    type: 'expense',
    color: '#eab308',
    icon: 'Gamepad2',
    isDefault: true,
  },
  {
    id: 'cat-salary',
    name: 'Salário',
    type: 'income',
    color: '#10b981',
    icon: 'Briefcase',
    isDefault: true,
  },
  {
    id: 'cat-extra-income',
    name: 'Renda Extra',
    type: 'both',
    color: '#06b6d4',
    icon: 'TrendingUp',
    isDefault: true,
  },
];

export const CATEGORY_COLOR_PALETTE = [
  '#10b981', // Emerald
  '#f97316', // Orange
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#ef4444', // Red
  '#eab308', // Amber
  '#06b6d4', // Cyan
  '#14b8a6', // Teal
  '#6366f1', // Indigo
  '#f43f5e', // Rose
  '#84cc16', // Lime
];

export const CATEGORY_ICON_OPTIONS = [
  { name: 'Utensils', label: 'Alimentação' },
  { name: 'Car', label: 'Transporte' },
  { name: 'Home', label: 'Moradia' },
  { name: 'Tv', label: 'Assinaturas' },
  { name: 'HeartPulse', label: 'Saúde' },
  { name: 'Gamepad2', label: 'Lazer' },
  { name: 'Briefcase', label: 'Trabalho' },
  { name: 'TrendingUp', label: 'Investimentos' },
  { name: 'ShoppingBag', label: 'Compras' },
  { name: 'Coffee', label: 'Café / Padaria' },
  { name: 'Plane', label: 'Viagem' },
  { name: 'GraduationCap', label: 'Educação' },
  { name: 'Dumbbell', label: 'Academia' },
  { name: 'Smartphone', label: 'Celular / Tech' },
  { name: 'Zap', label: 'Energia / Contas' },
  { name: 'PiggyBank', label: 'Reserva' },
  { name: 'Wallet', label: 'Carteira' },
  { name: 'Tag', label: 'Geral' },
];

export const INITIAL_BANK_ACCOUNTS: BankAccount[] = [
  {
    id: 'bank-nubank',
    institutionId: 'nubank',
    institutionName: 'Nubank',
    shortCode: 'NU',
    accountType: 'NuConta & Ultravioleta',
    balance: 0,
    color: '#820ad1',
    accentBg: 'from-[#820ad1] to-[#5b0794]',
    connected: false,
  },
  {
    id: 'bank-itau',
    institutionId: 'itau',
    institutionName: 'Itaú Unibanco',
    shortCode: 'IT',
    accountType: 'Conta Corrente & Cartão',
    balance: 0,
    color: '#ec7000',
    accentBg: 'from-[#ec7000] to-[#c25900]',
    connected: false,
  },
  {
    id: 'bank-inter',
    institutionId: 'inter',
    institutionName: 'Banco Inter',
    shortCode: 'IN',
    accountType: 'Conta Digital Global',
    balance: 0,
    color: '#ff7a00',
    accentBg: 'from-[#ff7a00] to-[#d96500]',
    connected: false,
  },
  {
    id: 'bank-bradesco',
    institutionId: 'bradesco',
    institutionName: 'Bradesco',
    shortCode: 'BR',
    accountType: 'Conta Exclusive',
    balance: 0,
    color: '#cc092f',
    accentBg: 'from-[#cc092f] to-[#990622]',
    connected: false,
  },
];
