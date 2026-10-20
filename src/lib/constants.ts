import type { BankAccount, BankInstitutionId, Category } from '../types/finance';

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

export interface SimulatedBankTransactionSeed {
  description: string;
  amount: number;
  type: 'expense' | 'income';
  status: 'completed' | 'upcoming';
  daysOffset: number; // Negative = past, Positive = future
}

export const BANK_SYNC_SAMPLE_BATCHES: Record<BankInstitutionId, { defaultBalance: number; transactions: SimulatedBankTransactionSeed[] }> = {
  nubank: {
    defaultBalance: 4280.5,
    transactions: [
      { description: 'iFood *Burger King Delivery', amount: 64.9, type: 'expense', status: 'completed', daysOffset: -1 },
      { description: 'Uber *Trip Centro', amount: 28.4, type: 'expense', status: 'completed', daysOffset: -2 },
      { description: 'PIX Enviado - Padaria Pao Dourado', amount: 32.0, type: 'expense', status: 'completed', daysOffset: -3 },
      { description: 'Netflix.com Assinatura', amount: 59.9, type: 'expense', status: 'completed', daysOffset: -5 },
      { description: 'PIX Recebido - Freelance UI Design', amount: 1450.0, type: 'income', status: 'completed', daysOffset: -6 },
      { description: 'Spotify Premium (Agendado)', amount: 21.9, type: 'expense', status: 'upcoming', daysOffset: 5 },
      { description: 'Fatura NuCartão - Parcela Notebook 03/06', amount: 420.0, type: 'expense', status: 'upcoming', daysOffset: 10 },
      // Previous months for rich 6-month line chart evolution
      { description: 'Salário Mensal Tech Corp', amount: 6500.0, type: 'income', status: 'completed', daysOffset: -32 },
      { description: 'Supermercado Carrefour', amount: 890.0, type: 'expense', status: 'completed', daysOffset: -35 },
      { description: 'Aluguel Apartamento', amount: 2100.0, type: 'expense', status: 'completed', daysOffset: -38 },
      { description: 'Salário Mensal Tech Corp', amount: 6500.0, type: 'income', status: 'completed', daysOffset: -62 },
      { description: 'Aluguel Apartamento', amount: 2100.0, type: 'expense', status: 'completed', daysOffset: -65 },
      { description: 'iFood *Sushi House', amount: 410.0, type: 'expense', status: 'completed', daysOffset: -68 },
    ],
  },
  itau: {
    defaultBalance: 7850.0,
    transactions: [
      { description: 'Salário Mensal Empresa S/A', amount: 6800.0, type: 'income', status: 'completed', daysOffset: -2 },
      { description: 'Droga Raia Farmacia', amount: 118.5, type: 'expense', status: 'completed', daysOffset: -3 },
      { description: 'Posto Shell Combustivel', amount: 240.0, type: 'expense', status: 'completed', daysOffset: -4 },
      { description: 'Condomínio Residencial Jardins', amount: 680.0, type: 'expense', status: 'completed', daysOffset: -7 },
      { description: 'Aluguel Mensal (Agendado)', amount: 2200.0, type: 'expense', status: 'upcoming', daysOffset: 7 },
      { description: 'Plano de Saúde Unimed (Agendado)', amount: 540.0, type: 'expense', status: 'upcoming', daysOffset: 12 },
      // Previous months
      { description: 'Salário Mensal Empresa S/A', amount: 6800.0, type: 'income', status: 'completed', daysOffset: -92 },
      { description: 'Aluguel Mensal', amount: 2200.0, type: 'expense', status: 'completed', daysOffset: -95 },
      { description: 'Cinema Cinemark Shopping', amount: 185.0, type: 'expense', status: 'completed', daysOffset: -98 },
    ],
  },
  inter: {
    defaultBalance: 3120.75,
    transactions: [
      { description: '99App *Corrida Urbana', amount: 22.8, type: 'expense', status: 'completed', daysOffset: -1 },
      { description: 'Amazon Prime Assinatura', amount: 19.9, type: 'expense', status: 'completed', daysOffset: -4 },
      { description: 'Restaurante Outback Steakhouse', amount: 178.0, type: 'expense', status: 'completed', daysOffset: -6 },
      { description: 'Dividendos FIIs e Ações', amount: 340.0, type: 'income', status: 'completed', daysOffset: -8 },
      { description: 'Internet Vivo Fibra 600Mb (Agendado)', amount: 129.9, type: 'expense', status: 'upcoming', daysOffset: 6 },
    ],
  },
  bradesco: {
    defaultBalance: 5490.2,
    transactions: [
      { description: 'Supermercado Pão de Açúcar', amount: 312.4, type: 'expense', status: 'completed', daysOffset: -2 },
      { description: 'Smart Fit Academia Mensalidade', amount: 139.9, type: 'expense', status: 'completed', daysOffset: -5 },
      { description: 'Seguro Auto Porto Seguro (Parcela 05/12)', amount: 295.0, type: 'expense', status: 'upcoming', daysOffset: 9 },
      { description: 'Conta de Energia Enel (Agendado)', amount: 198.5, type: 'expense', status: 'upcoming', daysOffset: 11 },
    ],
  },
};
