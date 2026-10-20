'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeftRight, Home, User } from 'lucide-react';
import { useFinance } from '@/context/FinanceContext';

const AUTH_ROUTES = ['/login', '/register', '/recover-password'];

export function BottomNav() {
  const pathname = usePathname();
  const { isAuthenticated, pendingBankCount } = useFinance();

  if (!isAuthenticated || AUTH_ROUTES.includes(pathname)) {
    return null;
  }

  const tabs = [
    {
      href: '/',
      label: 'Home',
      icon: Home,
      isActive: pathname === '/' || pathname === '/banks',
      badge: 0,
    },
    {
      href: '/transactions',
      label: 'Receitas & Gastos',
      icon: ArrowLeftRight,
      isActive: pathname.startsWith('/transactions'),
      badge: pendingBankCount,
    },
    {
      href: '/profile',
      label: 'Perfil',
      icon: User,
      isActive: pathname.startsWith('/profile'),
      badge: 0,
    },
  ];

  return (
    <nav
      aria-label="Navegação Principal"
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800"
    >
      <div className="max-w-3xl mx-auto px-2 h-16 grid grid-cols-3 items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex flex-col items-center justify-center py-1.5 rounded-xl transition-colors ${
                tab.isActive
                  ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    tab.isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.9]'
                  }`}
                />
                {tab.badge > 0 && (
                  <span
                    title={`${tab.badge} transações pendentes de confirmação`}
                    className="absolute -top-1.5 -right-3.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm ring-2 ring-white dark:ring-slate-900"
                  >
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1 leading-none tracking-tight truncate max-w-full px-1">
                {tab.label}
              </span>
              {tab.isActive && (
                <span className="absolute bottom-1 w-6 h-0.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
