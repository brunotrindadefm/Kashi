# AGENT.md — Kashi Architecture, Context & Engineering Guide

> **Purpose of this document:** This file is the single source of truth for any AI coding agent or developer starting a new session on **Kashi**. Read this file completely before modifying code, adding features, or opening Pull Requests.

---

## 1. Product Overview

**Kashi** is a mobile-first Progressive Web App (PWA) for intelligent personal financial management with **Open Finance Brasil** support.
Its two core pillars are:
1. **Fast Expense & PIX Classification:** Automatically suggests categories for bank-synced or imported transactions (e.g., `iFood` → `Comida`, `Uber` → `Transporte`, `Netflix` → `Assinaturas`, `PIX` → learned recipient category) with 1-tap confirmation and inline `<select>` switching.
2. **Cash-Flow & Upcoming Expense Forecasting (`Seguintes`):** Separates completed transactions (`Últimas`) from scheduled/future obligations (`Seguintes`), showing both current **Available Monthly Balance** (`Receitas Últimas - Despesas Últimas`) and **Projected Balance After Upcoming** (`Saldo após Seguintes`).

### Language Convention
- **Source Code, Types, Identifiers, SQL, Git & Comments:** **100% English**.
- **URL Routes:** English (`/`, `/login`, `/register`, `/recover-password`, `/transactions`, `/profile`, `/banks`), with automatic redirects in `next.config.mjs` from `/perfil` → `/profile` and `/bancos` → `/banks`.
- **User-Facing UI Copy:** **Brazilian Portuguese (`pt-BR`)** (`Últimas`, `Seguintes`, `Receitas & Gastos`, `Onde Mais Gastei`, etc.).

---

## 2. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| **Framework** | Next.js 15 (App Router) + React 19 | Static + dynamic routes (`src/app/`) |
| **Language** | TypeScript 5 (`strict: true`) | Validated via `npm run typecheck` (`tsc --noEmit`) |
| **Styling & Theme** | Tailwind CSS 3.4 (`darkMode: 'class'`) | Modern FinTech Emerald (`#059669` / `#10b981`) + Slate surfaces |
| **Icons & Charts** | `lucide-react` + `recharts` | Donut chart (category distribution) & 6-month evolution line chart |
| **Database & Auth** | Supabase (`@supabase/supabase-js`) + LocalStorage fallback | Full PostgreSQL + RLS schema in `supabase/schema.sql`; seamlessly falls back to user-scoped LocalStorage when Supabase env vars are absent |
| **Open Finance & Import** | Pluggy SDK (`/api/pluggy/token`) + Bank Sync Simulator + CSV/OFX Importer | Supports Nubank, Itaú, Inter, and Bradesco + `.csv` and `.ofx` statement parsing |
| **Unit Testing** | Node.js native test runner (`node:test` + `node:assert/strict`) | Zero-dependency fast TypeScript execution via `npm test` |
| **PWA** | `public/manifest.json` + `public/sw.js` | Registered in `src/components/AppShell.tsx` |

---

## 3. Repository & Directory Structure

