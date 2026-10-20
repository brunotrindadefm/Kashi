-- ============================================================================
-- Kashi — Smart Personal Finance & Open Finance Database Schema (Supabase)
-- Includes Row Level Security (RLS) per user and automatic default categories
-- ============================================================================

create extension if not exists "uuid-ossp";

-- 1. User Profiles Table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Usuário',
  email text not null,
  dark_mode boolean not null default false,
  auto_classify boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 2. Categories Table
create table if not exists public.categories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('expense', 'income', 'both')),
  color text not null default '#10b981',
  icon text not null default 'Tag',
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

create policy "Users can manage their own categories"
  on public.categories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. Connected Bank Accounts (Open Finance / Pluggy)
create table if not exists public.bank_accounts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  institution_id text not null,
  institution_name text not null,
  account_type text not null default 'Conta Corrente',
  balance numeric(14, 2) not null default 0,
  color text not null default '#059669',
  connected boolean not null default true,
  pluggy_item_id text,
  last_sync_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.bank_accounts enable row level security;

create policy "Users can manage their own bank accounts"
  on public.bank_accounts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. Transactions Table (Completed / "Últimas" & Upcoming / "Seguintes")
create table if not exists public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  amount numeric(14, 2) not null check (amount >= 0),
  type text not null check (type in ('expense', 'income')),
  status text not null check (status in ('completed', 'upcoming')),
  category_id uuid references public.categories(id) on delete set null,
  suggested_category_id uuid references public.categories(id) on delete set null,
  pending_category_confirmation boolean not null default false,
  source text not null default 'manual' check (source in ('manual', 'bank', 'import')),
  bank_id text,
  bank_name text,
  date date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.transactions enable row level security;

create policy "Users can manage their own transactions"
  on public.transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5. Learned Classification Rules (Merchant / PIX Memory per User)
create table if not exists public.classification_rules (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  keyword text not null,
  category_id uuid not null references public.categories(id) on delete cascade,
  confidence numeric(4, 3) not null default 1.0,
  hit_count integer not null default 1,
  updated_at timestamptz not null default now(),
  unique(user_id, keyword)
);

alter table public.classification_rules enable row level security;

create policy "Users can manage their own classification rules"
  on public.classification_rules for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 6. Trigger to create Profile and Default Categories on Auth Signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  );

  insert into public.categories (user_id, name, type, color, icon, is_default)
  values
    (new.id, 'Comida', 'expense', '#f97316', 'Utensils', true),
    (new.id, 'Transporte', 'expense', '#3b82f6', 'Car', true),
    (new.id, 'Moradia', 'expense', '#8b5cf6', 'Home', true),
    (new.id, 'Assinaturas', 'expense', '#ec4899', 'Tv', true),
    (new.id, 'Saúde', 'expense', '#ef4444', 'HeartPulse', true),
    (new.id, 'Lazer', 'expense', '#eab308', 'Gamepad2', true),
    (new.id, 'Salário', 'income', '#10b981', 'Briefcase', true),
    (new.id, 'Renda Extra', 'both', '#06b6d4', 'TrendingUp', true);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
