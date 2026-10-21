# Alpha Academy Trading Floor: developer handover

This document is for whoever picks up the code next, including Claude Code sessions. It covers what exists, what has been verified, how the pieces fit, the conventions to keep, and what to build next. `CLAUDE.md` at the repository root is the short version that Claude Code reads automatically; this is the long version.

Last updated October 21, 2026.

---

## 1. Status at a glance

| Area | State | How it was verified |
| --- | --- | --- |
| Front end, demo mode | Complete | Browser smoke test of 15 pages at phone and desktop widths (no option in a row of chips or segmented buttons cut off), a trade flow, the mentor panel with its Admins and Required lessons panels, two lesson exams, the required lessons lock, an exam that runs out of tries and the mentor's Reset exam, and the swipeable Browse row on a touch phone (`npm run test:e2e`) |
| Front end, live mode | Complete | End-to-end browser test against a local stand-in for Supabase: mentor signup, sync, search, new game with QR, student join, trades, rule limits, orders, leaderboard, lesson exam, rejoin on a second device, roster, trade notes, cron cycle, a required lesson that locks trading until it is passed, and a second mentor refused until an admin adds them by email (`npm run test:live`) |
| Database: schema, row level security, trading engine, mentor tools, game admins | Complete | Tests on real Postgres 18 (PGlite), including row level security, admin permissions, required lessons, and exam tries (the total is in section 7) |
| Market edge function | Complete | 12 tests with Alpaca and Finnhub answered by test doubles |
| Demo engine parity with SQL | Complete | Parity tests that run the same scenarios through both engines, including the required lessons lock |
| Lesson content | 21 lessons, 168 exam questions, 187 glossary terms | Content tests (answers, exams not guessable by length, terms, HTML balance, style, lessons named by title); facts checked October 11, 2026 (bonds and commodities lesson: October 12, 2026) |
| Hosting build (Vercel) | Complete | 4 tests: only browser files published, settings written from environment variables, secret keys refused; the demo browser test passes against the built folder |
| Game admins, required lessons, exam tries | Complete, October 21, 2026 | SQL tests (admin permissions, the lessons lock, tries), engine parity, helper unit tests (`tests/lib/lessons.test.mjs`), and both browser tests; section 9.9 covers rolling it out to a live site |
| Deployment | **Not deployed** | No Supabase project, Alpaca keys, or live site exist yet |

### Is the back end operational?

The back end is fully built and tested, and it is not running anywhere yet. Everything a live game needs is in the repository: the Postgres schema with row level security, every write path as a checked database function, the order engine, the every-minute market cycle, the mentor tools, and the edge function that pulls prices, charts, news, and company data. It becomes operational when someone completes the nine "Go live" steps in the README, which take about 45 minutes and use only free plans.

What the tests prove: the real migrations run on real Postgres, the real edge function code runs against fakes that answer like Alpaca and Finnhub, and the real browser client talks to a stand-in that speaks the subset of Supabase's Data API and Auth that the app uses.

What only a real deployment can prove:

1. Supabase specifics: PostgREST's handling of each RPC's return type, GoTrue anonymous sign-ins and their rate limits, and JWT refresh in the browser.
2. Alpaca's live responses: field names and edge cases in snapshots, bars, news, the asset list, and the calendar. The fakes follow Alpaca's documented shapes.
3. Scheduling: pg_cron, pg_net, and Vault working together to call the function every minute.
4. Real-world load: about 40 students refreshing at once during a session.

After deploying, run the checklist in section 9.8.

---

## 2. Architecture

```
 Students' phones and laptops            Mentors
            |                               |
            v                               v
   Vercel: static site (scripts/build-site.mjs copies it and adds settings)
     index.html, config.js, assets/, vendor/
            |  supabase-js (vendored)
            v
   Supabase project
     Auth ......... anonymous sessions (students), email + password (mentors)
     Data API ..... reads through row level security, writes through RPC functions
     Postgres ..... schema, order engine, mentor tools (supabase/migrations)
     pg_cron ...... every minute: POST /functions/v1/market {action: "refresh"}
     Edge function  "market": quotes, bars, news, profile, status, refresh, sync
            |
            v
   Alpaca market data (IEX real time; SIP daily history)      Finnhub (optional fundamentals)
```

**Two modes, one front end.** `assets/js/api/index.js` picks the API at boot. If `config.js` has `supabaseUrl` and `supabaseKey` and the Supabase client loaded, the app uses `LiveApi` (`assets/js/api/live.js`). Otherwise it uses `DemoApi` (`assets/js/api/demo.js`), which runs a simulated market and eight sample classmates in the browser and saves to localStorage. Both expose the same methods, so views never branch on mode except for small copy differences (`isDemo()`).

**The database is the source of truth for game rules.** Order validation, fills, expiries, snapshots, and the benchmark all live in SQL (`20261011000300_trading.sql`). The required lessons check was added by redefining `place_order` in full in `20261021000100_modules_and_admins.sql`, so that file now holds the current body of `place_order`: an order rule changed in the trading migration must be changed there too. The JavaScript engine in `assets/js/engine/trading.js` mirrors those rules for demo mode, and `tests/engine/engine.test.mjs` keeps the two in step.

**Every mentor reads; a game's admins change it.** Every mentor can list games and rosters and open student pages. Functions that change a game or its players check `private.assert_game_admin`. Whoever creates a game is its first admin, admins add other mentors by email, and a game with no admins left (none of them is a mentor any longer, or its creator had no mentor login when the migration ran) is open to every mentor.

**Students never write tables directly.** Every change goes through a `security definer` function with `set search_path = ''` that checks the caller. Row level security only grants reads.

---

## 3. Repository map

