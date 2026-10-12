-- Alpha Academy Trading Floor
-- Migration 2 of 4: market clock, market data ingestion, and status.

-- ---------------------------------------------------------------------------
-- Market clock (all times are U.S. Eastern)
-- ---------------------------------------------------------------------------

-- Session for one Eastern calendar date.
-- 1. A market_calendar row means a trading day with those hours (handles early closes).
-- 2. No row, but the calendar covers that date: holiday or weekend, market closed.
-- 3. Calendar does not cover the date: weekdays 9:30 a.m. to 4:00 p.m.
create or replace function private.session_for_date(p_d date)
returns table (trading boolean, open_at timestamptz, close_at timestamptz)
language plpgsql
stable
set search_path = ''
as $$
declare
  c public.market_calendar;
  v_covered boolean;
begin
  select * into c from public.market_calendar mc where mc.d = p_d;
  if found then
    return query select
      true,
      (p_d + c.open_time) at time zone 'America/New_York',
      (p_d + c.close_time) at time zone 'America/New_York';
    return;
  end if;

  select exists (select 1 from public.market_calendar mc where mc.d <= p_d)
     and exists (select 1 from public.market_calendar mc where mc.d >= p_d)
    into v_covered;

  if v_covered or extract(isodow from p_d) in (6, 7) then
    return query select false, null::timestamptz, null::timestamptz;
  else
    return query select
      true,
      (p_d + time '09:30') at time zone 'America/New_York',
      (p_d + time '16:00') at time zone 'America/New_York';
  end if;
end;
$$;

-- Snapshot of the market clock at a moment in time.
create or replace function private.market_state(p_now timestamptz default null)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_now timestamptz := coalesce(p_now, private.clock());
  v_today date := (v_now at time zone 'America/New_York')::date;
  r record;
  v_open boolean := false;
  v_session date;
  v_open_at timestamptz;
  v_close_at timestamptz;
  v_last_close timestamptz;
  v_last_close_date date;
  v_next_open timestamptz;
  v_next_close timestamptz;
begin
  for r in
    select g::date as d, s.trading, s.open_at, s.close_at
    from generate_series(v_today - 14, v_today + 14, interval '1 day') g
    cross join lateral private.session_for_date(g::date) s
    order by 1
  loop
    continue when not r.trading;
    if v_now >= r.open_at and v_now < r.close_at then
      v_open := true;
      v_session := r.d;
      v_open_at := r.open_at;
      v_close_at := r.close_at;
    end if;
    if r.close_at <= v_now then
      v_last_close := r.close_at;
      v_last_close_date := r.d;
    end if;
    if v_next_open is null and r.open_at > v_now then
      v_next_open := r.open_at;
    end if;
    if v_next_close is null and r.close_at > v_now then
      v_next_close := r.close_at;
    end if;
  end loop;

  return jsonb_build_object(
    'is_open', v_open,
    'now', v_now,
    'session_date', v_session,
    'open_at', v_open_at,
    'close_at', v_close_at,
    'last_close_at', v_last_close,
    'last_close_date', v_last_close_date,
    'next_open_at', v_next_open,
    'next_close_at', v_next_close
  );
end;
$$;

create or replace function public.market_status()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select private.market_state()
    || jsonb_build_object(
      'last_refresh', (select s.value ->> 'at' from public.app_status s where s.key = 'last_refresh'),
      'data_source', (select s.value ->> 'source' from public.app_status s where s.key = 'last_refresh'),
      'live', true
    )
$$;

-- ---------------------------------------------------------------------------
-- Symbol search (any authenticated or anonymous visitor)
-- ---------------------------------------------------------------------------

create or replace function public.search_symbols(p_query text, p_limit int default 20)
returns setof public.symbols
language sql
stable
security definer
set search_path = ''
as $$
  with q as (
    select upper(t.x) as u, lower(t.x) as l
    from (select regexp_replace(trim(coalesce(p_query, '')), '[%_\\]', '', 'g') as x) t
  )
  select s.*
  from public.symbols s, q
  where s.tradable
    and char_length(q.l) >= 1
    and (s.symbol like q.u || '%' or lower(s.name) like '%' || q.l || '%')
  order by
    (s.symbol = q.u) desc,
    (s.symbol like q.u || '%') desc,
    s.featured desc,
    (lower(s.name) like q.l || '%') desc,
    char_length(s.symbol),
    s.symbol
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
$$;

-- ---------------------------------------------------------------------------
-- Ingestion (service role only: called by the market edge function)
-- ---------------------------------------------------------------------------

-- rows: [{symbol, price, prev_close, open, high, low, volume, bid, ask, trade_time, source}]
create or replace function public.ingest_quotes(p_rows jsonb)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  insert into public.quotes as q
    (symbol, price, prev_close, open, high, low, volume, bid, ask, trade_time, source, updated_at)
  select
    upper(r ->> 'symbol'),
    (r ->> 'price')::numeric,
    nullif(r ->> 'prev_close', '')::numeric,
    nullif(r ->> 'open', '')::numeric,
    nullif(r ->> 'high', '')::numeric,
    nullif(r ->> 'low', '')::numeric,
    nullif(r ->> 'volume', '')::numeric::bigint,
    nullif(r ->> 'bid', '')::numeric,
    nullif(r ->> 'ask', '')::numeric,
    nullif(r ->> 'trade_time', '')::timestamptz,
    coalesce(r ->> 'source', 'alpaca'),
    private.clock()
  from jsonb_array_elements(p_rows) r
  where nullif(r ->> 'price', '')::numeric > 0
    and exists (select 1 from public.symbols s where s.symbol = upper(r ->> 'symbol'))
  on conflict (symbol) do update set
    price = excluded.price,
    prev_close = coalesce(excluded.prev_close, q.prev_close),
    open = coalesce(excluded.open, q.open),
    high = coalesce(excluded.high, q.high),
    low = coalesce(excluded.low, q.low),
    volume = coalesce(excluded.volume, q.volume),
    bid = excluded.bid,
    ask = excluded.ask,
    trade_time = coalesce(excluded.trade_time, q.trade_time),
    source = excluded.source,
    updated_at = excluded.updated_at;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- rows: [{d, o, h, l, c, v}]
