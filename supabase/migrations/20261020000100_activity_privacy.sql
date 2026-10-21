-- Students' last activity is for mentors only.
--
-- The app sends a heartbeat about once a minute while a student has it on screen, so
-- players.last_active_at shows who is online right now. Mentors read it through game_roster and
-- mentor_games, which run as security definer. Before this migration, any student could also read
-- classmates' rows in public.players directly, including that column.
--
-- Students and mentors now read only these columns of public.players directly. The app's own read
-- (LiveApi.myPlayers) names them. Policies and security definer functions are unaffected.
--
-- Deploy the site with that change before running this on a live project: an older copy of the
-- app asks for every column, and Postgres refuses that once a column is withheld.

revoke select on public.players from authenticated;
grant select (id, game_id, user_id, display_name, cash, realized_pl, created_at)
  on public.players to authenticated;