```
index.html                     page shell; loads fonts, app.css, config.js, app.js
vercel.json                    Vercel: skip install, build with scripts/build-site.mjs, publish dist/site
config.js                      Supabase URL and publishable key, public URL, names and links
assets/css/app.css             all styles: tokens (dark first, light theme), layout, components
assets/img/                    the Alpha Academy logo, favicon, and phone home-screen icon
assets/js/app.js               boot, shell (rail, top bar, ticker, tab bar), routes, tick loops, search
assets/js/state.js             shared store: session, player, quotes, market status, theme
assets/js/api/index.js         chooses live or demo
assets/js/api/live.js          Supabase client: RPCs, table reads, the market function
assets/js/api/demo.js          demo game: seed, bots, local order engine, persistence
assets/js/engine/trading.js    order rules mirrored from SQL (demo mode)
assets/js/engine/sim.js        deterministic simulated prices for demo mode
assets/js/lib/                 dom (html templates), format, router, charts, ui (sheets, toasts), icons, calendar, storage
assets/js/views/               one module per page (home, markets, stock, trade ticket, portfolio, orders,
                               leaderboard, player, learn, tools, resources, account, join, mentor, common)
assets/js/data/                lessons-*.js (content), lessons.js (registry and helpers), glossary.js,
                               resources.js, universe.js (98 featured symbols and collections)
vendor/                        supabase.js and qrcode.js, copied from node_modules by `npm run vendor`
supabase/migrations/           100 core schema and RLS, 200 market data, 300 trading, 400 people and mentors, 500 service, then dated changes (20261020000100 activity privacy; 20261021000100 game admins, required lessons, and exam tries)
supabase/seed.sql              featured symbols and the 2026 to 2028 NYSE calendar (generated by `npm run seed`)
supabase/setup/                1: mentor code, 2: cron jobs (refresh every minute, weekly sync, daily cleanup)
supabase/functions/market/     the edge function (Deno)
scripts/                       dev server, seed generator, vendor copier, single-file preview builder, hosting build
tests/sql/                     PGlite harness and database tests
tests/edge/                    edge function tests
tests/engine/                  demo engine parity tests
tests/data/                    lesson, glossary, and resource content tests
tests/lib/                     unit tests for small helpers: the activity window, lesson tries, the trading lock
tests/site/                    hosting build tests
tests/e2e/                     browser tests: demo smoke (smoke.mjs) and live mode (live-smoke.mjs)
tests/support/                 market fakes, live-mode stand-in server, exam helper
docs/                          mentor guide and this handover
```

---

## 4. Front end

### Boot and rendering

`app.js` reads `window.APP_CONFIG`, creates the API, restores the session (`loadSession` in `state.js`), registers routes, and renders. Routes are hashes (`#/stock/AAPL`), so the site works on GitHub Pages and inside embedded previews. Because the hash is the route, in-page anchors like `href="#section"` would break navigation. Use buttons with `data-goto` and `scrollIntoView` instead, as the lesson reader does.

A view is a function that returns `{ html, mount(el) }`. `mount` attaches listeners and may return a cleanup function, or an object with `tick()` and `destroy()`. The router calls the cleanup before the next render, and calls `view.tick()` on every price tick.

Two loops keep things fresh: `tickOnce` (every 4 seconds in demo, 30 seconds live) refreshes quotes for whatever is on screen and the player's portfolio, then updates any element marked with `data-q` or `data-pf` without re-rendering. `slowTick` (30 or 60 seconds) refreshes market status and the ticker. In live mode each pass also sends a heartbeat, at most once per `HEARTBEAT_MIN_GAP_MS` (50 seconds), so beats are at most `HEARTBEAT_MIN_GAP_MS + SLOW_TICK_LIVE_MS` apart. Hidden pages skip it, and the page sends one as soon as it is back on screen. The heartbeat sets `players.last_active_at`, which the mentor roster turns into an activity dot: active now (5 minutes or less, `ACTIVE_NOW_MINUTES` in `lib/format.js`), the last hour, or earlier. `tests/lib/activity.test.mjs` fails if two of those worst-case gaps no longer fit in the "active now" window. Students cannot read `last_active_at` directly (column privileges in the activity privacy migration); mentors get it from `game_roster` and `mentor_games`.

### Templates and escaping

`html` in `assets/js/lib/dom.js` is a tagged template that escapes every interpolated value. Booleans render as `true` or `false` (useful for `aria-pressed`). Wrap trusted markup in `raw()`, and only trusted markup: lesson HTML from `assets/js/data`, icons, and charts. Never pass user text (names, trade notes) to `raw()`.

### Styling

All color comes from tokens at the top of `app.css`, dark first with a complete light theme under `prefers-color-scheme: light` and `[data-theme="light"]`. Old gold is `--gold: #cfb53b`; `--gold-text` is the readable gold for text in each theme. Type is one family, Outfit, through three role tokens (`--font-display`, `--font-body`, `--font-data`); numbers that line up use `font-variant-numeric: tabular-nums`. Labels are sentence case. The `[hidden]` attribute is forced to `display: none` globally, so prefer `el.hidden = true` over inline styles.

### The Learn module

