-- Game admins, required lessons, and exam tries.
--
-- Each game lists its admins, chosen from the mentors. Whoever creates a game is its first admin.
-- Only admins change a game's settings, manage its players, assign required lessons, or reset a
-- student's exam. Every mentor can still open any game and its roster. A game whose admins are all
-- gone (their accounts deleted) is open to every mentor, so no game is ever stranded.
--
-- Admins pick required lessons for a game. A student in that game cannot place orders until every
-- required lesson is passed (best exam score of 75 or better, PASS_MARK in assets/js/data/lessons.js).
-- The order engine for demo mode mirrors this check with the same message.
--
-- Each lesson exam allows 3 tries (EXAM_TRIES in assets/js/data/lessons.js; keep both in step). After
-- the third failing try the exam locks until an admin resets it. A passed lesson is finished: no more
-- tries are needed or counted.
--
-- Run this after deploying the site. Existing rows in lesson_progress count as one try.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.game_admins (
  game_id uuid not null references public.games (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  added_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (game_id, user_id)
);

create table public.game_lessons (
  game_id uuid not null references public.games (id) on delete cascade,
  lesson_id text not null check (lesson_id ~ '^[a-z0-9-]{1,64}$'),
  position int not null default 0,
  created_at timestamptz not null default now(),
  primary key (game_id, lesson_id)
);

alter table public.lesson_progress add column attempts int not null default 0 check (attempts >= 0);
update public.lesson_progress set attempts = 1 where attempts = 0;

-- Existing games: the mentor who created each one becomes its admin.
insert into public.game_admins (game_id, user_id, added_by)
select g.id, g.created_by, g.created_by
from public.games g
join public.mentors m on m.user_id = g.created_by
on conflict do nothing;

alter table public.game_admins enable row level security;
alter table public.game_lessons enable row level security;

create policy "game admins are visible to mentors"
  on public.game_admins for select to authenticated
  using ((select private.is_mentor()));

create policy "required lessons are visible within the game"
  on public.game_lessons for select to authenticated
  using ((select private.is_mentor()) or game_id in (select private.my_game_ids()));

grant select on public.game_admins, public.game_lessons to authenticated;
grant all on public.game_admins, public.game_lessons to service_role;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function private.is_game_admin(p_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.is_mentor())
     and (exists (select 1 from public.game_admins a
                  where a.game_id = p_game_id and a.user_id = (select auth.uid()))
          or not exists (select 1 from public.game_admins a where a.game_id = p_game_id))
$$;

create or replace function private.assert_game_admin(p_game_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_mentor();
  if not private.is_game_admin(p_game_id) then
    raise exception 'Only this game''s admins can change it. Ask one of them to add you as an admin.';
  end if;
end;
$$;

create or replace function private.game_of_player(p_player_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.game_id from public.players p where p.id = p_player_id
$$;

-- Required lessons the player has not passed yet.
create or replace function private.lessons_left(p_player_id uuid, p_game_id uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int
  from public.game_lessons gl
  where gl.game_id = p_game_id
    and not exists (select 1 from public.lesson_progress lp
                    where lp.player_id = p_player_id and lp.lesson_id = gl.lesson_id and lp.score >= 75)
$$;

create or replace function private.required_lessons(p_game_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select jsonb_agg(gl.lesson_id order by gl.position, gl.lesson_id)
                   from public.game_lessons gl where gl.game_id = p_game_id), '[]'::jsonb)
$$;

create or replace function private.game_admin_list(p_game_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select jsonb_agg(jsonb_build_object('user_id', a.user_id, 'email', u.email, 'display_name', m.display_name)
                     order by a.created_at)
    from public.game_admins a
    join auth.users u on u.id = a.user_id
    left join public.mentors m on m.user_id = a.user_id
    where a.game_id = p_game_id
  ), '[]'::jsonb)
$$;

-- ---------------------------------------------------------------------------
-- Admins and required lessons
-- ---------------------------------------------------------------------------

create or replace function public.set_game_admin(p_game_id uuid, p_email text, p_on boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  perform private.assert_game_admin(p_game_id);
  if not exists (select 1 from public.games where id = p_game_id) then
    raise exception 'Game not found.';
  end if;
  select u.id into v_user
  from auth.users u
  join public.mentors m on m.user_id = u.id
  where lower(u.email) = lower(trim(coalesce(p_email, '')));
  if v_user is null then
    raise exception 'No mentor uses the email %. They need to create a mentor login and enter the mentor code first.', trim(coalesce(p_email, ''));
  end if;
  if p_on then
    insert into public.game_admins (game_id, user_id, added_by)
    values (p_game_id, v_user, (select auth.uid()))
    on conflict do nothing;
  else
    if (select count(*) from public.game_admins a where a.game_id = p_game_id) <= 1
       and exists (select 1 from public.game_admins a where a.game_id = p_game_id and a.user_id = v_user) then
      raise exception 'A game needs at least one admin. Add another admin before removing this one.';
    end if;
    delete from public.game_admins where game_id = p_game_id and user_id = v_user;
  end if;
  return private.game_admin_list(p_game_id);
end;
$$;

-- Replace the game's required lessons with this list (lesson ids from assets/js/data/lessons.js).
create or replace function public.set_game_lessons(p_game_id uuid, p_lesson_ids text[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids text[] := coalesce(p_lesson_ids, '{}');
  v_id text;
  v_pos int := 0;
begin
  perform private.assert_game_admin(p_game_id);
  if not exists (select 1 from public.games where id = p_game_id) then
    raise exception 'Game not found.';
  end if;
  if array_length(v_ids, 1) > 50 then
    raise exception 'Choose up to 50 lessons.';
  end if;
  delete from public.game_lessons where game_id = p_game_id;
  foreach v_id in array v_ids loop
    if v_id is null or v_id !~ '^[a-z0-9-]{1,64}$' then
      raise exception 'Unknown lesson.';
    end if;
    insert into public.game_lessons (game_id, lesson_id, position)
    values (p_game_id, v_id, v_pos)
    on conflict do nothing;
    v_pos := v_pos + 1;
  end loop;
  return private.required_lessons(p_game_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Exams: three tries, then an admin reset
-- ---------------------------------------------------------------------------

drop function public.complete_lesson(uuid, text, int);
create function public.complete_lesson(p_player_id uuid, p_lesson_id text, p_score int)
returns public.lesson_progress
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.players := private.own_player(p_player_id);
  lp public.lesson_progress;
  v_now timestamptz := private.clock();
  v_score int := greatest(0, least(100, coalesce(p_score, 0)));
begin
  if p_lesson_id is null or p_lesson_id !~ '^[a-z0-9-]{1,64}$' then
    raise exception 'Unknown lesson.';
  end if;
  select * into lp from public.lesson_progress
  where player_id = p.id and lesson_id = p_lesson_id for update;
  if found and lp.score >= 75 then
    raise exception 'You already passed this lesson, so there is nothing to retake.';
  end if;
  -- EXAM_TRIES in assets/js/data/lessons.js
  if found and lp.attempts >= 3 then
    raise exception 'You have used all 3 tries for this exam. Ask a mentor to reset it.';
  end if;
  insert into public.lesson_progress (player_id, lesson_id, score, completed_at, attempts)
  values (p.id, p_lesson_id, v_score, v_now, 1)
  on conflict (player_id, lesson_id) do update
    set attempts = public.lesson_progress.attempts + 1,
        score = greatest(public.lesson_progress.score, excluded.score),
        completed_at = case when excluded.score > public.lesson_progress.score
                            then excluded.completed_at else public.lesson_progress.completed_at end
  returning * into lp;
  update public.players set last_active_at = v_now where id = p.id;
  return lp;
end;
$$;

-- An admin gives a student a fresh set of tries on one exam. The best score so far is kept.
create or replace function public.reset_exam(p_player_id uuid, p_lesson_id text)
returns public.lesson_progress
language plpgsql
security definer
set search_path = ''
as $$
declare
  lp public.lesson_progress;
begin
  perform private.assert_game_admin(private.game_of_player(p_player_id));
  update public.lesson_progress set attempts = 0
  where player_id = p_player_id and lesson_id = p_lesson_id
  returning * into lp;
  if not found then
    raise exception 'This student has not taken that exam yet.';
  end if;
  return lp;
end;
$$;

-- ---------------------------------------------------------------------------
-- Functions that now check for a game admin, or carry the new data
-- ---------------------------------------------------------------------------

create or replace function public.create_game(
  p_name text,
  p_starting_cash numeric default 100000,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_allow_fractional boolean default true,
  p_max_position_pct numeric default null,
  p_min_share_price numeric default 1,
  p_commission numeric default 0,
  p_show_holdings boolean default false,
  p_announcement text default null
)
returns public.games
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.games;
begin
  perform private.assert_mentor();
  insert into public.games (
    name, join_code, starting_cash, starts_at, ends_at, allow_fractional, max_position_pct,
    min_share_price, commission, show_holdings, announcement, created_by
  ) values (
    trim(p_name), private.new_join_code(), coalesce(p_starting_cash, 100000),
    coalesce(p_starts_at, private.clock()), p_ends_at, coalesce(p_allow_fractional, true),
    p_max_position_pct, coalesce(p_min_share_price, 1), coalesce(p_commission, 0),
    coalesce(p_show_holdings, false), nullif(trim(coalesce(p_announcement, '')), ''),
    (select auth.uid())
  )
  returning * into g;
  insert into public.game_admins (game_id, user_id, added_by) values (g.id, (select auth.uid()), (select auth.uid()));
  return g;
end;
$$;

create or replace function public.update_game(p_game_id uuid, p_patch jsonb)
returns public.games
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.games;
  v_players int;
begin
  perform private.assert_game_admin(p_game_id);
  select * into g from public.games where id = p_game_id for update;
  if not found then
    raise exception 'Game not found.';
  end if;
  select count(*) into v_players from public.players where game_id = g.id;
  if p_patch ? 'starting_cash' and v_players > 0
     and (p_patch ->> 'starting_cash')::numeric <> g.starting_cash then
    raise exception 'Starting cash can only change before anyone joins. Use Reset game to restart with new cash.';
  end if;

  update public.games set
    name = coalesce(nullif(trim(p_patch ->> 'name'), ''), name),
    status = coalesce(p_patch ->> 'status', status),
    starts_at = case when p_patch ? 'starts_at' then coalesce((p_patch ->> 'starts_at')::timestamptz, starts_at) else starts_at end,
    ends_at = case when p_patch ? 'ends_at' then (p_patch ->> 'ends_at')::timestamptz else ends_at end,
    starting_cash = coalesce((p_patch ->> 'starting_cash')::numeric, starting_cash),
    allow_fractional = coalesce((p_patch ->> 'allow_fractional')::boolean, allow_fractional),
    max_position_pct = case when p_patch ? 'max_position_pct' then (p_patch ->> 'max_position_pct')::numeric else max_position_pct end,
    min_share_price = coalesce((p_patch ->> 'min_share_price')::numeric, min_share_price),
    commission = coalesce((p_patch ->> 'commission')::numeric, commission),
    show_holdings = coalesce((p_patch ->> 'show_holdings')::boolean, show_holdings),
    announcement = case when p_patch ? 'announcement' then nullif(trim(coalesce(p_patch ->> 'announcement', '')), '') else announcement end,
    updated_at = private.clock()
  where id = g.id
  returning * into g;

  if g.status = 'ended' then
    update public.orders
    set status = 'cancelled', reason = 'The game ended.', updated_at = private.clock()
    where game_id = g.id and status = 'open';
  end if;
  return g;
end;
$$;

create or replace function public.reset_game(p_game_id uuid, p_starting_cash numeric default null)
returns public.games
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := private.clock();
  g public.games;
begin
  perform private.assert_game_admin(p_game_id);
  select * into g from public.games where id = p_game_id for update;
  if not found then
    raise exception 'Game not found.';
  end if;
  if p_starting_cash is not null and (p_starting_cash < 100 or p_starting_cash > 10000000) then
    raise exception 'Starting cash must be between $100 and $10,000,000.';
  end if;

  delete from public.orders where game_id = g.id;
  delete from public.positions where player_id in (select id from public.players where game_id = g.id);
  delete from public.transactions where player_id in (select id from public.players where game_id = g.id);
  delete from public.portfolio_snapshots where player_id in (select id from public.players where game_id = g.id);

  update public.games
  set starting_cash = coalesce(p_starting_cash, starting_cash),
      starts_at = v_now,
      benchmark_start_price = null,
      status = 'active',
      ends_at = case when ends_at is not null and ends_at <= v_now then null else ends_at end,
      updated_at = v_now
  where id = g.id
  returning * into g;

  update public.players set cash = g.starting_cash, realized_pl = 0 where game_id = g.id;
  insert into public.transactions (player_id, kind, amount, cash_after, note, created_at)
  select p.id, 'reset', g.starting_cash, g.starting_cash, 'Game reset by mentor', v_now
  from public.players p where p.game_id = g.id;
  return g;
end;
$$;

create or replace function public.reset_player_pin(p_player_id uuid, p_new_pin text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_game_admin(private.game_of_player(p_player_id));
  if coalesce(p_new_pin, '') !~ '^[0-9]{4,6}$' then
    raise exception 'The new PIN must be 4 to 6 digits.';
  end if;
  update private.player_secrets
  set pin_hash = extensions.crypt(p_new_pin, extensions.gen_salt('bf', 8)),
      failed_attempts = 0,
      locked_until = null
  where player_id = p_player_id;
  if not found then
    raise exception 'Player not found.';
  end if;
end;
$$;

create or replace function public.rename_player(p_player_id uuid, p_name text)
returns public.players
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := private.clean_name(p_name);
  p public.players;
begin
  perform private.assert_game_admin(private.game_of_player(p_player_id));
  if not private.valid_name(v_name) then
    raise exception 'Use 2 to 24 letters or numbers for the name.';
  end if;
  update public.players set display_name = v_name where id = p_player_id returning * into p;
  if not found then
    raise exception 'Player not found.';
  end if;
  return p;
exception
  when unique_violation then
    raise exception 'Another player in this game already uses the name "%".', v_name;
end;
$$;

create or replace function public.remove_player(p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_game_admin(private.game_of_player(p_player_id));
  delete from public.players where id = p_player_id;
  if not found then
    raise exception 'Player not found.';
  end if;
end;
$$;

create or replace function public.mentor_games()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_mentor();
  return coalesce((
    select jsonb_agg(
             to_jsonb(g) || jsonb_build_object(
               'player_count', (select count(*) from public.players p where p.game_id = g.id),
               'active_this_week', (select count(*) from public.players p
                                    where p.game_id = g.id and p.last_active_at > private.clock() - interval '7 days'),
               'trades', (select count(*) from public.orders o where o.game_id = g.id and o.status = 'filled'),
               'is_admin', private.is_game_admin(g.id),
               'admins', private.game_admin_list(g.id),
               'required_lessons', private.required_lessons(g.id)
             )
             order by g.created_at desc)
    from public.games g
  ), '[]'::jsonb);
end;
$$;

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
    'game', to_jsonb(g) || jsonb_build_object('required_lessons', private.required_lessons(g.id)),
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

drop function public.game_roster(uuid);
create function public.game_roster(p_game_id uuid)
returns table (
  player_id uuid,
  display_name text,
  total_value numeric,
  return_pct numeric,
  cash numeric,
  holdings int,
  trades int,
  open_orders int,
  lessons_completed int,
  lessons_required int,
  lessons_required_passed int,
  last_active_at timestamptz,
  joined_at timestamptz,
  locked boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  perform private.assert_mentor();
  return query
  select p.id,
         p.display_name,
         round(private.portfolio_value(p.id), 2),
         round((private.portfolio_value(p.id) / g.starting_cash - 1) * 100, 2),
         round(p.cash, 2),
         (select count(*) from public.positions x where x.player_id = p.id)::int,
         (select count(*) from public.orders x where x.player_id = p.id and x.status = 'filled')::int,
         (select count(*) from public.orders x where x.player_id = p.id and x.status = 'open')::int,
         -- lessons passed: best exam score at or above PASS_MARK in assets/js/data/lessons.js
         (select count(*) from public.lesson_progress x where x.player_id = p.id and x.score >= 75)::int,
         (select count(*) from public.game_lessons gl where gl.game_id = g.id)::int,
         (select count(*) from public.game_lessons gl where gl.game_id = g.id)::int - private.lessons_left(p.id, g.id),
         p.last_active_at,
         p.created_at,
         coalesce(s.locked_until > private.clock(), false)
  from public.players p
  join public.games g on g.id = p.game_id
  left join private.player_secrets s on s.player_id = p.id
  where p.game_id = p_game_id
  order by private.portfolio_value(p.id) desc;
end;
$$;

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
  -- Required lessons: the game's admins can ask students to pass certain lessons first.
  -- Mirrored in assets/js/engine/trading.js with the same message.
  if private.lessons_left(p.id, g.id) > 0 then
    raise exception 'Finish your required lessons before trading. Open Learn to see what is left.';
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

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.clock(), private.is_mentor(), private.my_player_ids(),
  private.my_game_ids(), private.can_view_player(uuid), private.is_game_admin(uuid)
  to anon, authenticated;

revoke execute on function
  public.set_game_admin(uuid, text, boolean),
  public.set_game_lessons(uuid, text[]),
  public.complete_lesson(uuid, text, int),
  public.reset_exam(uuid, text),
  public.game_roster(uuid)
  from public, anon;

grant execute on function
  public.set_game_admin(uuid, text, boolean),
  public.set_game_lessons(uuid, text[]),
  public.complete_lesson(uuid, text, int),
  public.reset_exam(uuid, text),
  public.game_roster(uuid)
  to authenticated;
