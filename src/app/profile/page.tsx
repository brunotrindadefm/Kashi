'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BrainCircuit,
  Check,
  LogOut,
  Moon,
  Palette,
  Plus,
  Save,
  Settings,
  Sun,
  Tag,
  Trash2,
  User,
} from 'lucide-react';
import { useFinance } from '@/context/FinanceContext';
import {
  CATEGORY_COLOR_PALETTE,
  CATEGORY_ICON_OPTIONS,
} from '@/lib/constants';
import { CategoryType } from '@/types/finance';
import { CategoryIcon } from '@/components/CategoryIcon';

type ProfileSubTab = 'categories' | 'settings';

export default function ProfilePage() {
  const router = useRouter();
  const {
    profile,
    categories,
    rules,
    updateProfile,
    addCategory,
    deleteCategory,
    deleteClassificationRule,
    logout,
  } = useFinance();

  const [activeSubTab, setActiveSubTab] = useState<ProfileSubTab>('categories');

  // New Category Form State
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<CategoryType>('expense');
  const [newCatColor, setNewCatColor] = useState(CATEGORY_COLOR_PALETTE[0]);
  const [newCatIcon, setNewCatIcon] = useState(CATEGORY_ICON_OPTIONS[0].name);

  // Profile Edit State
  const [nameInput, setNameInput] = useState(profile.name);
  const [emailInput, setEmailInput] = useState(profile.email);

  useEffect(() => {
    setNameInput(profile.name);
    setEmailInput(profile.email);
  }, [profile.name, profile.email]);

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    addCategory({
      name: newCatName.trim(),
      type: newCatType,
      color: newCatColor,
      icon: newCatIcon,
    });
    setNewCatName('');
  };

  const handleSaveProfileInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim() || !emailInput.trim()) return;
    updateProfile({
      name: nameInput.trim(),
      email: emailInput.trim(),
    });
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white font-black text-xl flex items-center justify-center shrink-0 shadow-glow">
            {profile.name.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-extrabold text-slate-900 dark:text-white truncate">
              {profile.name}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {profile.email}
            </p>
          </div>
        </div>
      </header>

      {/* Sub-tabs: Categorias | Perfil & Configurações */}
      <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl bg-slate-200/70 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveSubTab('categories')}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeSubTab === 'categories'
              ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>Categorias ({categories.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('settings')}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeSubTab === 'settings'
              ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Perfil & Configurações</span>
        </button>
      </div>

      {/* SUB-TAB 1: Categorias */}
      {activeSubTab === 'categories' && (
        <div className="space-y-5">
          {/* Add New Category Card */}
          <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-soft">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-3.5 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Adicionar Nova Categoria
            </h2>

            <form onSubmit={handleAddCategory} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="cat-name"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Nome da Categoria
                  </label>
                  <input
                    id="cat-name"
                    type="text"
                    required
                    placeholder="Ex: Pets, Educação, Café..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="cat-type"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Tipo
                  </label>
                  <select
                    id="cat-type"
                    value={newCatType}
                    onChange={(e) =>
                      setNewCatType(e.target.value as CategoryType)
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="expense">Despesa</option>
                    <option value="income">Receita</option>
                    <option value="both">Ambos (Receita e Despesa)</option>
                  </select>
                </div>
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-emerald-500" />
                  Cor da Categoria
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_COLOR_PALETTE.map((color) => {
                    const selected = newCatColor === color;
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewCatColor(color)}
                        aria-label={`Cor ${color}`}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform ${
                          selected
                            ? 'scale-110 ring-2 ring-offset-2 ring-slate-900 dark:ring-white dark:ring-offset-slate-900'
                            : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      >
                        {selected && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Icon Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Ícone
                </label>
                <div className="grid grid-cols-6 sm:grid-cols-9 gap-2">
                  {CATEGORY_ICON_OPTIONS.map((opt) => {
                    const selected = newCatIcon === opt.name;
                    return (
                      <button
                        key={opt.name}
                        type="button"
                        onClick={() => setNewCatIcon(opt.name)}
                        title={opt.label}
                        className={`p-2.5 rounded-xl border flex items-center justify-center transition-all ${
                          selected
                            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shadow-sm'
                            : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <CategoryIcon name={opt.name} className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                Criar Categoria
              </button>
            </form>
          </section>

          {/* Existing Categories List */}
          <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-soft">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-3.5">
              Categorias Ativas ({categories.length})
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between gap-2 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: `${cat.color}20`,
                        color: cat.color,
                      }}
                    >
                      <CategoryIcon name={cat.icon} className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                        {cat.name}
                      </p>
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {cat.type === 'expense'
                          ? 'Despesa'
                          : cat.type === 'income'
                          ? 'Receita'
                          : 'Receita & Despesa'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteCategory(cat.id)}
                    title={`Remover categoria ${cat.name}`}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* SUB-TAB 2: Perfil & Configurações */}
      {activeSubTab === 'settings' && (
        <div className="space-y-5">
          {/* Edit User Name & Email */}
          <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-soft">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-3.5 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Dados Pessoais
            </h2>

            <form onSubmit={handleSaveProfileInfo} className="space-y-3.5">
              <div>
                <label
                  htmlFor="profile-name"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Nome
                </label>
                <input
                  id="profile-name"
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label
                  htmlFor="profile-email"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  E-mail
                </label>
                <input
                  id="profile-email"
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                Salvar Dados
              </button>
            </form>
          </section>

          {/* Preferences Toggles: Dark Mode & Smart Auto-Classification */}
          <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-soft space-y-4">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Preferências do Aplicativo
            </h2>

            {/* Dark Mode Toggle */}
            <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-slate-200/80 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-amber-300 shrink-0">
                  {profile.darkMode ? (
                    <Moon className="w-4 h-4" />
                  ) : (
                    <Sun className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Modo Escuro (Dark Mode)
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Alternar paleta escura Slate/Esmeralda
                  </p>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={profile.darkMode}
                onClick={() => updateProfile({ darkMode: !profile.darkMode })}
                className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${
                  profile.darkMode
                    ? 'bg-emerald-600'
                    : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                    profile.darkMode ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Smart Auto-Classification Toggle */}
            <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <BrainCircuit className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Auto-classificação Inteligente
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Sugerir categorias para iFood, Uber, PIX e aprender com suas
                    escolhas
                  </p>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={profile.autoClassify}
                onClick={() =>
                  updateProfile({ autoClassify: !profile.autoClassify })
                }
                className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${
                  profile.autoClassify
                    ? 'bg-emerald-600'
                    : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                    profile.autoClassify ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Learned Rules Memory List */}
            {rules.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Memória de Estabelecimentos & PIX ({rules.length}):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {rules.map((rule) => {
                    const cat = categories.find((c) => c.id === rule.categoryId);
                    return (
                      <span
                        key={rule.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200"
                      >
                        <span className="font-medium">&ldquo;{rule.keyword}&rdquo;</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          → {cat?.name ?? 'Categoria'}
                        </span>
                        <button
                          type="button"
                          onClick={() => deleteClassificationRule(rule.id)}
                          className="text-slate-400 hover:text-red-500 ml-0.5"
                          title="Esquecer regra"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* Logout Button */}
          <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-soft">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-3 px-4 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-950/70 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sair da Conta
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