- **Content** lives in `assets/js/data/lessons-basics.js`, `lessons-portfolio.js`, `lessons-life.js`, and `lessons-legacy.js`. Each lesson is plain data (format in section 9.1).
- **Registry and rules** live in `assets/js/data/lessons.js`: track list, reading time (150 words a minute, computed from the text), `PASS_MARK` (75), `EXAM_TRIES` (3), and helpers such as `isPassed`, `passedCount`, `nextToStudy`, `correctToPass`, `triesUsed`, `triesLeft`, `examLocked`, `requiredLeft`, and `tradingLocked`. A progress entry is `{ score, completed_at, attempts }`; an entry saved before tries existed has no `attempts` and counts as one try.
- **Views** are in `assets/js/views/learn.js`: the course overview (`#/learn`), which marks the game's required lessons with a "Required" chip and says how many are passed ("Required before trading: 2 of 3 passed", with links to the ones left, or "Required lessons: all passed. Trading is open."); the reader (`#/learn/:id`) with a contents rail, reading progress bar, goals, numbered sections, videos, key terms, takeaways, discussion prompts, further reading, and a tries line ("3 tries. Score 75% or better to pass.", "Best so far 63%. 1 try left.", "Passed with 88%."); and the exam (`#/learn/:id/exam`), which refuses to start once the lesson is passed or the tries are used up ("No tries left. Ask a mentor to reset this exam.").
- **The exam** shuffles question order and choice order on every attempt, shows one question at a time with keyboard shortcuts (A to D, then Enter), and grades at the end with a full review. The ticker and phone tab bar hide during an exam (`body.exam-mode`). Every attempt is saved with `completeLesson(playerId, lessonId, score)`, which returns `{ score, attempts, completed_at }`: the server keeps the best score and counts the tries. A lesson counts as passed at a best score of 75% or more, and a passed lesson is finished (the server refuses a retake). Each exam allows 3 tries; after the third failing try it locks until an admin of the student's game resets it. The result screen says "Keep going" with the tries left, or "No tries left. Ask a mentor to reset this exam." with no retake button. A database without the modules migration answers `completeLesson` with nothing, and the view keeps its local entry then.
- **The pass mark appears in `PASS_MARK`** in `lessons.js` and in every `score >= 75` in SQL: `game_roster` in `20261011000400_people.sql` and its redefinition, `lessons_left`, and `complete_lesson` in `20261021000100_modules_and_admins.sql`. Change them together (recipe 9.3).
- **The tries count appears twice:** `EXAM_TRIES` in `lessons.js` and `attempts >= 3` with the "all 3 tries" message in `complete_lesson` in `20261021000100_modules_and_admins.sql`. Change both together; `tests/lib/lessons.test.mjs` fails when they disagree.
- **Required lessons and the trading lock.** `game_summary` returns the game's `required_lessons` (ids in the admins' order), and `refreshPlayer()` in `state.js` copies `summary.game` onto `store.current.game`, so views call `tradingLocked(store.current.game, store.lessons)`. Home shows a gold banner ("Trading opens after you pass: Order types, Researching a company", each linked) with a Learn button, and the trade ticket and the stock page's buy and sell bar show "Trading opens after you pass your required lessons." with a link to Learn. `validateOrder` in the demo engine throws the same message as `place_order`: "Finish your required lessons before trading. Open Learn to see what is left." Markets, portfolio, leaderboard, and Learn stay open. A game without `required_lessons` (no list, or a database without the migration) requires nothing. Test hooks: `data-required-line`, `data-required-chip`, `data-tries`, `data-exam-locked`, `data-trading-locked`.

### The mentor panel

`assets/js/views/mentor.js` lists games (`mentorGames()`, which carries `is_admin`, `admins`, and `required_lessons` per game) and shows one game with its QR code, status, announcement, roster, Required lessons panel, and Admins panel. The roster polls while the page is open; after saving admins or lessons the view refreshes the game from `mentorGames()` and redraws the affected panel without restarting that poll.

- **Admins panel:** each admin by display name with the email as a second line. Admins see "Add an admin by email" (hint: "They need a mentor login and the mentor code first."), an Add admin button, and a Remove button per admin, disabled on the last one with a visible hint under the list ("A game needs at least one admin. Add another admin before removing this one.", `data-admin-last-hint`, which the disabled button names through `aria-describedby`). Other mentors see the list and "Only admins can change this game. Ask one of them to add you.", a banner "You are not an admin of this game.", and the status buttons, announcement form, game settings, reset game, and the roster's Reset PIN, Rename, and Remove buttons disabled. The roster itself stays visible. The database makes the same decision, so a disabled control is a courtesy and the server message ("Only this game's admins can change it. Ask one of them to add you as an admin.") is the rule.
- **Required lessons panel:** every lesson as a checkbox, grouped by track with Select all per track, a count ("3 lessons required"), the sentence "Students cannot trade until they pass every required lesson.", and "Save required lessons", which calls `setGameLessons(gameId, ids)` in catalog order. Non-admins see the checkboxes disabled.
- **Roster:** a Required column after Lessons ("2 of 3", or "none" when the game requires nothing; a dash is not house style), in the CSV too. Rows from a database without the migration have no counts and read as "none".
- **Student page** (`views/player.js`, mentor view): every lesson with "Passed 88%", "Best 63% · 2 of 3 tries", or "Not yet", a Required chip, a Locked chip when the tries are used up, and for admins a Reset exam button on any lesson with tries used and no pass yet (`resetExam(playerId, lessonId)`), which updates the row in place. The page finds the student's game in `mentorGames()` for `is_admin` and `required_lessons`.
- A game whose `is_admin` is missing (a database without the migration) is treated as open to every mentor. A game with no admins left needs no special case: `private.is_game_admin` answers true for every mentor, so `mentor_games` reports `is_admin` true with an empty `admins` list, and the panel says "No admins right now, so every mentor can change this game."
- Test hooks: `data-admins-panel`, `data-admin-email`, `data-admin-remove`, `data-lessons-panel`, `data-lesson-check="<id>"`, `data-lessons-save`, `data-required-count`, `data-reset-exam="<id>"`, `data-tries-cell`.

### Demo mode

`DemoApi` seeds a game that started on September 25, 2026 with sample trades, a watchlist, two lesson entries (What is a stock passed, which the sample game requires, and How the market works at a best of 63% with one try left), and eight bots with deterministic portfolios. The demo mentor is the game's only admin: `setGameLessons` and `resetExam` work and persist, and `setGameAdmin` throws "Adding admins needs the live setup. In the demo, you are the only mentor." Prices come from `sim.js`, a seeded random walk anchored to curated prices in `universe.js`, so every visitor sees the same market at the same moment. The demo market is open around the clock so the trade flow always works. `resetDemo()` clears it. The single-file preview (`npm run build:preview`) is demo mode with the CSV export hidden.

---

## 5. Data and back end

### Tables

