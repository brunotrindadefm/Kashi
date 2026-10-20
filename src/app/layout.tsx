import type { Metadata, Viewport } from 'next';
import './globals.css';
import { FinanceProvider } from '@/context/FinanceContext';
import { AppShell } from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'Kashi — Gestão Financeira Inteligente & Open Finance',
  description:
    'Aplicativo pessoal de gestão financeira inteligente com suporte a Open Finance, classificação rápida de gastos (iFood, Uber, PIX) e previsão de lançamentos futuros.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Kashi',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#059669',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <FinanceProvider>
          <AppShell>{children}</AppShell>
        </FinanceProvider>
      </body>
    </html>
  );
}
