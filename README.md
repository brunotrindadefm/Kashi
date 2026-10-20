# Kashi — Smart Personal Finance & Open Finance PWA

**Kashi** is a mobile-first Progressive Web App (PWA) for intelligent personal financial management with Open Finance Brasil support, built to classify daily transactions (such as iFood, Uber, PIX, and Netflix) in 1 tap and forecast upcoming bills (`Seguintes`).

## Tech Stack
- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Styling & Charts:** Tailwind CSS + Lucide Icons + Recharts (Donut & 6-Month Evolution Line Chart)
- **Database & Auth:** Supabase (`@supabase/supabase-js` with PostgreSQL + RLS per user) with automatic **LocalStorage fallback** when environment variables are omitted
- **Open Finance & Statements:** Pluggy SDK integration endpoint (`/api/pluggy/token`) + Open Finance Bank Sync Simulator (Nubank, Itaú, Inter, Bradesco) + **CSV / OFX Statement Importer**
- **Smart Classification Engine:** Keyword rule engine + per-user Merchant/PIX memory (`src/lib/classifier.ts`)

## Getting Started Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Supabase Setup (Optional)
1. Create a new Supabase project and run the SQL script in [`supabase/schema.sql`](./supabase/schema.sql) inside the Supabase SQL Editor.
2. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Production Build & Deploy on Vercel

```bash
npm run build
npm start
```