| Table | Holds |
| --- | --- |
| `mentors` | users who claimed the mentor code |
| `games` | rules: starting cash, dates, status, position limit, minimum price, commission, fractional shares, holdings sharing, announcement, benchmark |
| `players` | one row per student per game: display name, cash, realized gains, activity |
| `private.player_secrets` | bcrypt PIN hash, failed attempts, lockout time |
| `private.settings` | the mentor code hash |
| `symbols`, `quotes`, `daily_bars`, `market_calendar`, `market_cache`, `app_status` | market data and pipeline health |
| `orders`, `positions`, `transactions`, `portfolio_snapshots` | the trading ledger |
| `watchlist`, `lesson_progress` | per-player extras (best exam score per lesson, and `attempts`, the tries used since the last reset) |
| `game_admins` | which mentors administer each game (`game_id`, `user_id`, `added_by`); `user_id` references `mentors` with `on delete cascade`, so a deleted mentor row or account takes its admin rows with it |
| `game_lessons` | the lessons a game requires before trading (`game_id`, `lesson_id`, `position`) |

### Who can call what

- **Students** (anonymous sessions): `join_game`, `rejoin_game`, `place_order`, `cancel_order`, `get_portfolio`, `get_leaderboard`, `game_summary`, `set_watch`, `complete_lesson`, `heartbeat`, `search_symbols`, `market_status`.
- **Mentors** (email accounts that claimed the mentor code): `claim_mentor`, `mentor_games`, `create_game`, `game_roster`, `add_mentor_by_email`, `set_mentor_code`.
- **A game's admins** (mentors listed in `game_admins` for that game, or any mentor when the game has none): `update_game`, `reset_game`, `reset_player_pin`, `rename_player`, `remove_player`, `set_game_lessons`, `set_game_admin`, `reset_exam`. Each starts with `private.assert_game_admin`, which raises "Only this game's admins can change it. Ask one of them to add you as an admin." for any other mentor.
- **Service role only** (the edge function): `ingest_*`, `active_symbols`, `touch_symbols`, `set_app_status`, `run_market_cycle`, and the `svc_*` helpers.

Helpers in the `private` schema (`is_mentor`, `my_player_ids`, `my_game_ids`, `can_view_player`, `own_player`, `assert_mentor`, `is_game_admin`, `assert_game_admin`, `game_of_player`, `lessons_left`, `required_lessons`, `game_admin_list`) back both the policies and the functions.

### Time

Every function reads the time from `private.clock()`, which returns `now()` unless the session sets `app.now`. Tests use that to move through market days. Clients cannot set it through the Data API.

### The order lifecycle

1. `place_order` checks that the game is open and that the player has passed every required lesson ("Finish your required lessons before trading. Open Learn to see what is left."), then validates the request against the game's rules (buying power with open-order reservations, position limit with ETFs exempt, minimum share price, fractional shares, commission) and raises friendly errors that the trade ticket shows word for word.
2. During market hours, with a quote traded in the last few minutes, a market order (or a marketable limit or triggered stop) fills immediately at the quote. Otherwise the order stays open.
3. Every minute, `run_market_cycle` ends due games, sets the S&P 500 starting price for new games, fills open orders whose conditions are met by fresh quotes (quotes must have traded after the session opened, so an overnight order fills at the next real price), expires day orders after the close, and takes one portfolio snapshot per player 15 minutes after each close.

### Prices

The cron job calls the function with `refresh`. The function asks Postgres which symbols matter (`active_symbols`: held, ordered, watched, featured, or recently viewed), fetches Alpaca snapshots in batches of 200, writes them with `ingest_quotes`, and runs the market cycle. Browsers read quotes from the `quotes` table first and ask the function for fresh ones only when a quote on screen is more than 90 seconds old, at most once a minute. Charts come from `daily_bars` (split-adjusted SIP history ending 16 minutes ago, as the free plan requires) and cached intraday bars. News is cached 15 minutes and company details a day in `market_cache`.

### Accounts

Students sign in anonymously. Joining binds that session to a player through the game code, a display name, and a 4 to 6 digit PIN (bcrypt; five misses lock the player for 10 minutes). On a new device, `rejoin_game` checks the PIN and moves the player to the new session. Mentors sign up with email and a password, then enter the mentor code once (`claim_mentor`).

### Game admins, required lessons, and exam tries

Added October 21, 2026 in `20261021000100_modules_and_admins.sql`.

- **Admins.** `create_game` inserts the creator into `game_admins`, and the migration backfills the creator of every existing game whose creator still has a mentor login. `set_game_admin(game_id, email, on)` adds or removes a mentor by the email of their login (case does not matter) and returns the list. It refuses an email with no mentor behind it ("No mentor uses the email X. They need to create a mentor login and enter the mentor code first.") and refuses to remove the last admin ("A game needs at least one admin. Add another admin before removing this one."). `set_game_admin` and `set_game_lessons` lock the game's row in `games` (`for update`) before they change anything, so two changes to one game run one at a time: two admins removing each other at the same moment cannot leave the game with no admin, and two saves of the lesson list cannot mix. `game_admins.user_id` references `mentors (user_id)` with `on delete cascade`, so a game ends up with no admins when none of its admins is a mentor any longer (their mentor rows, or the accounts behind them, were deleted), or, on a site that was live before this migration, when its creator had no mentor login when the backfill ran (`games.created_by` is set to null when the account goes). `private.is_game_admin` then answers true for every mentor, so no game is stranded, and any mentor can add an admin by email. `mentor_games` reports `is_admin`, `admins` (`user_id`, `email`, `display_name`), and `required_lessons` for each game; every mentor can see the admin emails.
- **Required lessons.** `set_game_lessons(game_id, lesson_ids[])` replaces the game's list (at most 50, each id matching `^[a-z0-9-]{1,64}$`) and keeps the order given. The database does not know the lesson catalog, so it checks the shape of an id and nothing more: an id that is not in `LESSONS` would count as required and could never be passed. The client sends ids from the catalog only. `private.lessons_left(player_id, game_id)` counts required lessons without a best score of 75 or more; `place_order` refuses while it is above zero, `game_summary` carries `required_lessons` for the student's views, and `game_roster` reports `lessons_required` and `lessons_required_passed`. Row level security lets mentors and the game's own players read `game_lessons`; only mentors read `game_admins`.
- **Exam tries.** `complete_lesson` refuses a retake once the lesson is passed ("You already passed this lesson, so there is nothing to retake.") and a fourth try ("You have used all 3 tries for this exam. Ask a mentor to reset it."); otherwise it adds one to `attempts`, keeps the best score and the date it was earned, and returns the row (it returned nothing before this migration). `reset_exam(player_id, lesson_id)`, for the game's admins, sets `attempts` to zero and keeps the best score; it raises "This student has not taken that exam yet." when there is no row. The migration sets `attempts` to 1 on rows that existed before it ran.

