-- Alpha Academy Trading Floor
-- Migration 3 of 4: the trading engine.
--
-- Order rules
-- * Market orders fill at the latest quote while the market is open. After hours they wait
--   for the next session and fill at the first fresh quote after the opening bell.
-- * Buy limit fills when price <= limit. Sell limit fills when price >= limit.
-- * Buy stop triggers when price >= stop. Sell stop triggers when price <= stop.
--   A stop becomes a market order; a stop-limit becomes a limit order.
-- * Day orders expire at the close of the session they were placed for. GTC orders expire after 90 days.
-- * Fills only use quotes that are fresh (under 3 minutes old) and traded during the current session.

-- Portfolio value: cash plus holdings at the latest price (falls back to cost if no quote yet).
create or replace function private.portfolio_value(p_player_id uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.cash from public.players p where p.id = p_player_id), 0)
       + coalesce((
           select sum(pos.qty * coalesce(q.price, pos.avg_cost))
           from public.positions pos
           left join public.quotes q on q.symbol = pos.symbol
           where pos.player_id = p_player_id
         ), 0)
$$;

-- What should happen to an open order at a given price: 'fill', 'trigger', or 'wait'.
create or replace function private.order_decision(o public.orders, p_price numeric)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_limit_ok boolean;
begin
  v_limit_ok := (o.side = 'buy' and p_price <= o.limit_price)
             or (o.side = 'sell' and p_price >= o.limit_price);

  if o.order_type = 'market' then
    return 'fill';
  elsif o.order_type = 'limit' then
    return case when v_limit_ok then 'fill' else 'wait' end;
  end if;

  -- stop and stop_limit
  if not o.stop_triggered then
    if (o.side = 'buy' and p_price >= o.stop_price) or (o.side = 'sell' and p_price <= o.stop_price) then
      if o.order_type = 'stop' or v_limit_ok then
        return 'fill';
      end if;
      return 'trigger';
    end if;
    return 'wait';
  end if;

  if o.order_type = 'stop' or v_limit_ok then
    return 'fill';
  end if;
  return 'wait';
end;
$$;

-- Price usable for a fill right now, or null.
create or replace function private.fill_price(p_symbol text, p_state jsonb)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select q.price
  from public.quotes q
  where q.symbol = p_symbol
    and coalesce((p_state ->> 'is_open')::boolean, false)
    and q.updated_at >= private.clock() - interval '3 minutes'
    and coalesce(q.trade_time, q.updated_at) >= (p_state ->> 'open_at')::timestamptz
$$;

