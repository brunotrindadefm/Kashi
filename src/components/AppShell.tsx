'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useFinance } from '@/context/FinanceContext';
import { TopToaster } from '@/components/TopToaster';
import { BottomNav } from '@/components/BottomNav';

const PUBLIC_AUTH_ROUTES = ['/login', '/register', '/recover-password'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isHydrated, isAuthenticated } = useFinance();

  // Register PWA Service Worker
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Ignore service worker registration errors in dev
      });
    }
  }, []);

  const isAuthPage = PUBLIC_AUTH_ROUTES.includes(pathname);

  useEffect(() => {
    if (!isHydrated) return;
    if (!isAuthenticated && !isAuthPage) {
      router.replace('/login');
    } else if (isAuthenticated && isAuthPage) {
      router.replace('/');
    }
  }, [isHydrated, isAuthenticated, isAuthPage, router]);

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-black text-xl shadow-glow animate-pulse">
          K
        </div>
        <p className="mt-3 text-xs font-medium text-slate-400">
          Carregando Kashi...
        </p>
      </div>
    );
  }

  if (!isAuthenticated && !isAuthPage) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <TopToaster />
      <main
        className={`flex-1 w-full ${
          isAuthPage ? '' : 'max-w-3xl mx-auto pb-24 px-3.5 sm:px-6 pt-4 sm:pt-6'
        }`}
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