```text
Kashi/
├── .github/
│   └── PULL_REQUEST_TEMPLATE.md      # Standard PR template (/git-workflow + /pr-dolly)
├── public/
│   ├── icon.svg                      # Vector Emerald Kashi app icon
│   ├── manifest.json                 # PWA Web App Manifest
│   └── sw.js                         # Service Worker for offline shell caching
├── supabase/
│   └── schema.sql                    # PostgreSQL tables, RLS policies, and auth signup trigger
├── src/
│   ├── app/
│   │   ├── api/pluggy/token/route.ts # Pluggy Open Finance Brasil connect token endpoint
│   │   ├── banks/page.tsx            # Screen E: Bank Connections & Open Finance Sync (/banks)
│   │   ├── login/page.tsx            # Screen A1: Login (/login)
│   │   ├── profile/page.tsx          # Tab 3: Categories CRUD & Profile Settings (/profile)
│   │   ├── recover-password/page.tsx # Screen A3: Password Recovery (/recover-password)
│   │   ├── register/page.tsx         # Screen A2: Account Registration (/register)
│   │   ├── transactions/page.tsx     # Tab 2: Completed, Upcoming & New Transaction Form (/transactions)
│   │   ├── globals.css               # Tailwind layers & custom animations
│   │   ├── layout.tsx                # Root HTML shell, metadata, viewport & FinanceProvider
│   │   └── page.tsx                  # Tab 1: Home, Hero Card, Recharts & Top Categories (/)
│   ├── components/
│   │   ├── AppShell.tsx              # Auth route guard, SW registration, TopToaster & BottomNav wrapper
│   │   ├── BottomNav.tsx             # Fixed 3-tab bottom bar with pending confirmation badge
│   │   ├── CategoryIcon.tsx          # Dynamic Lucide icon resolver by string name
│   │   ├── DeleteTransactionModal.tsx# Mandatory confirmation modal before deleting any transaction
│   │   ├── StatementImportModal.tsx  # Modal for uploading and previewing .CSV / .OFX statements
│   │   ├── TopToaster.tsx            # Top-only notification stack (never covers BottomNav)
│   │   └── TransactionCard.tsx       # Clean transaction card with bottom category <select> strip
│   ├── context/
│   │   └── FinanceContext.tsx        # Central state engine (Auth, Transactions, Categories, Banks, Rules)
│   ├── lib/
│   │   ├── __tests__/finance.test.ts # Unit test suite for classifier, parser, and formatters
│   │   ├── classifier.ts             # Smart category classification engine & merchant key extractor
│   │   ├── constants.ts              # 8 default categories, icon/color palettes & bank sync templates
│   │   ├── formatters.ts             # BRL currency (R$) and pt-BR date formatters
│   │   ├── statementParser.ts        # CSV (comma/semicolon, BRL format) & OFX statement parsers
│   │   └── supabase.ts               # Supabase client singleton & env detection helper
│   └── types/
│       └── finance.ts                # Core TypeScript interfaces and domain types
├── .env.example                      # Documented environment variables (Supabase & Pluggy)
├── AGENT.md                          # This architectural & workflow reference guide
├── next.config.mjs                   # Next.js config + /perfil and /bancos redirects
├── package.json                      # Scripts and dependencies
├── tailwind.config.ts                # Tailwind theme & dark mode configuration
└── tsconfig.json                     # TypeScript compiler configuration
```

---

## 4. Mandatory UX & Product Invariants (DO NOT BREAK)

Whenever you modify UI components or pages, you **MUST** preserve these 6 non-negotiable product rules:

1. **Bottom Navigation (`BottomNav.tsx`):**
   - Fixed at the bottom of the viewport with exactly 3 tabs:
     1. **Home** (`/`)
     2. **Receitas & Gastos** (`/transactions`) — displays a badge with `pendingBankCount` whenever bank/imported transactions are awaiting category confirmation.
     3. **Perfil** (`/profile`)
   - Hidden on authentication pages (`/login`, `/register`, `/recover-password`).

2. **Notifications Always at the Top (`TopToaster.tsx`):**
   - All toast notifications (`success`, `error`, `warning`, `info`) **must** render at the top of the screen (`top-center` on mobile, `top-right` on desktop, `z-[100]`) so they **never** overlap or obstruct the bottom navigation bar.

3. **Clean Transaction Card Design (`TransactionCard.tsx`):**
   - **Zero label clutter:** Never render text labels such as `"Decidir categoria:"` before the category selector. The `<select>` element occupies the full bottom strip of the card with the category's color dot and icon.
   - **Discreet Top-Right Trash Button:** The delete icon (`Trash2`) sits in the top-right corner of the card.
   - **Mandatory Confirmation Modal (`DeleteTransactionModal.tsx`):** Clicking the trash button **never** deletes a transaction immediately. It always opens the centered confirmation modal displaying the transaction description and formatted `R$` value with **"Cancelar"** and **"Sim, Excluir"** buttons.

