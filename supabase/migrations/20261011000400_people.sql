-- Alpha Academy Trading Floor
-- Migration 4 of 4: joining games, student tools, and the mentor panel.
--
-- Students sign in anonymously (no email), then join with the game code, a display name, and a PIN.
-- On a new device they "rejoin" with the same code, name, and PIN. Five wrong PINs lock the
-- player for 10 minutes; mentors can reset a PIN at any time.
-- Mentors sign in with email and password and become mentors with the mentor code.

create or replace function private.new_join_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  i int;
begin
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.games where join_code = v_code);
  end loop;
  return v_code;
end;
$$;

create or replace function private.clean_name(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g')
$$;

create or replace function private.valid_name(p_name text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_name ~ '^[[:alnum:]][[:alnum:] ._''-]{1,23}$'
$$;

create or replace function private.clean_code(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'))
$$;

-- ---------------------------------------------------------------------------
-- Students
-- ---------------------------------------------------------------------------

create or replace function public.join_game(p_code text, p_name text, p_pin text)
returns public.players
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_now timestamptz := private.clock();
  v_name text := private.clean_name(p_name);
  g public.games;
  p public.players;
begin
  if v_uid is null then
    raise exception 'Start a session first, then join.';
  end if;
  select * into g from public.games where join_code = private.clean_code(p_code);
  if not found then
    raise exception 'No game matches that code. Double-check it with your mentor.';
  end if;
  if g.status = 'ended' then
    raise exception 'That game has ended.';
  end if;
  if not private.valid_name(v_name) then
    raise exception 'Use 2 to 24 letters or numbers for your name (spaces, periods, apostrophes, and dashes are fine).';
  end if;
  if coalesce(p_pin, '') !~ '^[0-9]{4,6}$' then
    raise exception 'Your PIN must be 4 to 6 digits.';
  end if;

  select * into p from public.players where game_id = g.id and user_id = v_uid;
  if found then
    return p;
  end if;

  if exists (select 1 from public.players x where x.game_id = g.id and lower(x.display_name) = lower(v_name)) then
    raise exception 'Someone in this game already uses the name "%". If that is you, choose "I already joined" instead.', v_name;
  end if;

  insert into public.players (game_id, user_id, display_name, cash, created_at, last_active_at)
  values (g.id, v_uid, v_name, g.starting_cash, v_now, v_now)
  returning * into p;

  insert into private.player_secrets (player_id, pin_hash)
  values (p.id, extensions.crypt(p_pin, extensions.gen_salt('bf', 8)));

  insert into public.transactions (player_id, kind, amount, cash_after, note, created_at)
  values (p.id, 'adjustment', g.starting_cash, g.starting_cash, 'Starting cash', v_now);

  return p;
end;
$$;

-- Returns {ok, message, player}. It does not raise on a wrong PIN, so the attempt counter is saved.
create or replace function public.rejoin_game(p_code text, p_name text, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_now timestamptz := private.clock();
  g public.games;
  p public.players;
  sec private.player_secrets;
  v_other public.players;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'message', 'Start a session first, then rejoin.');
  end if;
  select * into g from public.games where join_code = private.clean_code(p_code);
  if not found then
    return jsonb_build_object('ok', false, 'message', 'No game matches that code. Double-check it with your mentor.');
  end if;
  select * into p from public.players where game_id = g.id and lower(display_name) = lower(private.clean_name(p_name)) for update;
  if not found then
    return jsonb_build_object('ok', false, 'message', 'No player with that name is in this game. Check the spelling, or join as a new player.');
  end if;
  select * into sec from private.player_secrets where player_id = p.id for update;

  if sec.locked_until is not null and sec.locked_until > v_now then
    return jsonb_build_object('ok', false, 'message',
      format('Too many wrong PINs. Try again in %s minutes, or ask your mentor to reset your PIN.',
             ceil(extract(epoch from (sec.locked_until - v_now)) / 60)::int));
  end if;

  if extensions.crypt(coalesce(p_pin, ''), sec.pin_hash) <> sec.pin_hash then
    update private.player_secrets
    set failed_attempts = sec.failed_attempts + 1,
        locked_until = case when sec.failed_attempts + 1 >= 5 then v_now + interval '10 minutes' end
    where player_id = p.id;
    return jsonb_build_object('ok', false, 'message',
      case when sec.failed_attempts + 1 >= 5
           then 'Too many wrong PINs. This player is locked for 10 minutes. Your mentor can reset your PIN.'
           else 'That PIN does not match. Try again.' end);
  end if;

  if p.user_id = v_uid then
    return jsonb_build_object('ok', true, 'player', to_jsonb(p));
  end if;

  select * into v_other from public.players where game_id = g.id and user_id = v_uid;
  if found then
    return jsonb_build_object('ok', false, 'message',
      format('This device is already playing as "%s" in this game. Sign out first to switch players.', v_other.display_name));
  end if;

  update public.players set user_id = v_uid, last_active_at = v_now where id = p.id returning * into p;
  update private.player_secrets set failed_attempts = 0, locked_until = null where player_id = p.id;
  return jsonb_build_object('ok', true, 'player', to_jsonb(p));
end;
$$;

create or replace function public.set_watch(p_player_id uuid, p_symbol text, p_on boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.players := private.own_player(p_player_id);
  v_symbol text := upper(trim(coalesce(p_symbol, '')));
begin
  if p_on then
    if not exists (select 1 from public.symbols where symbol = v_symbol) then
      raise exception 'Unknown symbol %.', v_symbol;
    end if;
    if (select count(*) from public.watchlist where player_id = p.id) >= 100 then
      raise exception 'Your watchlist is full (100 symbols).';
    end if;
    insert into public.watchlist (player_id, symbol, added_at)
    values (p.id, v_symbol, private.clock())
    on conflict do nothing;
  else
    delete from public.watchlist where player_id = p.id and symbol = v_symbol;
  end if;
end;
$$;

create or replace function public.complete_lesson(p_player_id uuid, p_lesson_id text, p_score int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.players := private.own_player(p_player_id);
begin
  if p_lesson_id is null or p_lesson_id !~ '^[a-z0-9-]{1,64}$' then
    raise exception 'Unknown lesson.';
  end if;
  insert into public.lesson_progress (player_id, lesson_id, score, completed_at)
  values (p.id, p_lesson_id, greatest(0, least(100, coalesce(p_score, 0))), private.clock())
  on conflict (player_id, lesson_id) do update
    set score = greatest(public.lesson_progress.score, excluded.score),
        completed_at = case when excluded.score > public.lesson_progress.score
                            then excluded.completed_at else public.lesson_progress.completed_at end;
  update public.players set last_active_at = private.clock() where id = p.id;
end;
$$;

create or replace function public.heartbeat(p_player_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.players set last_active_at = private.clock()
  where id = p_player_id and user_id = (select auth.uid())
$$;

-- ---------------------------------------------------------------------------
-- Mentors
-- ---------------------------------------------------------------------------

-- Run once in the SQL editor: select private.set_mentor_code('a long phrase only mentors know');
create or replace function private.set_mentor_code(p_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if char_length(trim(coalesce(p_code, ''))) < 10 then
    raise exception 'Use a mentor code of at least 10 characters.';
  end if;
  insert into private.settings (key, value)
  values ('mentor_code_hash', extensions.crypt(trim(p_code), extensions.gen_salt('bf', 10)))
  on conflict (key) do update set value = excluded.value;
end;
$$;

create or replace function public.claim_mentor(p_code text, p_display_name text default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_hash text;
begin
  if v_uid is null then
    raise exception 'Sign in with your email account first.';
  end if;
  if coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) then
    raise exception 'Mentors sign in with an email account, not a student session.';
  end if;
  select value into v_hash from private.settings where key = 'mentor_code_hash';
  if v_hash is null then
    raise exception 'Mentor sign-up is not set up yet. Ask the site admin to set a mentor code.';
  end if;
  if extensions.crypt(trim(coalesce(p_code, '')), v_hash) <> v_hash then
    raise exception 'That mentor code is not right.';
  end if;
  insert into public.mentors (user_id, display_name)
  values (v_uid, nullif(left(trim(coalesce(p_display_name, '')), 60), ''))
  on conflict (user_id) do update
    set display_name = coalesce(excluded.display_name, public.mentors.display_name);
  return true;
end;
$$;

create or replace function public.set_mentor_code(p_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_mentor();
  perform private.set_mentor_code(p_code);
end;
$$;

create or replace function public.add_mentor_by_email(p_email text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  perform private.assert_mentor();
  select u.id into v_user
  from auth.users u
  where lower(u.email) = lower(trim(p_email)) and coalesce(u.is_anonymous, false) = false;
  if v_user is null then
    raise exception 'No email account found for %. They need to create a mentor login first.', trim(p_email);
  end if;
  insert into public.mentors (user_id) values (v_user) on conflict do nothing;
  return true;
end;
$$;

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
  return g;
end;
$$;

-- p_patch keys: name, status, starts_at, ends_at, starting_cash (only before anyone joins),
-- allow_fractional, max_position_pct, min_share_price, commission, show_holdings, announcement
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
  perform private.assert_mentor();
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

-- All games with headline numbers, for the mentor dashboard.
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
               'trades', (select count(*) from public.orders o where o.game_id = g.id and o.status = 'filled')
             )
             order by g.created_at desc)
    from public.games g
  ), '[]'::jsonb);
end;
$$;

create or replace function public.game_roster(p_game_id uuid)
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

create or replace function public.reset_player_pin(p_player_id uuid, p_new_pin text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_mentor();
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
  perform private.assert_mentor();
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
  perform private.assert_mentor();
  delete from public.players where id = p_player_id;
  if not found then
    raise exception 'Player not found.';
  end if;
end;
$$;

-- Restart a game: everyone back to starting cash, history cleared, benchmark restarted.
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
  perform private.assert_mentor();
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

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.clock(), private.is_mentor(), private.my_player_ids(),
  private.my_game_ids(), private.can_view_player(uuid)
  to anon, authenticated;

revoke execute on function
  public.join_game(text, text, text),
  public.rejoin_game(text, text, text),
  public.set_watch(uuid, text, boolean),
  public.complete_lesson(uuid, text, int),
  public.heartbeat(uuid),
  public.claim_mentor(text, text),
  public.set_mentor_code(text),
  public.add_mentor_by_email(text),
  public.create_game(text, numeric, timestamptz, timestamptz, boolean, numeric, numeric, numeric, boolean, text),
  public.update_game(uuid, jsonb),
  public.mentor_games(),
  public.game_roster(uuid),
  public.reset_player_pin(uuid, text),
  public.rename_player(uuid, text),
  public.remove_player(uuid),
  public.reset_game(uuid, numeric)
  from public, anon;

grant execute on function
  public.join_game(text, text, text),
  public.rejoin_game(text, text, text),
  public.set_watch(uuid, text, boolean),
  public.complete_lesson(uuid, text, int),
  public.heartbeat(uuid),
  public.claim_mentor(text, text),
  public.set_mentor_code(text),
  public.add_mentor_by_email(text),
  public.create_game(text, numeric, timestamptz, timestamptz, boolean, numeric, numeric, numeric, boolean, text),
  public.update_game(uuid, jsonb),
  public.mentor_games(),
  public.game_roster(uuid),
  public.reset_player_pin(uuid, text),
  public.rename_player(uuid, text),
  public.remove_player(uuid),
  public.reset_game(uuid, numeric)
  to authenticated;
