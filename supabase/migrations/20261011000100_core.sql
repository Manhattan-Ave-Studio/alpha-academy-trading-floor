-- Alpha Academy Trading Floor
-- Migration 1 of 4: schema, security helpers, and row level security.
--
-- Design notes
-- * Every write goes through a SECURITY DEFINER function, so students and mentors
--   never insert or update tables directly. Row level security only grants reads.
-- * Functions use `set search_path = ''` and fully qualified names (Supabase advisor guidance).
-- * private.* holds internal helpers and secrets. It is not exposed through the Data API.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

-- Clock: tests can pin time with `set app.now = '...'`. Clients cannot run SET through the Data API.
create or replace function private.clock()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select coalesce(nullif(current_setting('app.now', true), '')::timestamptz, now())
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.mentors (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) <= 60),
  created_at timestamptz not null default now()
);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  join_code text not null unique check (join_code ~ '^[A-Z0-9]{4,10}$'),
  status text not null default 'active' check (status in ('active', 'paused', 'ended')),
  starting_cash numeric(14, 2) not null default 100000 check (starting_cash between 100 and 10000000),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  allow_fractional boolean not null default true,
  max_position_pct numeric(5, 2) check (max_position_pct is null or (max_position_pct > 0 and max_position_pct <= 100)),
  min_share_price numeric(10, 2) not null default 1 check (min_share_price >= 0),
  commission numeric(10, 2) not null default 0 check (commission >= 0 and commission <= 100),
  show_holdings boolean not null default false,
  announcement text check (announcement is null or char_length(announcement) <= 500),
  benchmark_symbol text not null default 'SPY',
  benchmark_start_price numeric(14, 4),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  display_name text not null check (char_length(display_name) between 2 and 24),
  cash numeric(16, 4) not null,
  realized_pl numeric(16, 4) not null default 0,
  created_at timestamptz not null default now(),
  last_active_at timestamptz,
  unique (game_id, user_id)
);
create unique index players_game_name_key on public.players (game_id, lower(display_name));
create index players_user_idx on public.players (user_id);

create table private.player_secrets (
  player_id uuid primary key references public.players (id) on delete cascade,
  pin_hash text not null,
  failed_attempts int not null default 0,
  locked_until timestamptz
);

create table private.settings (
  key text primary key,
  value text not null
);

create table public.symbols (
  symbol text primary key check (symbol ~ '^[A-Z][A-Z0-9.\-]{0,9}$'),
  name text not null,
  exchange text,
  asset_type text not null default 'stock' check (asset_type in ('stock', 'etf')),
  sector text,
  blurb text,
  featured boolean not null default false,
  collections text[] not null default '{}',
  tradable boolean not null default true,
  last_viewed_at timestamptz,
  updated_at timestamptz not null default now()
);
create index symbols_featured_idx on public.symbols (featured) where featured;
create index symbols_name_idx on public.symbols (lower(name) text_pattern_ops);

create table public.quotes (
  symbol text primary key references public.symbols (symbol) on delete cascade,
  price numeric(14, 4) not null check (price > 0),
  prev_close numeric(14, 4),
  open numeric(14, 4),
  high numeric(14, 4),
  low numeric(14, 4),
  volume bigint,
  bid numeric(14, 4),
  ask numeric(14, 4),
  trade_time timestamptz,
  source text not null default 'alpaca',
  updated_at timestamptz not null default now()
);

create table public.daily_bars (
  symbol text not null references public.symbols (symbol) on delete cascade,
  d date not null,
  o numeric(14, 4),
  h numeric(14, 4),
  l numeric(14, 4),
  c numeric(14, 4) not null,
  v bigint,
  primary key (symbol, d)
);

create table public.market_calendar (
  d date primary key,
  open_time time not null,
  close_time time not null,
  source text not null default 'seed'
);

create table public.market_cache (
  key text primary key,
  payload jsonb not null,
  fetched_at timestamptz not null default now()
);

create table public.app_status (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  game_id uuid not null references public.games (id) on delete cascade,
  symbol text not null references public.symbols (symbol),
  side text not null check (side in ('buy', 'sell')),
  order_type text not null check (order_type in ('market', 'limit', 'stop', 'stop_limit')),
  qty numeric(18, 6) check (qty is null or qty > 0),
  notional numeric(14, 2) check (notional is null or notional > 0),
  limit_price numeric(14, 4) check (limit_price is null or limit_price > 0),
  stop_price numeric(14, 4) check (stop_price is null or stop_price > 0),
  time_in_force text not null default 'day' check (time_in_force in ('day', 'gtc')),
  status text not null default 'open' check (status in ('open', 'filled', 'cancelled', 'rejected', 'expired')),
  stop_triggered boolean not null default false,
  filled_qty numeric(18, 6),
  filled_price numeric(14, 4),
  filled_at timestamptz,
  reason text,
  note text check (note is null or char_length(note) <= 280),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((qty is null) <> (notional is null))
);
create index orders_open_idx on public.orders (created_at) where status = 'open';
create index orders_player_idx on public.orders (player_id, created_at desc);
create index orders_game_idx on public.orders (game_id);

create table public.positions (
  player_id uuid not null references public.players (id) on delete cascade,
  symbol text not null references public.symbols (symbol),
  qty numeric(18, 6) not null check (qty > 0),
  avg_cost numeric(16, 4) not null check (avg_cost >= 0),
  opened_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (player_id, symbol)
);