-- Execute a fill at a price. Moves cash, updates the position and ledger, marks the order.
-- If the fill is no longer possible (cash or shares changed), the order is rejected with a reason.
create or replace function private.execute_fill(p_order_id uuid, p_price numeric)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := private.clock();
  o public.orders;
  p public.players;
  g public.games;
  pos public.positions;
  v_qty numeric;
  v_gross numeric;
  v_fee numeric;
  v_cash numeric;
  v_realized numeric;
  v_new_qty numeric;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found or o.status <> 'open' then
    return o;
  end if;
  select * into p from public.players where id = o.player_id for update;
  select * into g from public.games where id = o.game_id;
  v_fee := g.commission;

  if o.side = 'buy' then
    v_qty := coalesce(o.qty, trunc(o.notional / p_price, 6));
    if v_qty <= 0 then
      update public.orders
      set status = 'rejected', reason = 'That amount is too small to buy any shares at the current price.', updated_at = v_now
      where id = o.id returning * into o;
      return o;
    end if;
    v_gross := round(v_qty * p_price, 2);
    if v_gross + v_fee > p.cash + 0.005 then
      update public.orders
      set status = 'rejected', reason = 'Not enough cash when the order was ready to fill.', updated_at = v_now
      where id = o.id returning * into o;
      return o;
    end if;
    v_cash := p.cash - v_gross - v_fee;

    select * into pos from public.positions where player_id = p.id and symbol = o.symbol for update;
    if found then
      v_new_qty := pos.qty + v_qty;
      update public.positions
      set qty = v_new_qty,
          avg_cost = round((pos.qty * pos.avg_cost + v_gross + v_fee) / v_new_qty, 4),
          updated_at = v_now
      where player_id = p.id and symbol = o.symbol;
    else
      insert into public.positions (player_id, symbol, qty, avg_cost, opened_at, updated_at)
      values (p.id, o.symbol, v_qty, round((v_gross + v_fee) / v_qty, 4), v_now, v_now);
    end if;

    update public.players set cash = v_cash where id = p.id;
    insert into public.transactions (player_id, order_id, kind, symbol, qty, price, amount, fee, cash_after, created_at)
    values (p.id, o.id, 'buy', o.symbol, v_qty, p_price, -(v_gross + v_fee), v_fee, v_cash, v_now);
  else
    select * into pos from public.positions where player_id = p.id and symbol = o.symbol for update;
    if not found or pos.qty + 0.0000005 < o.qty then
      update public.orders
      set status = 'rejected', reason = 'You no longer own enough shares to fill this sell order.', updated_at = v_now
      where id = o.id returning * into o;
      return o;
    end if;
    v_qty := least(o.qty, pos.qty);
    v_gross := round(v_qty * p_price, 2);
    v_cash := p.cash + v_gross - v_fee;
    if v_cash < 0 then
      update public.orders
      set status = 'rejected', reason = 'The commission is larger than this sale.', updated_at = v_now
      where id = o.id returning * into o;
      return o;
    end if;
    v_realized := v_gross - v_fee - round(v_qty * pos.avg_cost, 2);
    v_new_qty := pos.qty - v_qty;
    if v_new_qty < 0.000001 then
      delete from public.positions where player_id = p.id and symbol = o.symbol;
    else
      update public.positions set qty = v_new_qty, updated_at = v_now where player_id = p.id and symbol = o.symbol;
    end if;

    update public.players set cash = v_cash, realized_pl = realized_pl + v_realized where id = p.id;
    insert into public.transactions (player_id, order_id, kind, symbol, qty, price, amount, fee, realized_pl, cash_after, created_at)
    values (p.id, o.id, 'sell', o.symbol, v_qty, p_price, v_gross - v_fee, v_fee, v_realized, v_cash, v_now);
  end if;

  update public.orders
  set status = 'filled', filled_qty = v_qty, filled_price = p_price, filled_at = v_now, updated_at = v_now
  where id = o.id
  returning * into o;
  return o;
end;
$$;

-- ---------------------------------------------------------------------------
-- Student RPCs
-- ---------------------------------------------------------------------------