### Configuration and secrets

- `config.js`: `supabaseUrl`, `supabaseKey` (publishable), `publicUrl` (used in join links and QR codes), and display names. Keep the Supabase values empty in the repository.
- Vercel environment variables (Production): `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (or `SUPABASE_ANON_KEY`), and optionally `PUBLIC_URL`. `scripts/build-site.mjs` appends them to the published `config.js`, so preview deployments, local development, and CI stay in demo mode. It refuses `sb_secret_` and `service_role` keys.
- Edge function secrets: `ALPACA_KEY_ID`, `ALPACA_SECRET_KEY`, `CRON_SECRET`, and optionally `FINNHUB_API_KEY`, `ALPACA_FEED` (`iex` or `delayed_sip`), `ALLOWED_ORIGINS`.
- Vault (for pg_cron): `market_project_url`, `market_cron_secret`.

---

## 6. Security and privacy

- Students give no email and no full name. Display names are first name and last initial by convention, which mentors can rename.
- Reads go through row level security. Orders, trade notes, and lesson scores are visible only to the student and to mentors. Classmates see leaderboard totals, and holdings only when a mentor turns sharing on.
- Every function is `security definer` with an empty `search_path` and schema-qualified names, so a caller cannot redirect it to their own objects.
- The function checks callers itself (JWT verification is off by design): users through `auth.getUser`, the scheduler through `x-cron-secret`. CORS can be limited with `ALLOWED_ORIGINS`.
- Student sessions inactive for 60 days are removed by the cleanup job; the player record stays, so they can rejoin with their PIN.
- Only a game's admins can change it (its settings, players, required lessons, and exam resets). Every mentor can read every game, roster, and student page, and can see who a game's admins are, including their email addresses, so they know whom to ask. Students cannot read `game_admins`; they can read their own game's required lessons.
- The exam is graded in the browser, and `complete_lesson` records the score the client sends (clamped to 0 to 100), as it did before required lessons existed. The required lessons gate and the three tries therefore hold for a student who uses the app as built. A student with the browser console, the publishable key, and their own session can call `complete_lesson` with a passing score, and the review screen shows the correct answer to every missed question after any try, so the gate is a pacing rule for a mentored room, not a proctoring control. Do not tie anything beyond trading access to a recorded pass without moving the grading to the server (section 11).
- The students are minors. Keep analytics and third-party trackers out of the student pages unless a parent-facing policy covers them. Lesson videos play on the page, but nothing loads from YouTube until a student presses Play: the page shows a plain Play button (no thumbnail, since thumbnails come from YouTube's servers), then loads YouTube's privacy-enhanced player from youtube-nocookie.com. That is the same moment the old links sent a student to YouTube. In privacy-enhanced mode, YouTube says views are not used to personalize the viewer's YouTube experience or ads; once the player loads, Google still receives the student's IP address and the site's origin. Each video keeps an Open on YouTube link. The demo browser test fails if a lesson page contacts YouTube before Play.
- YouTube's API terms have extra rules for sites directed to children under 13 (COPPA), including telling Google the site is child-directed. The program serves high school students, so this has not come up; read YouTube's current developer policies if younger students ever join. The player also follows YouTube's other embed rules: it sends the site's origin as the referrer (YouTube refuses to play without one, error 153), it is at least 200 pixels tall, and nothing covers it.

---

## 7. Testing

```bash
npm install                 # once; includes Playwright 1.56 and PGlite
npm test                    # 72 tests: SQL, edge function, engine parity, content, helpers, hosting build
npm run dev                 # serves the site at http://localhost:5173
npm run test:e2e            # demo-mode browser test (needs npm run dev in another terminal)
npm run test:live           # live mode end to end, starts its own stand-in server on :5174
```

- Playwright needs Chromium once: `npx playwright install chromium`.
- `SCREENSHOTS=dir` saves screenshots from both browser tests. Review them at phone and desktop widths after any visual change.
- `FONT_CSS=file` serves fonts from a local CSS file when the test machine cannot reach Google Fonts.
- **Database tests** (`tests/sql`) run the real migrations in PGlite with a small stand-in for Supabase's `auth` schema and roles. `h.as(user, fn)` runs as a student, mentor, anonymous caller, or the service role, with row level security enforced. `h.setNow(iso)` moves the clock. The admin tests sign in a second mentor to prove that reads stay open and writes are refused until an admin adds them by email.
- **Unit tests** (`tests/lib`) cover small helpers: the activity window (`activity.test.mjs`) and the lesson tries and trading lock helpers (`lessons.test.mjs`), which also read the modules migration to check that `EXAM_TRIES` still matches `complete_lesson`.
- **Edge tests** bundle `supabase/functions/market/index.ts` with esbuild, stub the Supabase client to call the PGlite database, and answer Alpaca and Finnhub with `tests/support/market-fakes.mjs`.
- **The live stand-in** (`tests/support/live-server.mjs`) serves the site plus enough of PostgREST, GoTrue, and Edge Functions to run the real browser client. If the app starts using a new Data API feature (a filter operator, an embed), add it there.
- **Hosting build tests** (`tests/site`) run `scripts/build-site.mjs` into a temporary folder and check what it publishes and the `config.js` it writes.
- **Exams in browser tests:** questions are shuffled, so `tests/support/exam.mjs` reads each question from the page and answers it from the lesson data.
- **Continuous integration** (`.github/workflows/tests.yml`) runs on every pull request and every merge to `main`, on Node 22. One job runs `npm test`. The other installs Chromium, runs the demo smoke test against `npm run dev`, then the live test, and keeps both tests' screenshots for 14 days (open the run, then Artifacts). The live test runs even when the demo test fails, so one run reports both.

When behavior changes, change the tests in the same commit. When copy changes, `npm test` catches broken exams, missing glossary terms, unbalanced HTML, and em or en dashes.

---

## 8. Conventions

**Copy.** Direct and calm, second person, short paragraphs, sentence case. No em dashes or en dashes anywhere (use commas, colons, parentheses, or periods; ranges use "to"). No hype or exclamation points. Prefer positive statements of what to do. Avoid "that's not X, that's Y" constructions. Explain the reason behind advice. Numbers that change yearly carry a year ("the 2026 limit is $7,500").

**Facts.** Every current figure (limits, wages, aid amounts, statistics) comes from a primary or reputable source and is listed in section 10 for the yearly refresh. Historical claims follow their sources' exact wording when sources disagree (for example, Maggie Lena Walker is "often called the first woman to charter a bank," and the National Park Service calls her the first woman to lead a successful one).

**JavaScript.** Vanilla ES modules, no framework, no build step for the site. Keep modules small and views self-contained. Use the `html` template for markup and `raw()` only for trusted strings.

**SQL.** New changes go in a new migration file with a later timestamp once the project is deployed. (Before the first deployment, editing the existing files is fine.) Functions: `security definer`, `set search_path = ''`, schema-qualified names, explicit `grant execute` to the right roles, `private.clock()` for time, and error messages written for students. A mentor function that changes a game or its players starts with `private.assert_game_admin(game_id)`; one that only reads starts with `private.assert_mentor()`.

**Git.** Branch, then pull request. Commit messages start with `feat:` (or `fix:`, `docs:`, `test:`). No direct pushes to `main`.

---

## 9. Recipes

### 9.1 Add or edit a lesson

Lessons are objects in the four `lessons-*.js` files:

```js
{
  id: 'order-types',                 // URL slug, lowercase letters, numbers, hyphens
  track: 'basics',                   // basics | portfolio | life | legacy
  title: 'Order types: market, limit, and stop',
  summary: `One sentence shown under the title and on the course page.`,
  goals: [`What the student will be able to do`, `...`],          // 3
  sections: [{ id: 'limit', title: 'Limit orders: price first', html: `<p>...</p>` }],   // 5 to 9
  takeaways: [`...`],                // 4 to 6 short sentences
  discuss: [`...`],                  // 2 or 3 questions for the mentor session
  videos: [{ title: 'Stop Order vs. Limit Order', youtube: 'TeHmx3H54jo', source: 'Investopedia' },
           { title: 'Boss: The Black Experience in Business', url: 'https://...', source: 'PBS', note: '...' }],
  links: [{ title: 'Introduction to Investing', org: 'Investor.gov (U.S. SEC)', url: 'https://...' }],
  terms: ['market-order', 'limit-order'],                         // keys in glossary.js
  exam: [{ q: `...`, choices: [`...`, `...`, `...`, `...`], answer: 1, explain: `...` }]   // exactly 8
}
```

Section HTML can use `p`, `ul`, `ol`, `strong`, `table class="data-table"`, `div class="figures"`, `ol class="timeline"`, and asides: `note idea` (big idea), `note example` (worked example), `note warn` (watch out), `note try` (try it in the game), `note alpha` (Alpha connection). Exam questions are shuffled, so each must stand on its own. Then run `npm test`.

### 9.2 Add a lesson video

Most videos come from Investopedia's YouTube channel (youtube.com/@investopedia), mostly its "Investopedia Video" explainer series. Khan Academy and official channels (TreasuryDirect, the Federal Reserve, the CFTC) are good second choices. Search YouTube for the topic plus the channel name, confirm the channel, and copy the 11-character ID from the URL. Add it to the lesson's `videos` with the channel as `source` (the `yt()` helper fills in Investopedia). Videos play on the lesson page, so the uploader must allow embedding: open `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=ID&format=json`, which returns data only for public, embeddable videos. Older videos can be removed by their channel, so check the links each semester (see the roadmap for an automated check).

### 9.3 Change the pass mark, the tries count, or the exam length

Pass mark: change `PASS_MARK` in `assets/js/data/lessons.js` and every `score >= 75` in SQL: `game_roster` in the people migration and its redefinition in the modules migration, plus `lessons_left` and `complete_lesson` there. Then update `tests/data/content.test.mjs` and the SQL roster test.

Tries: change `EXAM_TRIES` in `lessons.js` and, in `complete_lesson` in the modules migration, the `attempts >= 3` check and the "all 3 tries" message. `tests/lib/lessons.test.mjs` reads the migration and fails until both agree; then update the SQL tries test. The lesson page's "3 tries" copy comes from the constant.

The exam length check (8) is in the content test.

### 9.4 Add a featured company

Add it to `assets/js/data/universe.js` with a name, type, sector, collections, blurb, and demo price and volatility. Run `npm run seed` and apply the new `supabase/seed.sql`. Any listed U.S. stock is already searchable and tradable in live mode after a sync; the featured list only drives collections, the ticker, and demo mode.

### 9.5 Add a game rule

1. Add the column to `games` (core migration) and accept it in `create_game` and `update_game`.
2. Enforce it in `place_order` (trading migration) with a student-friendly error.
3. Mirror it in `validateOrder` in `assets/js/engine/trading.js` with the same message.
4. Add it to the mentor forms in `views/mentor.js` and to `rulesList` in `views/account.js`.
5. Add SQL tests and an engine parity case.

### 9.6 Add a database function

Write it with `security definer` and `set search_path = ''`, grant execute only to the roles that need it, add a method to both `LiveApi` and `DemoApi`, and add a SQL test that also proves the wrong caller is refused. If it changes a game or its players, start it with `private.assert_game_admin`, lock the game's row (`for update`) the way `set_game_admin` does when two calls at once could disagree, and let the test prove that a mentor who is not an admin is refused, not only a student.

### 9.7 Rebuild the shareable preview

`npm run build:preview` writes `dist/preview.html`: the demo as one file with CSS and JS inlined. `PUBLIC_URL=https://... npm run build:preview` sets the address used in example join links.

