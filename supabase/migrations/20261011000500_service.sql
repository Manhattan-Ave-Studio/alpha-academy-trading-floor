-- Alpha Academy Trading Floor
-- Migration 5: helpers for the `market` edge function (service role only).
-- Keeping these reads in SQL means the function only calls RPCs, which keeps it small and testable.

create or replace function public.svc_get_quotes(p_symbols text[])
returns setof public.quotes
language sql
stable
security definer
set search_path = ''
as $$
  select q.* from public.quotes q where q.symbol = any (p_symbols)
$$;

create or replace function public.svc_existing_symbols(p_symbols text[])
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select s.symbol from public.symbols s where s.symbol = any (p_symbols) and s.tradable
$$;

create or replace function public.svc_mark_untradable(p_symbol text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.symbols set tradable = false, updated_at = private.clock()
  where symbol = upper(p_symbol) and not featured
$$;

create or replace function public.svc_bar_coverage(p_symbol text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('first', min(b.d), 'last', max(b.d), 'count', count(*))
  from public.daily_bars b
  where b.symbol = upper(p_symbol)
$$;

create or replace function public.svc_bars(p_symbol text, p_from date)
returns table (d date, o numeric, h numeric, l numeric, c numeric, v bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select b.d, b.o, b.h, b.l, b.c, b.v
  from public.daily_bars b
  where b.symbol = upper(p_symbol) and b.d >= p_from
  order by b.d
$$;

create or replace function public.svc_cache_get(p_key text, p_max_age_seconds int)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select c.payload
  from public.market_cache c
  where c.key = p_key
    and c.fetched_at > private.clock() - make_interval(secs => p_max_age_seconds)
$$;

create or replace function public.svc_cache_put(p_key text, p_payload jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.market_cache (key, payload, fetched_at)
  values (p_key, p_payload, private.clock())
  on conflict (key) do update set payload = excluded.payload, fetched_at = excluded.fetched_at
$$;

-- Trading sessions between two Eastern dates (inclusive), for trimming intraday bars.
create or replace function public.svc_sessions(p_from date, p_to date)
returns table (d date, open_at timestamptz, close_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select g::date, s.open_at, s.close_at
  from generate_series(p_from, p_to, interval '1 day') g
  cross join lateral private.session_for_date(g::date) s
  where s.trading
  order by 1
$$;

-- Symbol details plus stats computed from stored daily bars.
create or replace function public.svc_symbol_info(p_symbol text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select to_jsonb(s)
    || jsonb_build_object(
      'week52_high', (select max(b.h) from public.daily_bars b
                      where b.symbol = s.symbol and b.d > (private.clock() at time zone 'America/New_York')::date - 365),
      'week52_low', (select min(b.l) from public.daily_bars b
                     where b.symbol = s.symbol and b.d > (private.clock() at time zone 'America/New_York')::date - 365),
      'avg_volume_30d', (select round(avg(x.v)) from (
                           select b.v from public.daily_bars b
                           where b.symbol = s.symbol order by b.d desc limit 30) x)
    )
  from public.symbols s
  where s.symbol = upper(p_symbol)
$$;

create or replace function public.svc_is_mentor(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.mentors m where m.user_id = p_user)
$$;

create or replace function public.svc_status()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'symbols', (select count(*) from public.symbols),
    'tradable_symbols', (select count(*) from public.symbols where tradable),
    'quotes', (select count(*) from public.quotes),
    'fresh_quotes', (select count(*) from public.quotes where updated_at > private.clock() - interval '5 minutes'),
    'calendar_through', (select max(d) from public.market_calendar),
    'calendar_source', (select source from public.market_calendar order by d desc limit 1),
    'last_refresh', (select value from public.app_status where key = 'last_refresh'),
    'last_sync', (select value from public.app_status where key = 'last_sync'),
    'last_snapshot', (select value from public.app_status where key = 'last_snapshot_date'),
    'games', (select count(*) from public.games),
    'players', (select count(*) from public.players)
  )
$$;

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.clock(), private.is_mentor(), private.my_player_ids(),
  private.my_game_ids(), private.can_view_player(uuid)
  to anon, authenticated;

revoke execute on function
  public.svc_get_quotes(text[]), public.svc_existing_symbols(text[]), public.svc_mark_untradable(text),
  public.svc_bar_coverage(text), public.svc_bars(text, date), public.svc_cache_get(text, int),
  public.svc_cache_put(text, jsonb), public.svc_sessions(date, date), public.svc_symbol_info(text),
  public.svc_is_mentor(uuid), public.svc_status()
  from public, anon, authenticated;

grant execute on function
  public.svc_get_quotes(text[]), public.svc_existing_symbols(text[]), public.svc_mark_untradable(text),
  public.svc_bar_coverage(text), public.svc_bars(text, date), public.svc_cache_get(text, int),
  public.svc_cache_put(text, jsonb), public.svc_sessions(date, date), public.svc_symbol_info(text),
  public.svc_is_mentor(uuid), public.svc_status()
  to service_role;