create or replace function public.place_order(
  p_player_id uuid,
  p_symbol text,
  p_side text,
  p_type text,
  p_qty numeric default null,
  p_notional numeric default null,
  p_limit_price numeric default null,
  p_stop_price numeric default null,
  p_time_in_force text default 'day',
  p_note text default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := private.clock();
  v_symbol text := upper(trim(coalesce(p_symbol, '')));
  v_qty numeric := case when p_qty is null then null else round(p_qty, 6) end;
  v_notional numeric := case when p_notional is null then null else round(p_notional, 2) end;
  v_tif text := coalesce(p_time_in_force, 'day');
  p public.players;
  g public.games;
  s public.symbols;
  q public.quotes;
  o public.orders;
  v_state jsonb;
  v_price numeric;
  v_est_price numeric;
  v_est_cost numeric;
  v_reserved numeric;
  v_available numeric;
  v_held numeric;
  v_reserved_qty numeric;
  v_total numeric;
  v_pos_value numeric;
  v_recent int;
begin
  p := private.own_player(p_player_id);
  select * into g from public.games where id = p.game_id;

  if g.status = 'paused' then
    raise exception 'Trading is paused for this game. Check back with your mentor.';
  end if;
  if g.status = 'ended' or (g.ends_at is not null and v_now >= g.ends_at) then
    raise exception 'This game has ended. Trading is closed.';
  end if;
  if v_now < g.starts_at then
    raise exception 'This game opens for trading on %.',
      to_char(g.starts_at at time zone 'America/New_York', 'FMMon FMDD "at" FMHH12:MI AM "ET"');
  end if;

  if p_side is null or p_side not in ('buy', 'sell') then
    raise exception 'Choose Buy or Sell.';
  end if;
  if p_type is null or p_type not in ('market', 'limit', 'stop', 'stop_limit') then
    raise exception 'Choose an order type.';
  end if;
  if v_tif not in ('day', 'gtc') then
    raise exception 'Choose how long the order lasts: Day or Good til canceled.';
  end if;
  if (v_qty is null) = (v_notional is null) then
    raise exception 'Enter a number of shares or a dollar amount.';
  end if;
  if v_notional is not null and (p_side <> 'buy' or p_type <> 'market') then
    raise exception 'Dollar amounts work for market buy orders. Use shares for this order type.';
  end if;
  if v_notional is not null and not g.allow_fractional then
    raise exception 'Fractional shares are off in this game, so buy whole shares instead of a dollar amount.';
  end if;
  if v_notional is not null and v_notional < 1 then
    raise exception 'Dollar orders must be at least $1.';
  end if;
  if v_qty is not null and v_qty <= 0 then
    raise exception 'Shares must be more than zero.';
  end if;
  if v_qty is not null and not g.allow_fractional and v_qty <> trunc(v_qty) then
    raise exception 'Fractional shares are off in this game. Use a whole number of shares.';
  end if;
  if v_qty is not null and v_qty > 10000000 then
    raise exception 'That order is too large.';
  end if;
  if p_type in ('limit', 'stop_limit') and (p_limit_price is null or p_limit_price <= 0) then
    raise exception 'Enter a limit price.';
  end if;
  if p_type in ('stop', 'stop_limit') and (p_stop_price is null or p_stop_price <= 0) then
    raise exception 'Enter a stop price.';
  end if;
  if p_note is not null and char_length(p_note) > 280 then
    raise exception 'Keep your note to 280 characters or fewer.';
  end if;

  select count(*) into v_recent
  from public.orders
  where player_id = p.id and created_at > v_now - interval '1 minute';
  if v_recent >= 20 then
    raise exception 'Too many orders in the last minute. Take a breath and try again shortly.';
  end if;

  select * into s from public.symbols where symbol = v_symbol;
  if not found or not s.tradable then
    raise exception '% is not available to trade in this game.', v_symbol;
  end if;
  select * into q from public.quotes where symbol = v_symbol;
  if not found then
    raise exception 'No price is loaded for % yet. Open its page to load a price, then try again.', v_symbol;
  end if;

  if p_side = 'buy' then
    if q.price < g.min_share_price then
      raise exception 'This game does not allow buying shares priced under %.',
        to_char(g.min_share_price, 'FM$999,990.00');
    end if;

    v_est_price := case p_type
      when 'limit' then p_limit_price
      when 'stop_limit' then p_limit_price
      when 'stop' then greatest(p_stop_price, q.price)
      else q.price
    end;
    v_est_cost := coalesce(v_notional, round(v_qty * v_est_price, 2)) + g.commission;

    select coalesce(sum(
             coalesce(o2.notional,
                      round(o2.qty * coalesce(o2.limit_price, greatest(coalesce(o2.stop_price, 0), coalesce(q2.price, 0))), 2))
             + g.commission), 0)
      into v_reserved
    from public.orders o2
    left join public.quotes q2 on q2.symbol = o2.symbol
    where o2.player_id = p.id and o2.status = 'open' and o2.side = 'buy';

    v_available := p.cash - v_reserved;
    if v_est_cost > v_available + 0.005 then
      raise exception 'Not enough buying power. This order needs about %, and you have % available.',
        to_char(v_est_cost, 'FM$999,999,990.00'),
        to_char(greatest(v_available, 0), 'FM$999,999,990.00');
    end if;

    if g.max_position_pct is not null and s.asset_type = 'stock' then
      v_total := private.portfolio_value(p.id);
      select coalesce(sum(pos.qty * q.price), 0) into v_pos_value
      from public.positions pos
      where pos.player_id = p.id and pos.symbol = v_symbol;
      v_pos_value := v_pos_value + (v_est_cost - g.commission);
      if v_total > 0 and v_pos_value / v_total * 100 > g.max_position_pct + 0.0001 then
        raise exception '%', format(
          'This trade would put %s%% of your portfolio in %s. The game limit for one stock is %s%%. Funds like SPY are exempt.',
          to_char(v_pos_value / v_total * 100, 'FM990.0'), v_symbol,
          rtrim(rtrim(to_char(g.max_position_pct, 'FM990.99'), '0'), '.'));
      end if;
    end if;
  else
    select coalesce(sum(pos.qty), 0) into v_held
    from public.positions pos
    where pos.player_id = p.id and pos.symbol = v_symbol;
    select coalesce(sum(o3.qty), 0) into v_reserved_qty
    from public.orders o3
    where o3.player_id = p.id and o3.status = 'open' and o3.side = 'sell' and o3.symbol = v_symbol;
    if v_held <= 0 then
      raise exception 'You do not own any shares of %.', v_symbol;
    end if;
    if v_qty > v_held - v_reserved_qty + 0.0000005 then
      raise exception 'You can sell up to % shares of % right now (shares in open sell orders are set aside).',
        rtrim(rtrim(to_char(greatest(v_held - v_reserved_qty, 0), 'FM999,999,990.999999'), '0'), '.'), v_symbol;
    end if;
  end if;

  insert into public.orders (
    player_id, game_id, symbol, side, order_type, qty, notional, limit_price, stop_price,
    time_in_force, note, created_at, updated_at
  ) values (
    p.id, g.id, v_symbol, p_side, p_type, v_qty, v_notional,
    case when p_type in ('limit', 'stop_limit') then round(p_limit_price, 4) end,
    case when p_type in ('stop', 'stop_limit') then round(p_stop_price, 4) end,
    case when p_type = 'market' then 'day' else v_tif end,
    nullif(trim(p_note), ''),
    v_now, v_now
  )
  returning * into o;

  update public.players set last_active_at = v_now where id = p.id;
  update public.symbols set last_viewed_at = v_now where symbol = v_symbol;

  -- Fill right away when the market is open and the quote is fresh.
  v_state := private.market_state(v_now);
  v_price := private.fill_price(v_symbol, v_state);
  if v_price is not null then
    case private.order_decision(o, v_price)
      when 'fill' then
        o := private.execute_fill(o.id, v_price);
      when 'trigger' then
        update public.orders set stop_triggered = true, updated_at = v_now where id = o.id returning * into o;
      else
        null;
    end case;
  end if;

  return o;
end;
$$;

create or replace function public.cancel_order(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders;
begin
  update public.orders
  set status = 'cancelled', reason = 'Canceled by you.', updated_at = private.clock()
  where id = p_order_id
    and status = 'open'
    and player_id in (select private.my_player_ids())
  returning * into o;
  if not found then
    raise exception 'That order is no longer open.';
  end if;
  return o;
end;
$$;

-- Full portfolio for one player (own player, mentors, or classmates when holdings are shared).
create or replace function public.get_portfolio(p_player_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  p public.players;
  g public.games;
  v_state jsonb := private.market_state();
  v_anchor date;
  v_anchor_open timestamptz;
  v_ref numeric;
  v_positions jsonb;
  v_holdings numeric;
  v_total numeric;
  v_reserved numeric;
begin
  if not private.can_view_player(p_player_id) then
    raise exception 'You cannot view this portfolio.';
  end if;
  select * into p from public.players where id = p_player_id;
  select * into g from public.games where id = p.game_id;

  -- "Today" runs from the current session (or the last one, while the market is closed).
  v_anchor := case
    when (v_state ->> 'is_open')::boolean then (v_state ->> 'session_date')::date
    else (v_state ->> 'last_close_date')::date
  end;
  select s.open_at into v_anchor_open from private.session_for_date(v_anchor) s;

  select coalesce(jsonb_agg(x order by x.market_value desc), '[]'::jsonb),
         coalesce(sum(x.market_value), 0)
    into v_positions, v_holdings
  from (
    select pos.symbol,
           s.name,
           s.asset_type,
           s.sector,
           pos.qty,
           pos.avg_cost,
           q.price,
           q.prev_close,
           q.updated_at as quote_time,
           round(pos.qty * coalesce(q.price, pos.avg_cost), 2) as market_value,
           round(pos.qty * pos.avg_cost, 2) as cost_basis,
           round(pos.qty * (coalesce(q.price, pos.avg_cost) - pos.avg_cost), 2) as unrealized_pl,
           case when pos.avg_cost > 0 then round((coalesce(q.price, pos.avg_cost) / pos.avg_cost - 1) * 100, 2) end as unrealized_pct,
           -- A position opened today has gained or lost only since it was bought.
           case when q.price is null then null
                when pos.opened_at >= v_anchor_open then round(pos.qty * (q.price - pos.avg_cost), 2)
                when q.prev_close is not null then round(pos.qty * (q.price - q.prev_close), 2) end as day_change,
           case when q.price is null then null
                when pos.opened_at >= v_anchor_open then case when pos.avg_cost > 0 then round((q.price / pos.avg_cost - 1) * 100, 2) end
                when q.prev_close > 0 then round((q.price / q.prev_close - 1) * 100, 2) end as day_change_pct
    from public.positions pos
    join public.symbols s on s.symbol = pos.symbol
    left join public.quotes q on q.symbol = pos.symbol
    where pos.player_id = p.id
  ) x;

  v_total := p.cash + v_holdings;

  select coalesce(sum(
           coalesce(o.notional,
                    round(o.qty * coalesce(o.limit_price, greatest(coalesce(o.stop_price, 0), coalesce(q.price, 0))), 2))
           + g.commission), 0)
    into v_reserved
  from public.orders o
  left join public.quotes q on q.symbol = o.symbol
  where o.player_id = p.id and o.status = 'open' and o.side = 'buy';

  select s.total_value into v_ref
  from public.portfolio_snapshots s
  where s.player_id = p.id and s.d < v_anchor
  order by s.d desc
  limit 1;

  return jsonb_build_object(
    'player_id', p.id,
    'display_name', p.display_name,
    'game_id', g.id,
    'starting_cash', g.starting_cash,
    'cash', round(p.cash, 2),
    'reserved', round(v_reserved, 2),
    'buying_power', round(greatest(p.cash - v_reserved, 0), 2),
    'holdings_value', round(v_holdings, 2),
    'total_value', round(v_total, 2),
    'total_return', round(v_total - g.starting_cash, 2),
    'total_return_pct', round((v_total / g.starting_cash - 1) * 100, 2),
    'realized_pl', round(p.realized_pl, 2),
    'day_change', round(v_total - coalesce(v_ref, g.starting_cash), 2),
    'day_change_pct', round((v_total / coalesce(nullif(v_ref, 0), g.starting_cash) - 1) * 100, 2),
    'positions', v_positions
  );
end;
$$;

create or replace function public.get_leaderboard(p_game_id uuid)
returns table (
  rank bigint,
  player_id uuid,
  display_name text,
  total_value numeric,
  return_pct numeric,
  day_change_pct numeric,
  holdings int,
  trades int,
  is_me boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_state jsonb := private.market_state();
  v_anchor date;
begin
  if not ((select private.is_mentor()) or p_game_id in (select private.my_game_ids())) then
    raise exception 'You are not part of this game.';
  end if;
  v_anchor := case
    when (v_state ->> 'is_open')::boolean then (v_state ->> 'session_date')::date
    else (v_state ->> 'last_close_date')::date
  end;

  return query
  with vals as (
    select p.id as pid,
           p.display_name as pname,
           p.user_id as puser,
           p.created_at as pcreated,
           g.starting_cash as start_cash,
           p.cash + coalesce((
             select sum(pos.qty * coalesce(q.price, pos.avg_cost))
             from public.positions pos
             left join public.quotes q on q.symbol = pos.symbol
             where pos.player_id = p.id
           ), 0) as total,
           (select count(*) from public.positions pos where pos.player_id = p.id)::int as nholdings,
           (select count(*) from public.orders o where o.player_id = p.id and o.status = 'filled')::int as ntrades,
           (select s.total_value from public.portfolio_snapshots s
             where s.player_id = p.id and s.d < v_anchor
             order by s.d desc limit 1) as ref
    from public.players p
    join public.games g on g.id = p.game_id
    where p.game_id = p_game_id
  )
  select rank() over (order by v.total desc, v.pcreated),
         v.pid,
         v.pname,
         round(v.total, 2),
         round((v.total / v.start_cash - 1) * 100, 2),
         round((v.total / coalesce(nullif(v.ref, 0), v.start_cash) - 1) * 100, 2),
         v.nholdings,
         v.ntrades,
         coalesce(v.puser = (select auth.uid()), false)
  from vals v
  order by v.total desc, v.pcreated;
end;
$$;

-- Game header: settings, benchmark, player count, and market clock in one call.
create or replace function public.game_summary(p_game_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  g public.games;
  v_bench_price numeric;
  v_count int;
begin
  if not ((select private.is_mentor()) or p_game_id in (select private.my_game_ids())) then
    raise exception 'You are not part of this game.';
  end if;
  select * into g from public.games where id = p_game_id;
  select q.price into v_bench_price from public.quotes q where q.symbol = g.benchmark_symbol;
  select count(*) into v_count from public.players where game_id = g.id;

  return jsonb_build_object(
    'game', to_jsonb(g),
    'player_count', v_count,
    'benchmark', jsonb_build_object(
      'symbol', g.benchmark_symbol,
      'start_price', g.benchmark_start_price,
      'price', v_bench_price,
      'value', case when g.benchmark_start_price > 0 and v_bench_price is not null
                    then round(g.starting_cash * v_bench_price / g.benchmark_start_price, 2) end,
      'return_pct', case when g.benchmark_start_price > 0 and v_bench_price is not null
                         then round((v_bench_price / g.benchmark_start_price - 1) * 100, 2) end
    ),
    'market', public.market_status()
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Market cycle (service role: called every minute by the market edge function)
-- ---------------------------------------------------------------------------

create or replace function private.process_open_orders(p_state jsonb)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.orders;
  v_price numeric;
  n int := 0;
begin
  if not coalesce((p_state ->> 'is_open')::boolean, false) then
    return 0;
  end if;
  for r in
    select o.*
    from public.orders o
    join public.games g on g.id = o.game_id
    where o.status = 'open' and g.status = 'active'
    order by o.created_at
  loop
    v_price := private.fill_price(r.symbol, p_state);
    continue when v_price is null;
    case private.order_decision(r, v_price)
      when 'fill' then
        perform private.execute_fill(r.id, v_price);
        n := n + 1;
      when 'trigger' then
        update public.orders set stop_triggered = true, updated_at = private.clock() where id = r.id;
      else
        null;
    end case;
  end loop;
  return n;
end;
$$;

create or replace function private.expire_orders(p_state jsonb)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := private.clock();
  n1 int := 0;
  n2 int := 0;
begin
  if (p_state ->> 'last_close_at') is not null then
    update public.orders
    set status = 'expired', reason = 'Day order expired at the market close.', updated_at = v_now
    where status = 'open'
      and time_in_force = 'day'
      and created_at < (p_state ->> 'last_close_at')::timestamptz;
    get diagnostics n1 = row_count;
  end if;

  update public.orders
  set status = 'expired', reason = 'Good til canceled orders expire after 90 days.', updated_at = v_now
  where status = 'open' and time_in_force = 'gtc' and created_at < v_now - interval '90 days';
  get diagnostics n2 = row_count;

  return n1 + n2;
end;
$$;

create or replace function private.end_due_games()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := private.clock();
  r public.games;
  n int := 0;
begin
  for r in
    select * from public.games
    where status in ('active', 'paused') and ends_at is not null and ends_at <= v_now
  loop
    update public.orders
    set status = 'cancelled', reason = 'The game ended.', updated_at = v_now
    where game_id = r.id and status = 'open';
    update public.games set status = 'ended', updated_at = v_now where id = r.id;
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- Closing values, once per session, 15 minutes after the close (so closing prices are in).
create or replace function private.take_snapshots(p_state jsonb)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := private.clock();
  v_date date := (p_state ->> 'last_close_date')::date;
  n int := 0;
begin
  if v_date is null or coalesce((p_state ->> 'is_open')::boolean, false) then
    return 0;
  end if;
  if v_now < (p_state ->> 'last_close_at')::timestamptz + interval '15 minutes' then
    return 0;
  end if;
  if exists (select 1 from public.app_status a where a.key = 'last_snapshot_date' and a.value ->> 'd' = v_date::text) then
    return 0;
  end if;

  insert into public.portfolio_snapshots (player_id, d, total_value, cash)
  select p.id, v_date, round(private.portfolio_value(p.id), 2), round(p.cash, 2)
  from public.players p
  join public.games g on g.id = p.game_id
  where g.starts_at <= (p_state ->> 'last_close_at')::timestamptz
    and (g.status <> 'ended' or g.ends_at >= (p_state ->> 'last_close_at')::timestamptz - interval '1 day')
  on conflict (player_id, d) do update set total_value = excluded.total_value, cash = excluded.cash;
  get diagnostics n = row_count;

  perform public.set_app_status('last_snapshot_date', jsonb_build_object('d', v_date));
  return n;
end;
$$;

create or replace function public.run_market_cycle()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := private.clock();
  v_state jsonb := private.market_state(v_now);
  v_ended int;
  v_bench int;
  v_filled int;
  v_expired int;
  v_snaps int;
begin
  v_ended := private.end_due_games();

  update public.games g
  set benchmark_start_price = q.price, updated_at = v_now
  from public.quotes q
  where g.benchmark_start_price is null
    and q.symbol = g.benchmark_symbol
    and g.starts_at <= v_now
    and coalesce(q.trade_time, q.updated_at) >= g.starts_at;
  get diagnostics v_bench = row_count;

  v_filled := private.process_open_orders(v_state);
  v_expired := private.expire_orders(v_state);
  v_snaps := private.take_snapshots(v_state);

  return jsonb_build_object(
    'market', v_state,
    'games_ended', v_ended,
    'benchmarks_set', v_bench,
    'orders_filled', v_filled,
    'orders_expired', v_expired,
    'snapshots', v_snaps
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.clock(), private.is_mentor(), private.my_player_ids(),
  private.my_game_ids(), private.can_view_player(uuid)
  to anon, authenticated;

revoke execute on function
  public.place_order(uuid, text, text, text, numeric, numeric, numeric, numeric, text, text),
  public.cancel_order(uuid),
  public.get_portfolio(uuid),
  public.get_leaderboard(uuid),
  public.game_summary(uuid),
  public.run_market_cycle()
  from public, anon, authenticated;

grant execute on function
  public.place_order(uuid, text, text, text, numeric, numeric, numeric, numeric, text, text),
  public.cancel_order(uuid),
  public.get_portfolio(uuid),
  public.get_leaderboard(uuid),
  public.game_summary(uuid)
  to authenticated;

grant execute on function public.run_market_cycle() to service_role;