### 9.8 After the first deployment

1. `select * from public.app_status;` shows a recent refresh and no errors.
2. `select * from cron.job_run_details order by start_time desc limit 5;` shows successful runs every minute.
3. As a mentor: sign up, claim the code, press "Sync symbols and calendar now," create a game.
4. On the game's page: check one lesson under Required lessons and press Save required lessons. The Admins panel lists you as the admin.
5. On a phone: join with the QR code. Home shows "Trading opens after you pass" that lesson; pass its exam, then buy one share during market hours, place a limit order below the price, open a stock chart and news.
6. On a second device: rejoin with the same name and PIN.
7. Back as the mentor: the roster shows the student with Required "1 of 1", and the student's page shows the trade note and the passed lesson.
8. After 4:15 p.m. ET: the leaderboard shows today's change from the closing snapshot.

### 9.9 Roll out the game admins change to a live site

For a first deployment, the migration is simply part of step 2 of the README's "Go live" (it runs after the activity privacy one). For a site that was already live before October 21, 2026, in this order:

1. Merge the pull request and let Vercel deploy the site. The client runs against either database, with limits against the old one: `completeLesson` answers with nothing (the view keeps its local score), `required_lessons` is missing (treated as none), the roster has no Required counts (shown as "none"), every mentor can still change every game through the older functions, and the Admins, Required lessons, and Reset exam controls fail with a server error that names a function the database cannot find (`set_game_admin`, `set_game_lessons`, `reset_exam`). Students keep trading and taking exams.
2. Run `supabase/migrations/20261021000100_modules_and_admins.sql` the way the database was created (README step 2): paste it into the SQL editor for a project set up with option A, or `npx supabase db push` for one set up with option B (the CLI). `db push` applies every file in `supabase/migrations` that the project's migration history does not list, and running files in the SQL editor records nothing there, so on an option A project it would start by running `20261011000100_core.sql` again and stop at the first table that already exists. To move an option A project onto the CLI once: `npx supabase link --project-ref YOUR-PROJECT-REF`, then `npx supabase migration repair --status applied VERSION` for each of the six earlier versions (`20261011000100`, `20261011000200`, `20261011000300`, `20261011000400`, `20261011000500`, `20261020000100`), after which `db push` applies only the new file. The migration creates `game_admins` and `game_lessons`, adds `lesson_progress.attempts`, makes the creator of each existing game its admin when that creator still has a mentor login, and counts every existing exam entry as one try. It redefines `complete_lesson`, `game_roster`, `place_order`, and the mentor functions, so run the whole file in one go.
3. Check it: open a game as its creator and see yourself under Admins; open it as another mentor and see the controls disabled; require a lesson and confirm a student's home shows the lock. A game whose creator's login was deleted before the migration reads "No admins right now, so every mentor can change this game." under Admins; add an admin by email there.