create or replace function public.ingest_daily_bars(p_symbol text, p_rows jsonb)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  insert into public.daily_bars as b (symbol, d, o, h, l, c, v)
  select upper(p_symbol), (r ->> 'd')::date,
         nullif(r ->> 'o', '')::numeric, nullif(r ->> 'h', '')::numeric,
         nullif(r ->> 'l', '')::numeric, (r ->> 'c')::numeric,
         nullif(r ->> 'v', '')::numeric::bigint
  from jsonb_array_elements(p_rows) r
  where nullif(r ->> 'c', '')::numeric > 0
    and exists (select 1 from public.symbols s where s.symbol = upper(p_symbol))
  on conflict (symbol, d) do update set
    o = excluded.o, h = excluded.h, l = excluded.l, c = excluded.c, v = excluded.v;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- rows: [{symbol, name, exchange, asset_type, tradable}]
-- Curated fields (sector, blurb, featured, collections) are never overwritten.
create or replace function public.ingest_symbols(p_rows jsonb)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  insert into public.symbols as s (symbol, name, exchange, asset_type, tradable, updated_at)
  select upper(r ->> 'symbol'),
         left(coalesce(nullif(r ->> 'name', ''), r ->> 'symbol'), 120),
         r ->> 'exchange',
         case when r ->> 'asset_type' = 'etf' then 'etf' else 'stock' end,
         coalesce((r ->> 'tradable')::boolean, true),
         private.clock()
  from jsonb_array_elements(p_rows) r
  where upper(r ->> 'symbol') ~ '^[A-Z][A-Z0-9.\-]{0,9}$'
  on conflict (symbol) do update set
    name = case when s.featured then s.name else excluded.name end,
    exchange = excluded.exchange,
    asset_type = case when s.featured then s.asset_type else excluded.asset_type end,
    tradable = excluded.tradable,
    updated_at = excluded.updated_at;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- rows: [{date, open, close}] from the broker calendar. Replaces the seeded range it covers.
create or replace function public.ingest_calendar(p_rows jsonb)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
  v_min date;
  v_max date;
begin
  select min((r ->> 'date')::date), max((r ->> 'date')::date)
    into v_min, v_max
  from jsonb_array_elements(p_rows) r;
  if v_min is null then
    return 0;
  end if;

  delete from public.market_calendar mc
  where mc.d between v_min and v_max
    and mc.d not in (select (r ->> 'date')::date from jsonb_array_elements(p_rows) r);

  insert into public.market_calendar as mc (d, open_time, close_time, source)
  select (r ->> 'date')::date, (r ->> 'open')::time, (r ->> 'close')::time, 'alpaca'
  from jsonb_array_elements(p_rows) r
  on conflict (d) do update set
    open_time = excluded.open_time, close_time = excluded.close_time, source = excluded.source;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Symbols the refresh job keeps current: holdings, open orders, watchlists,
-- featured names, game benchmarks, and anything viewed in the last 30 minutes.
create or replace function public.active_symbols(p_limit int default 600)
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select x.symbol
  from (
    select pos.symbol from public.positions pos
    union
    select o.symbol from public.orders o where o.status = 'open'
    union
    select w.symbol
    from public.watchlist w
    join public.players p on p.id = w.player_id
    join public.games g on g.id = p.game_id
    where g.status <> 'ended'
    union
    select s.symbol from public.symbols s where s.featured
    union
    select g.benchmark_symbol from public.games g where g.status <> 'ended'
    union
    select s.symbol from public.symbols s where s.last_viewed_at > private.clock() - interval '30 minutes'
  ) x
  join public.symbols s2 on s2.symbol = x.symbol and s2.tradable
  order by x.symbol
  limit p_limit
$$;

create or replace function public.touch_symbols(p_symbols text[])
returns void
language sql
security definer
set search_path = ''
as $$
  update public.symbols s
  set last_viewed_at = private.clock()
  where s.symbol = any (select upper(x) from unnest(p_symbols) x)
$$;

create or replace function public.set_app_status(p_key text, p_value jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.app_status (key, value, updated_at)
  values (p_key, p_value, private.clock())
  on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.clock(), private.is_mentor(), private.my_player_ids(),
  private.my_game_ids(), private.can_view_player(uuid)
  to anon, authenticated;

revoke execute on function public.market_status(), public.search_symbols(text, int),
  public.ingest_quotes(jsonb), public.ingest_daily_bars(text, jsonb), public.ingest_symbols(jsonb),
  public.ingest_calendar(jsonb), public.active_symbols(int), public.touch_symbols(text[]),
  public.set_app_status(text, jsonb)
  from public, anon, authenticated;

grant execute on function public.market_status(), public.search_symbols(text, int)
  to anon, authenticated, service_role;

grant execute on function public.ingest_quotes(jsonb), public.ingest_daily_bars(text, jsonb),
  public.ingest_symbols(jsonb), public.ingest_calendar(jsonb), public.active_symbols(int),
  public.touch_symbols(text[]), public.set_app_status(text, jsonb)
  to service_role;