4. **Real Mobile & Desktop Responsiveness (`320px+`):**
   - Every list, card, and ranking table (`Onde Mais Gastei`) must use flexible layouts (`min-w-0`, `truncate` / `break-words`, `w-full` 100%-width progress bars) with no fixed-width table columns that clip or overflow on 320px screens.

5. **Clean-Slate Account Initialization:**
   - Authentication screens (`/login`) must **not** contain a "Demo Account" button.
   - Newly registered accounts start with **0 transactions** and **0 connected banks**, pre-populated only with the **8 default categories** (`Comida`, `Transporte`, `Moradia`, `Assinaturas`, `Saúde`, `Lazer`, `Salário`, `Renda Extra`).
   - Transactions populate when the user:
     - Connects a bank in `/banks` and clicks **"Sincronizar Banco"**;
     - Imports a `.csv` or `.ofx` statement via `StatementImportModal`; or
     - Submits the **"+ Lançar"** form in `/transactions`.

6. **Hero Card Balance Formula (`src/app/page.tsx`):**
   - **Saldo Disponível no Mês** = `Receitas (Últimas) - Despesas (Últimas)`
   - **Sub-indicator ("Saldo após Seguintes")** = `Receitas (Últimas) - Despesas (Últimas) - Gastos Seguintes (Previstos)`

---

## 5. Core Domain Subsystems

### 5.1. Smart Classification Engine (`src/lib/classifier.ts`)
`classifyTransaction(description, type, categories, userRules)` resolves a transaction's category in priority order:
1. **Learned User Memory (`reason: 'memory'`, confidence `0.98`):**
   - When a user confirms a bank suggestion (`confirmTransactionCategory`) or manually changes a transaction's category (`updateTransactionCategory`), `extractMerchantKey(description)` strips payment noise (`pix enviado`, `compra cartao`, installment numbers) and stores/increments a `ClassificationRule` (`keyword` → `categoryId`).
   - Future transactions matching that merchant or PIX recipient immediately resolve to the learned category.
2. **Built-in FinTech Keyword Dictionary (`reason: 'keyword'`, confidence `0.92`):**
   - Matches normalized tokens in `BUILTIN_KEYWORD_MAP` (`ifood`, `rappi`, `uber`, `99app`, `netflix`, `spotify`, `droga raia`, `aluguel`, `condominio`, `salario`, `freelance`, etc.) against the user's active categories.
3. **Dynamic Custom Category Match (`reason: 'keyword'`, confidence `0.85`):**
   - Matches if the transaction description contains the name of any custom category created by the user in `/profile`.
4. **Type-Safe Fallback (`reason: 'fallback'`):**
   - Falls back to the first category compatible with the transaction's type (`expense`, `income`, or `both`).

> **Future Extension Point (Jev / `@typesafe-ai/sdk`):**
> If `TYPESAFE_API_KEY` is evaluated in the future, add an async server route (`/api/classify`) calling `TypeSafeClient.systemOne` with `choice()` over the user's dynamic categories and `noul()` for recurring subscription detection **after** step 1 (User Memory) and before step 4 (Fallback).

### 5.2. Hybrid Persistence & Auth (`src/context/FinanceContext.tsx` & `src/lib/supabase.ts`)
- `isSupabaseConfigured` checks whether valid `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` environment variables are present.
- When configured, authentication uses Supabase Auth (`signInWithPassword`, `signUp`, `resetPasswordForEmail`, `signOut`), backed by the schema in `supabase/schema.sql`.
- When omitted, `FinanceContext` automatically falls back to LocalStorage scoped per user ID (`kashi_store_${userId}_v1` and `kashi_active_session_v1`), preserving multi-user isolation and session persistence across reloads.