Deploy before migrating rather than after: the old mentor panel would show the server's "Only this game's admins" error to non-admin mentors instead of disabled controls, and the old lesson page would still offer unlimited retakes. The recommended order has a rough edge of its own: between steps 1 and 2 the three new mentor controls show the missing-function error from step 1, so run step 2 soon after the deploy.

---

## 10. Yearly content refresh

| Fact | Where | Source | When it changes |
| --- | --- | --- | --- |
| NYC minimum wage ($17 in 2026) | Budgeting your paycheck | ny.gov | January |
| IRA limit ($7,500), 401(k) limit ($24,500) | Investing accounts, glossary | IRS | Announced each fall |
| Standard deduction ($16,100 single, 2026) | Budgeting your paycheck, glossary | IRS | Announced each fall |
| Pell Grant maximum ($7,395 for 2026-27) | Paying for college, glossary | Federal Student Aid | Announced each winter |
| FAFSA year (2027-28 open) | Paying for college, resources | StudentAid.gov | October 1 |
| Excelsior income limit ($125,000) | Paying for college | HESC | Rarely |
| Trump account rules (new in 2026) | Investing accounts | IRS | Still being finalized |
| SPIVA results (2025: 79%; 15 years: about 9 in 10) | Index funds and ETFs | S&P Dow Jones Indices | Each March |
| FTC fraud losses (2025: $15.9 billion; investment scams $7.9 billion) | Spotting scams | FTC | Each March |
| BLS median pay (2025 figures) | Careers in finance | BLS Occupational Outlook Handbook | Each fall |
| Federal Reserve wealth figures (2022 survey) | Building generational wealth | Survey of Consumer Finances | Every three years; watch for the 2025 survey results |
| Market drops table (through 2025) | Bulls, bears, and volatility | Index history | After any new bear market |
| NYSE holidays (seeded through 2028) | `scripts/nyse-calendar.mjs`, `seed.sql` | NYSE | Extend before 2029; the weekly sync also loads the broker calendar |
| Treasury purchases ($100 minimum at TreasuryDirect) and terms (bills 4 to 52 weeks; notes 2 to 10 years; bonds 20 or 30; TIPS 5, 10, 30) | Beyond stocks | TreasuryDirect | When Treasury adds or drops a term (the 6-week bill arrived in 2025) |
| Bond index worst year (2022, about 13%, through 2025) | Beyond stocks | Bloomberg U.S. Aggregate Bond Index | After any year the index loses more than 13% |
| Savings bonds ($25 minimum; $10,000 of EE and of I bonds per person a year, 2026) | Beyond stocks, glossary | TreasuryDirect | Rarely; check each fall |
| Video links | Lesson `videos` | YouTube | Check each semester. The bonds and commodities videos (WQhowJQoIag, mS7t91U9Qqg, 3g6P0lRXotI) were confirmed by ID, title, and channel on October 12, 2026, but their embedding could not be tested from the build environment |

---

## 11. Known gaps and risks