create table public.transactions (
  id bigint generated always as identity primary key,
  player_id uuid not null references public.players (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  kind text not null check (kind in ('buy', 'sell', 'adjustment', 'reset')),
  symbol text,
  qty numeric(18, 6),
  price numeric(14, 4),
  amount numeric(16, 4) not null,
  fee numeric(10, 2) not null default 0,
  realized_pl numeric(16, 4),
  cash_after numeric(16, 4) not null,
  note text,
  created_at timestamptz not null default now()
);
create index transactions_player_idx on public.transactions (player_id, created_at desc);

create table public.watchlist (
  player_id uuid not null references public.players (id) on delete cascade,
  symbol text not null references public.symbols (symbol),
  added_at timestamptz not null default now(),
  primary key (player_id, symbol)
);

create table public.portfolio_snapshots (
  player_id uuid not null references public.players (id) on delete cascade,
  d date not null,
  total_value numeric(16, 2) not null,
  cash numeric(16, 2) not null,
  primary key (player_id, d)
);

create table public.lesson_progress (
  player_id uuid not null references public.players (id) on delete cascade,
  lesson_id text not null check (char_length(lesson_id) <= 64),
  score int not null check (score between 0 and 100),
  completed_at timestamptz not null default now(),
  primary key (player_id, lesson_id)
);

-- ---------------------------------------------------------------------------
-- Security helpers (SECURITY DEFINER so policies can call them without recursion)
-- ---------------------------------------------------------------------------

create or replace function private.is_mentor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.mentors m where m.user_id = (select auth.uid()))
$$;

create or replace function private.my_player_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id from public.players p where p.user_id = (select auth.uid())
$$;

create or replace function private.my_game_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.game_id from public.players p where p.user_id = (select auth.uid())
$$;

create or replace function private.can_view_player(p_player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.is_mentor())
      or exists (
        select 1
        from public.players p
        join public.games g on g.id = p.game_id
        where p.id = p_player_id
          and (
            p.user_id = (select auth.uid())
            or (g.show_holdings and p.game_id in (select private.my_game_ids()))
          )
      )
$$;

-- Returns the caller's player row (locked) or raises.
create or replace function private.own_player(p_player_id uuid)
returns public.players
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.players;
begin
  select * into p
  from public.players
  where id = p_player_id and user_id = (select auth.uid())
  for update;
  if not found then
    raise exception 'That player does not belong to this account. Try rejoining your game.';
  end if;
  return p;
end;
$$;

create or replace function private.assert_mentor()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_mentor() then
    raise exception 'Mentor access is required for this action.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row level security: reads only. All writes happen in functions.
-- ---------------------------------------------------------------------------

alter table public.mentors enable row level security;
alter table public.games enable row level security;
alter table public.players enable row level security;
alter table public.symbols enable row level security;
alter table public.quotes enable row level security;
alter table public.daily_bars enable row level security;
alter table public.market_calendar enable row level security;
alter table public.market_cache enable row level security;
alter table public.app_status enable row level security;
alter table public.orders enable row level security;
alter table public.positions enable row level security;
alter table public.transactions enable row level security;
alter table public.watchlist enable row level security;
alter table public.portfolio_snapshots enable row level security;
alter table public.lesson_progress enable row level security;

create policy "mentors are visible to themselves and other mentors"
  on public.mentors for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_mentor()));

create policy "games are visible to their players and mentors"
  on public.games for select to authenticated
  using ((select private.is_mentor()) or id in (select private.my_game_ids()));

create policy "players are visible within their game"
  on public.players for select to authenticated
  using ((select private.is_mentor()) or game_id in (select private.my_game_ids()));

create policy "positions follow the holdings visibility rule"
  on public.positions for select to authenticated
  using (private.can_view_player(player_id));

create policy "snapshots follow the holdings visibility rule"
  on public.portfolio_snapshots for select to authenticated
  using (private.can_view_player(player_id));

create policy "orders are private to the player and mentors"
  on public.orders for select to authenticated
  using (player_id in (select private.my_player_ids()) or (select private.is_mentor()));

create policy "transactions are private to the player and mentors"
  on public.transactions for select to authenticated
  using (player_id in (select private.my_player_ids()) or (select private.is_mentor()));

create policy "watchlists are private to the player and mentors"
  on public.watchlist for select to authenticated
  using (player_id in (select private.my_player_ids()) or (select private.is_mentor()));

create policy "lesson progress is private to the player and mentors"
  on public.lesson_progress for select to authenticated
  using (player_id in (select private.my_player_ids()) or (select private.is_mentor()));

create policy "market data is public" on public.symbols for select to anon, authenticated using (true);
create policy "quotes are public" on public.quotes for select to anon, authenticated using (true);
create policy "bars are public" on public.daily_bars for select to anon, authenticated using (true);
create policy "calendar is public" on public.market_calendar for select to anon, authenticated using (true);
create policy "status is public" on public.app_status for select to anon, authenticated using (true);
-- market_cache has no policies: only the service role (edge function) can use it.

-- Explicit table privileges (do not rely on platform defaults)
revoke all on all tables in schema public from anon, authenticated;
revoke all on all tables in schema private from anon, authenticated, public;
grant select on public.symbols, public.quotes, public.daily_bars, public.market_calendar, public.app_status
  to anon, authenticated;
grant select on public.mentors, public.games, public.players, public.positions, public.orders,
  public.transactions, public.watchlist, public.portfolio_snapshots, public.lesson_progress
  to authenticated;
grant all on all tables in schema public to service_role;

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.clock(), private.is_mentor(), private.my_player_ids(),
  private.my_game_ids(), private.can_view_player(uuid)
  to anon, authenticated;