### 5.3. Real Bank Data Ingestion (3 Zero-Mock Channels)
- **Strict Secret Hygiene:** `.env` and `.env.local` are strictly git-ignored. Agents and developers must **NEVER** read, print, log, or commit `.env.local` or credential values.
- **Channel 1 — Real-Time Mobile Push Notification Webhook (`100% Free`):**
  - `src/lib/notificationParser.ts` (`parseBankNotification`) extracts BRL amounts (`R$`), merchant/PIX descriptions, bank institutions (`nubank`, `itau`, `inter`, `bradesco`), and transaction type (`expense` vs `income`) from raw push notifications.
  - `POST /api/webhook/notification` (`src/app/api/webhook/notification/route.ts`) receives notifications forwarded by Android (**MacroDroid** / **Notification Forwarder**) or iOS (**Shortcuts / Apple Pay Automation**), and `FinanceContext` automatically drains and classifies incoming items.
- **Channel 2 — Pluggy Open Finance Brasil API (`/api/pluggy/token` & `/api/pluggy/sync`):**
  - Authenticates on the server using `PLUGGY_CLIENT_ID` + `PLUGGY_CLIENT_SECRET` (or `PLUGGY_API_KEY`) and fetches real accounts (`/accounts?itemId=...`) and transactions (`/transactions?accountId=...`) from `https://api.pluggy.ai`.
- **Channel 3 — CSV & OFX Statement Parser (`src/lib/statementParser.ts`):**
  - Supports comma (`,`) and semicolon (`;`) CSV files, Brazilian currency formatting (`-1.234,56`), ISO (`YYYY-MM-DD`) and Brazilian (`DD/MM/YYYY`) dates, and OFX `<STMTTRN>` blocks.
  - Transactions dated in the future (`date > today`) are automatically classified as `status: 'upcoming'` (`Seguintes`).

---

## 6. Development, Testing & Build Commands

Run these commands from the project root:

```bash
# 1. Start local development server (http://localhost:3000)
npm run dev

# 2. Run unit test suite (Node native test runner on src/lib/__tests__/finance.test.ts)
npm test

# 3. Run strict TypeScript check
npm run typecheck

# 4. Build optimized production bundle (verifies static + dynamic routes)
npm run build
```

> **Note on imports inside `src/lib/`:** Because `npm test` runs `src/lib/__tests__/finance.test.ts` directly via Node's native TypeScript runner (`node --test`), files inside `src/lib/` that are imported by tests should use relative imports with `.ts` extensions (enabled via `"allowImportingTsExtensions": true` in `tsconfig.json`).

---

## 7. Git Workflow & Pull Request Standards (`/git-workflow` & `/pr-dolly`)

All changes in this repository strictly follow the combined `/git-workflow` and `/pr-dolly` engineering standards:

1. **Default Branch:** `main` (never push directly to `main` for feature work; always use a branch and Pull Request).
2. **Branch Naming Format:**
   ```text
   #<issue_number>-<type>-<short-description>
   ```
   Example: `#2-feat-kashi-open-finance-pwa`, `#5-fix-csv-delimiter-detection`.
3. **Commit Message Format (Conventional Commits):**
   ```text
   <type>(<optional-scope>): <description in lower case>
   ```
   - Allowed types: `feat`, `fix`, `refactor`, `chore`, `test`, `docs`, `revert`.
   - Written in **English**, imperative mood, lowercase summary after `:`, under 72 characters.
   - Keep commits **atomic and granular** (separate config, DB, domain logic, UI components, pages, tests, and docs).
4. **Pull Request Format (`.github/PULL_REQUEST_TEMPLATE.md`):**
   - **Title:** `<type>(#<issue_number>): <description in lower case>`
   - **Body Sections:**
     - `## Description` + `Linked Issue: Closes #<issue_number>`
     - `## Problem` & `## Solution` (`/pr-dolly` narrative context)
     - `## Type of Change`
     - `## Technical Details & Changes`
     - `## Verification & Testing (How tested)` (include output from `npm test`, `npm run typecheck`, and `npm run build`)
     - `## Checklist`