- **Not yet deployed** (section 1). The first deployment is the highest-value next step.
- **Free plan limits.** Supabase pauses free projects after about a week without activity, for example over winter break; restore from the dashboard. Alpaca's free data plan allows 200 calls a minute, far above this app's needs.
- **IEX prices.** Real-time prices come from the IEX exchange alone. For thinly traded stocks they can lag the consolidated price; `ALPACA_FEED=delayed_sip` trades freshness for completeness.
- **Lesson videos** are mostly older Investopedia explainers, plus two Khan Academy videos in the bonds and commodities lesson. The Investopedia IDs were found through search on October 11, 2026, and the three newest on October 12, 2026. None could be loaded from the build environment, so after deploying, open each lesson and press Play on every video to confirm it plays on the page. A video whose owner turned off embedding shows an error in the player; replace it, or students can use its Open on YouTube link.
- **Postgres versions.** The database tests run on Postgres 18 (PGlite). A Supabase project may run an earlier major version. A scan of the migrations found no features that need 18, and the first deployment confirms it.
- **Required checks.** CI reports on every pull request, but a failing check blocks a merge only once `main` has a rule that requires it (Settings, then Rules).
- **Accessibility** follows good practice (labels, focus states, keyboard exams, reduced motion) but has not had a formal audit with a screen reader.
- **Content sensitivity.** The pioneers lesson covers the Tulsa Race Massacre and includes Robert F. Smith's 2020 tax settlement alongside his achievements. Mentors should be ready for questions about both.
- **Required lesson ids are not checked against the catalog** in SQL, since the database does not know the lessons. The mentor panel only sends ids from `LESSONS`, so this matters only for direct SQL: a stray id would lock every student in that game out of trading until `set_game_lessons` replaces the list.
- **A recorded pass is self-reported.** Exams are graded in the browser and `complete_lesson` stores the score it is sent (section 6), so the required lessons gate and the three tries are pacing rules, not proctoring. Server-side grading would need the answer keys in a `private` table seeded from `lessons-*.js`, `complete_lesson` taking the chosen answers instead of a score, the same in `DemoApi`, and a review screen that no longer shows the correct answers; take it on only if scores ever carry weight beyond trading access.
- **Admin emails are visible to every mentor** through `mentor_games`, by design, so a mentor knows whom to ask. Keep that in mind if anyone other than chapter brothers ever gets a mentor login.
- **Demo mode has one mentor**, so adding an admin cannot be tried there (`setGameAdmin` says so). Required lessons and exam resets work in the demo.

---

## 12. Roadmap

Ordered by value for the program.

1. **Deploy and verify** (section 9.8), then point `gil1906.org/trading/` at it.
2. **Video link checker:** a script that asks YouTube's oEmbed endpoint about each video ID and fails if one disappears; run it in CI weekly.
3. **Lesson assignments, continued:** required lessons per game shipped in October 2026. Still to do: due dates, class results per question, and a CSV of lesson scores and tries.
4. **Notifications in the app:** a quiet inbox for fills, expirations, and new announcements.
5. **Season tools:** archive a finished game with its final leaderboard, and start a new season with the same roster.
6. **Practice mode for exams:** a mode that shows the explanation after each answer, alongside the graded exam.
7. **Accessibility audit** with VoiceOver and NVDA, then fixes.
8. **More lessons:** taxes on investments, insurance basics, entrepreneurship and small business finance, and reading the economy (inflation, interest rates, the Federal Reserve).

---

## 13. Decision log

| Decision | Why |
| --- | --- |
| Static site, vanilla JavaScript, no build step | Matches the chapter's GitHub Pages workflow; volunteers can edit any file in the browser |
| Vercel hosting, with Supabase settings from environment variables | The repository stays in demo mode for development, CI, and preview deployments; production gets its settings at build time; only browser files are published |
| Supabase for data, auth, functions, and scheduling | One free service covers everything, with Postgres row level security for privacy |
| Anonymous student sessions with a game code, name, and PIN | No student emails or full names; works on school devices and phones |
| Every write through a checked SQL function | One place to enforce game rules and permissions |
| Order engine in SQL, mirrored in JavaScript for demo mode | The database stays the referee; parity tests keep demo mode honest |
| Alpaca free market data (IEX real time) with optional Finnhub | Real prices at no cost; fundamentals when a key is added |
| Demo mode with a deterministic simulated market | Shareable previews, mentor training, and a working app before any setup |
| Outfit as the single typeface | The sans serif from the chapter's Future Forward campaign; sleek at headline sizes, readable in long lessons, with tabular figures for prices |
| Exams of 8 shuffled questions, passed at 75%, best score kept | Enough questions to check understanding, retakes encourage learning, shuffling discourages copying answers |
| Videos play on the page after Play, through youtube-nocookie.com | Students watch without leaving the lesson. Nothing loads from YouTube until a student chooses to watch, which suits a program for minors and keeps pages fast (October 2026; earlier the videos were links) |
| Admins per game, with every mentor still able to read every game | A brother who did not create a game can still help at a session and open student pages, while rule changes, resets, and removals stay with the game's own admins. A game with no admins left (none of them is a mentor any longer, or its creator had no mentor login when the migration ran) opens to every mentor so nothing is stranded (October 2026) |
| Required lessons lock trading only | The chapter asked that students finish assigned modules before the game. Markets, portfolio, leaderboard, and Learn stay open so a locked-out student can still watch and study (October 2026) |
| Three exam tries, then an admin reset; a pass is final | Unlimited retakes let students guess their way through. Three tries with the best score kept rewards studying, and a mentor's reset keeps a struggling student from being stuck (October 2026) |

---

## 14. First session checklist for Claude Code

1. Read `CLAUDE.md`, then this file.
2. `npm install`, then `npm test`. All 72 should pass.
3. `npm run dev`, open http://localhost:5173, and click through Learn, a lesson, its exam, Markets, a stock, the trade ticket, and the mentor panel (open the sample game for its Admins and Required lessons panels, then the demo student's page for Reset exam).
4. Before changing behavior, find the matching tests in section 7 and extend them.
5. After visual changes, run the browser tests with `SCREENSHOTS=` and look at the images at phone and desktop widths.
6. Keep copy in the house style (section 8) and update section 10 when you add a fact that changes over time.
