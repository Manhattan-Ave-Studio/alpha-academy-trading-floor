# Alpha Academy Trading Floor

A stock market game with money lessons for the Alpha Academy Mentoring Program of the Gamma Iota Lambda Chapter (Brooklyn), Alpha Phi Alpha Fraternity, Inc. Students are the program's high school members. Mentors are chapter brothers.

The full handover is `docs/HANDOVER.md`. Read it before any change bigger than a copy fix.

## Status

- Built and tested; **not deployed**. No Supabase project, Alpaca keys, or live site exist yet. The README's "Go live" section has the nine setup steps.
- With no Supabase settings in `config.js`, the site runs in demo mode: a simulated market and sample classmates in the browser, saved to localStorage.
- Hosting is Vercel. `vercel.json` runs `scripts/build-site.mjs`, which publishes only the browser files and writes the Supabase settings from Vercel's environment variables into the published `config.js`.

## Commands

```bash
npm install          # test tools only; the site has no runtime dependencies and no build step
npm test             # 72 tests: SQL on PGlite, edge function, demo engine parity, lesson content, helpers, hosting build
npm run dev          # http://localhost:5173
npm run test:e2e     # demo browser smoke test; needs npm run dev running
npm run test:live    # live mode end to end against a local Supabase stand-in on :5174
npm run build:preview  # dist/preview.html, the demo as one file
npm run build:site   # dist/site, what Vercel publishes; reads SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY
npm run seed         # regenerate supabase/seed.sql after editing assets/js/data/universe.js
```

Browser tests: `SCREENSHOTS=dir` saves screenshots at phone and desktop widths; `FONT_CSS=file` serves fonts locally when Google Fonts is unreachable; `BASE_URL` points the demo smoke test elsewhere.

## Map

- `assets/js/app.js`: boot, shell, routes, tick loops. `assets/js/views/`: one module per page.
- `assets/js/api/index.js` picks `LiveApi` (`live.js`, Supabase) or `DemoApi` (`demo.js`). Both must expose the same methods.
- `assets/js/engine/trading.js` mirrors the SQL order rules for demo mode; `sim.js` is the deterministic demo market.
- `assets/js/data/`: lessons (`lessons-*.js` content, `lessons.js` registry and helpers), `glossary.js`, `resources.js`, `universe.js`.
- `supabase/migrations/`: 100 core and RLS, 200 market data, 300 trading engine, 400 people and mentors, 500 service, then later changes with their own dates (20261020000100 keeps last activity mentor-only; 20261021000100 adds game admins, required lessons, and exam tries, and redefines `place_order`, `complete_lesson`, `game_roster`, and the mentor functions in full).
- `supabase/functions/market/`: the Deno edge function for quotes, bars, news, profiles, and the every-minute cycle.
- `tests/`: `sql/` (PGlite harness), `edge/`, `engine/`, `data/`, `lib/` (helper unit tests), `site/` (hosting build), `e2e/`, `support/` (market fakes, live stand-in, exam helper).

## Rules that are easy to break

- **Keep `config.js` in demo mode.** Live Supabase settings come from Vercel's environment variables at build time. Committed live values would point local development and CI's browser tests at real student data.
- **Hash routing.** Routes are `#/path`. An in-page link like `href="#section"` navigates away. Use a button with `data-goto` and `scrollIntoView`, as `views/learn.js` does.
- **Views** return `{ html, mount(el) }`; `mount` may return a cleanup function or `{ tick, destroy }`. Clear intervals and observers in cleanup.
- **Escaping.** The `html` tagged template escapes every value. `raw()` is for trusted markup only (lesson HTML, icons, charts). Never pass names, notes, or any user text to `raw()`.
- **The database is the referee.** Order rules live in `20261011000300_trading.sql`, and `20261021000100_modules_and_admins.sql` redefines `place_order` in full to add the required lessons check, so the later file holds the current body. Change a rule in both, mirror it in `engine/trading.js` with the same error message, and extend the parity tests.
- **SQL functions:** `security definer`, `set search_path = ''`, schema-qualified names, explicit grants, `private.clock()` for the time, error messages written for students. Clients read through RLS and write only through functions.
- **New API method:** add it to both `LiveApi` and `DemoApi`, add a SQL test that also proves the wrong caller is refused, and teach `tests/support/live-server.mjs` any new Data API feature the client uses.
- **Pass mark** is 75 in `PASS_MARK` in `assets/js/data/lessons.js` and in every `score >= 75` in SQL: `game_roster` (`20261011000400_people.sql`, and its redefinition in the modules migration), `lessons_left`, and `complete_lesson` (`20261021000100_modules_and_admins.sql`). Change them all.
- **Exam tries** is 3 in two places: `EXAM_TRIES` in `assets/js/data/lessons.js` and `attempts >= 3` with its "all 3 tries" message in `complete_lesson` (`20261021000100_modules_and_admins.sql`). Change both; `tests/lib/lessons.test.mjs` fails when they disagree.
- **Game admins.** A mentor function that changes a game or its players starts with `private.assert_game_admin(game_id)`, not `assert_mentor`; reads (`mentor_games`, `game_roster`, student pages) stay open to every mentor. The client reads `is_admin` from `mentorGames()` and disables what a non-admin cannot do, but the database decides, and a game with no admins left (none of them is a mentor any longer, or its creator had no mentor login when the migration ran) is open to every mentor. A new admin-only function needs a SQL test that a mentor who is not an admin is refused.
- **Exams shuffle** question and choice order, so every question must stand alone. Each exam has exactly 8 questions.
- **Lesson terms** must exist in `glossary.js`; `npm test` checks this along with exam answers, HTML balance, and dashes.
- **Students are minors.** No analytics or trackers on student pages. Lesson videos play on the page through YouTube's privacy-enhanced player (youtube-nocookie.com), loaded only when a student presses Play: no thumbnails or player before that, and an Open on YouTube link beside each. `npm run test:e2e` fails if a lesson page contacts YouTube before Play.
- **Styling** comes from tokens at the top of `assets/css/app.css` (dark first, full light theme). One typeface, Outfit, through `--font-display`, `--font-body`, `--font-data`. Old gold is `#cfb53b`; use `--gold-text` for gold text. Tabular figures for numbers that line up. `[hidden]` is forced to `display: none`.

## Copy style

- Direct and calm, second person, short paragraphs, sentence case for headings, labels, and buttons. No all-caps labels.
- No em dashes or en dashes anywhere, including code comments that ship as copy. Use commas, colons, parentheses, or periods; ranges use "to".
- No hype, no exclamation points, no "that's not X, that's Y" flips. State what to do and why.
- Figures that change yearly carry their year, and get a row in the refresh table in `docs/HANDOVER.md` section 10.
- Facts about the organizations: Alpha Phi Alpha was founded December 4, 1906, at Cornell University. Gamma Iota Lambda was chartered in 1945. Keep the two dates distinct.

## Working here

- Branch, then pull request. No direct pushes to `main`. Commit messages start with `feat:`, `fix:`, `docs:`, or `test:`.
- Before deployment, editing the existing migrations is fine. After the first deployment, every schema change is a new migration file.
- Change tests in the same commit as behavior. Run `npm test` before every commit, and the browser tests after any UI change, then look at the screenshots at both widths.
- CI (`.github/workflows/tests.yml`) runs `npm test` and both browser tests on every pull request. A pull request is ready when both checks pass.
