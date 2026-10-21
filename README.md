# Alpha Academy Trading Floor

A stock market game and money-skills course for the **Alpha Academy Mentoring Program** of the **Gamma Iota Lambda Chapter** (Brooklyn Alphas) of Alpha Phi Alpha Fraternity, Inc.

Students join a game with a code from their mentor, get the same play money, and trade real U.S. stocks and ETFs at real market prices. They compete on a leaderboard where the S&P 500 is the benchmark to beat, and they work through 21 lessons on investing, bonds and commodities, credit, college costs, and building wealth, each ending with an exam.

The site is plain HTML, CSS, and JavaScript (no build step), so it runs on GitHub Pages like the chapter site. Accounts, games, and trades live in a free Supabase project. Prices come from Alpaca's free market data.

## What's inside

**For students**
- Home dashboard: portfolio value, today's change, rank, and a chart of their value against the S&P 500 with the same starting cash
- Markets: search any U.S.-listed stock or ETF, index funds at a glance, curated groups ("Brands you know", "Sneakers and style", "Games, music, and streaming", and more), daily movers
- Stock pages: live price, charts (1D to 5Y, line or candles), key numbers with tap-to-define terms, company description, news, and their position
- A full trade ticket: market, limit, stop, and stop-limit orders; day or good-'til-canceled; buy by shares or by dollar amount; a review step; and a "Why this trade?" note their mentors can read
- Portfolio with allocation by holding or sector, orders with plain-English reasons for anything that did not fill, and a cash ledger
- Learn: 21 lessons in four tracks (Market Basics, Building a Portfolio, Money for Life, Wealth and Legacy). Each has learning goals, numbered sections with worked examples, short explainer videos (mostly Investopedia) that play right in the lesson, key terms, takeaways, mentor discussion prompts, and further reading, then an 8-question exam on its own screen (pass at 75%, 3 tries, best score saved; after the third miss the exam locks until a mentor resets it)
- Required lessons: when a game's admins require lessons, Learn marks each one "Required" and shows "Required before trading: 2 of 3 passed" with links to the ones left. The home screen and the trade ticket say "Trading opens after you pass your required lessons" until every one is passed. Markets, portfolio, leaderboard, and Learn stay open
- A glossary of more than 180 terms, and calculators for compound growth, credit card payoff, and a 50/30/20 budget
- Resources: vetted free links, including Brooklyn and NYC programs and a section on the history of Black Americans in finance (Library of Congress, Federal Reserve, OCC, Treasury, National Park Service, Smithsonian, PBS, and books)

**For mentors**
- Create games with their own rules: starting cash, single-stock limit, lowest share price, commission, fractional shares, whether classmates can see holdings, start and end dates
- Admins for each game: whoever creates a game is its first admin and adds other mentors as admins by email. Every mentor can open any game and see its roster and student pages; only its admins can change its rules, manage its players, assign required lessons, or reset an exam
- Required lessons: check the lessons students must pass before they can trade (for example, "Order types" before the first session) and save. The roster's Required column shows each student's count, like "2 of 3"
- A join code and QR code for each game, an announcement banner on every student's home screen, pause or end a game, reset a game after a practice round
- Roster with value, return, trades, lessons passed, and live activity: a green dot for students on the app right now, gold for the last hour, and a count like "4 of 5 active now" for spotting who has not logged on during a session. It refreshes as students join; reset a PIN, rename, or remove a player; download the roster as CSV
- Each student's page shows holdings, every trade note, and every lesson's best score with tries used. A Reset exam button gives a student 3 new tries on an exam they ran out of tries on
- Market data status and a one-click sync

**How the game works**
- Market orders fill at the latest price while the market is open (9:30 a.m. to 4:00 p.m. ET). Orders placed after hours wait and fill at the first price after the next opening bell, like a real brokerage.
- Limit, stop, and stop-limit orders are checked every minute against fresh prices. Day orders expire at the close; good-'til-canceled orders last up to 90 days.
- Holidays and 1:00 p.m. early closes follow the NYSE calendar.
- No short selling, margin, or options.
- A game's admins can require lessons. The database refuses a student's orders until every required lesson is recorded as passed, and the app shows the lock on the home screen and the trade ticket.

## Try it now (demo mode)

With no Supabase settings in `config.js`, the site runs a built-in demo: simulated prices, eight sample classmates, and progress saved in the browser. Everything works, including the mentor panel.

```bash
npm run dev        # serves the site at http://localhost:5173
```

No install is needed for that command; it uses Node.js only. Any static server works too, for example `python3 -m http.server 5173`.

## Go live

Plan on about 45 minutes. You will create three free accounts, run some SQL, deploy one function, and publish the site.

```
 Students' phones and laptops
            |
   Vercel: the static site
            |
   Supabase: Postgres + Auth  <---- every minute ----  pg_cron
            |                                            |
   "market" edge function  --------------------------->  Alpaca (prices, charts, news)
                                                         Finnhub (logos, market cap, P/E)
```

### 1. Create the accounts

1. **Supabase** (supabase.com): create a project. Pick the region closest to New York (US East). Save the database password somewhere safe.
2. **Alpaca** (alpaca.markets): sign up and choose paper trading. You do not fund anything. In the paper trading dashboard, find **API Keys** and generate a key ID and secret. The free plan includes real-time prices from the IEX exchange and years of daily history.
3. **Finnhub** (finnhub.io), optional: get a free API key. It adds company logos, market cap, P/E, dividend yield, and beta to stock pages.

From the Supabase dashboard you need three values (Project Settings, then API):
- **Project URL**, like `https://abcdefgh.supabase.co`
- **Publishable key** (also called the anon key)
- **Project reference**, the `abcdefgh` part of the URL

### 2. Create the database

**Option A: SQL editor (no tools to install).** In Supabase, open the SQL editor and run each file below, in this order, by pasting it in and pressing Run:

1. `supabase/migrations/20261011000100_core.sql`
2. `supabase/migrations/20261011000200_market.sql`
3. `supabase/migrations/20261011000300_trading.sql`
4. `supabase/migrations/20261011000400_people.sql`
5. `supabase/migrations/20261011000500_service.sql`
6. `supabase/migrations/20261020000100_activity_privacy.sql`
7. `supabase/migrations/20261021000100_modules_and_admins.sql`
8. `supabase/seed.sql` (featured companies and the 2026 to 2028 trading calendar)

**Option B: Supabase CLI.**

```bash
npx supabase login
npx supabase link --project-ref YOUR-PROJECT-REF
npx supabase db push          # runs the migrations
```

Then run `supabase/seed.sql` in the SQL editor. The CLI records each migration it applies, so later updates can use `db push` too. A project created with option A has no such record, so `db push` would try to run every file again and stop at the first table that already exists; `docs/HANDOVER.md` section 9.9 has the one-time repair that lets an option A project switch to the CLI.

If the site is already live and a later migration arrives with an update, deploy the site first and then run the new file the same way you created the database: paste it into the SQL editor (option A) or `npx supabase db push` (option B). Until the new file runs, the parts of the app that depend on it fail with a server error that names a function the database cannot find. For the October 2026 update, those are the Admins, Required lessons, and Reset exam controls; students keep trading and taking exams.

### 3. Turn on student sign-in

Students sign in without an email. Each device gets an anonymous session, and the game code, display name, and PIN tie it to their player.

1. In Supabase, open **Authentication**, then **Sign In / Providers**, and turn on **Allow anonymous sign-ins**.
2. Open **Authentication**, then **Rate Limits**, and raise the limit for anonymous sign-ins to about **150 per hour**. The default (30 per hour per IP address) can block a full room of students joining over one school network.
3. For mentor logins, either turn off **Confirm email** under the Email provider (simplest), or keep it on and set up custom SMTP so confirmation emails arrive. A third option: add each mentor yourself under **Authentication**, then **Users**, then **Add user**, with "Auto confirm" checked.

### 4. Set the mentor code

Open `supabase/setup/1-mentor-code.sql`, replace the placeholder with a phrase only mentors will know (at least 10 characters), and run it in the SQL editor. Mentors type this once after creating their login.

### 5. Deploy the market function

The function fetches prices, charts, news, and company details, and runs the every-minute order processing.

First, make a long random string for `CRON_SECRET`, for example with `openssl rand -hex 24`. Keep it; you need it again in step 6.

Add these secrets (Edge Functions, then Secrets):

| Name | Value |
| --- | --- |
| `ALPACA_KEY_ID` | Alpaca key ID |
| `ALPACA_SECRET_KEY` | Alpaca secret |
| `CRON_SECRET` | The random string you just made |
| `FINNHUB_API_KEY` | Finnhub key (optional) |
| `ALLOWED_ORIGINS` | Your site address, like `https://gil1906.org` (optional, recommended) |

Then deploy, by either:

- **CLI:** `npx supabase functions deploy market --no-verify-jwt`
- **Dashboard:** Edge Functions, then Deploy a new function, then Via editor. Name it `market`, paste in `supabase/functions/market/index.ts`, deploy, and in the function's settings turn **off** "Verify JWT" (also called "Enforce JWT verification"). The function checks callers itself.

### 6. Schedule the every-minute refresh

Open `supabase/setup/2-schedule-market-refresh.sql`, replace `YOUR-PROJECT-REF` and `YOUR-CRON-SECRET`, and run it in the SQL editor. If the editor says pg_cron or pg_net is not available, turn both on under Database, then Extensions, and run the file again.

The script schedules three jobs: the every-minute refresh, a weekly sync of the symbol list, and a daily cleanup of anonymous sign-ins whose player has been inactive for 60 days (those students keep their portfolios and rejoin with their PIN).

To check it, wait two minutes and run:

```sql
select * from cron.job_run_details order by start_time desc limit 5;
select * from public.app_status;
```

### 7. Point the site at Supabase

The site needs two values from Supabase (Project Settings, then API): the **Project URL** and the **publishable key**. Both are safe to publish. Row level security in the database decides what each person can read, and every change goes through checked database functions.

- **On Vercel (step 8):** leave `config.js` as it is and add these as environment variables on the Vercel project, for Production only:

  | Name | Value |
  | --- | --- |
  | `SUPABASE_URL` | Project URL, like `https://abcdefgh.supabase.co` |
  | `SUPABASE_PUBLISHABLE_KEY` | Publishable key (the anon key also works) |
  | `PUBLIC_URL` | Optional: the site's address, like `https://trading.gil1906.org/`, for join links and QR codes. Without it, the app uses the address the mentor has open. |

  The build writes them into the published `config.js`. The repository stays in demo mode, so development, tests, and Vercel's preview deployments never touch your live data. The build refuses a secret or `service_role` key, since anything in `config.js` is public.
- **On GitHub Pages or another static host:** edit `config.js`:

  ```js
  supabaseUrl: 'https://YOUR-PROJECT-REF.supabase.co',
  supabaseKey: 'YOUR-PUBLISHABLE-KEY',
  publicUrl: 'https://gil1906.org/trading/',
  ```

### 8. Publish the site

**Vercel (recommended).**

1. In Vercel, choose **Add New**, then **Project**, and import this repository. Keep the settings it shows: `vercel.json` skips the install, builds with `scripts/build-site.mjs` (which copies only the files the browser loads into `dist/site`), and publishes that folder.
2. Add the environment variables from step 7 under **Settings**, then **Environment Variables**, and redeploy.
3. Add a domain under **Settings**, then **Domains**, for example `trading.gil1906.org`, and create the DNS record Vercel shows at your domain registrar. Then set the market function's `ALLOWED_ORIGINS` secret (step 5) to that address.

Vercel's free Hobby plan deploys public repositories, and private repositories that belong to a personal GitHub account. A private repository owned by a GitHub organization needs Vercel Pro, or a public repository.

**GitHub Pages.** This folder is the whole site, served as is. Two options:

- **Its own repository.** Push this folder to a new repository, for example `trading`, and turn on GitHub Pages (Settings, then Pages, deploy from the `main` branch, root folder). If the chapter's GitHub account already serves gil1906.org as its main Pages site, a repository named `trading` appears at `https://gil1906.org/trading/` automatically. Otherwise, add a custom subdomain like `trading.gil1906.org` with a CNAME record at Namecheap.
- **Inside the chapter site repository.** Copy this folder in as `trading/` on a branch and open a pull request, following the usual branch and PR flow.

Keep the `vendor/` folder; it holds the Supabase client and the QR code library so the site does not depend on outside script hosts. `node_modules/`, `tests/`, and `scripts/` are only for development.

### 9. First run

1. Open the site, go to **Mentor panel**, create a mentor login, and enter the mentor code.
2. On the mentor dashboard, press **Sync symbols and calendar now**. This loads every U.S.-listed stock and ETF for search (about a minute).
3. Create a game. Put its QR code on screen at the next session.
4. On the game's page, under **Required lessons**, check the lessons students must pass before they can trade and press **Save required lessons**. The mentor guide suggests "Order types" for the first session. To let another brother run the game with you, add them under **Admins** by the email of their mentor login.

## Costs and limits

Everything above runs on free plans for a program of this size.

| Service | Free plan | This app's use |
| --- | --- | --- |
| Supabase | 500 MB database, 500,000 function calls a month, 50,000 monthly users | About 45,000 function calls a month from the scheduler, plus student page views |
| Alpaca | Real-time IEX prices, 200 calls a minute | One batched price call a minute, plus charts and news on demand |
| Finnhub | 60 calls a minute | Company details, cached for a day |

Notes:
- Free Supabase projects pause after a week with no activity, for example over a long break. Restore the project from the Supabase dashboard; nothing is lost.
- Prices come from the IEX exchange in real time. For large companies they track the consolidated market price closely. To use the official consolidated price delayed 15 minutes instead, add the secret `ALPACA_FEED=delayed_sip`.
- The free data plans are meant for personal, non-commercial use. A nonprofit mentoring program is a good fit; if the game grows well beyond the chapter, review each provider's terms.

## Privacy

- Students never give an email or full name. They choose a display name and a 4 to 6 digit PIN (stored as a bcrypt hash). Five wrong PINs lock the player for 10 minutes; a mentor can reset it.
- Students see classmates' names and totals on the leaderboard. Holdings stay private unless a mentor turns on sharing. Orders, trade notes, and lesson progress are visible only to the student and mentors.
- Mentors also see when each student was last active. While the app is open on screen, it records that about once a minute in the chapter's own database. Only mentors can read it, nothing goes to an outside service, and it stops when the student closes the app or the screen locks.
- Removing a player deletes their portfolio, orders, and progress.
- Mentors see each other's email addresses in a game's admin list, so they know whom to ask for access. Students never see them.
- Lesson videos load nothing from YouTube until a student presses Play. The video then plays in YouTube's privacy-enhanced player (youtube-nocookie.com), and Google receives the student's IP address, as with any YouTube visit. Each video also has an Open on YouTube link.

## Make it yours

- **Names and links:** `config.js`.
- **Colors and type:** the tokens at the top of `assets/css/app.css` (black and old gold, set in Outfit, the sans from the chapter's Future Forward campaign).
- **Logo:** the Alpha Academy Mentorship Program seal, in `assets/img/`: `alpha-academy-logo.webp` (320 pixels square, transparent background) for the app, `favicon.png` (64 pixels) for the browser tab, and `apple-touch-icon.png` (180 pixels, on the dark background) for phone home screens. To update it, replace those three files and keep their names and sizes.
- **Lessons:** `assets/js/data/lessons-*.js`. Each lesson is plain data: goals, sections in simple HTML, takeaways, discussion prompts, videos, links, key terms, and an 8-question exam. `npm test` checks every lesson for broken answers, missing terms, and unbalanced HTML. See `docs/HANDOVER.md` for the full format.
- **Featured companies:** `assets/js/data/universe.js`. After editing, run `npm run seed` and run the new `supabase/seed.sql`.
- **Resources and glossary:** `assets/js/data/resources.js` and `assets/js/data/glossary.js`.

## Development

```bash
npm install            # test tools only; the site itself has no dependencies
npm test               # 72 tests: database rules (real Postgres via PGlite), the market function, the demo engine, lesson content, lesson helpers, and the hosting build
npm run test:e2e       # browser smoke test of every page at phone and desktop widths (needs `npm run dev` running and `npx playwright install chromium`)
npm run test:live      # live mode in a real browser against a local stand-in for Supabase (mentor signup, new game, required lesson, join, trades, rejoin, roster, a second mentor added as an admin)
npm run build:preview  # single-file demo for sharing a preview link
npm run build:site     # the folder Vercel publishes (dist/site), with Supabase settings from SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY
npm run vendor         # refresh vendor/ from node_modules
```

The database tests run the real migrations in PGlite (Postgres compiled to WebAssembly) with a small stand-in for Supabase's auth schema, so row level security and every order rule are exercised the same way production runs them. The demo engine (`assets/js/engine/trading.js`) is tested against the same scenarios so both modes behave alike.

The live-mode test (`tests/support/live-server.mjs`) serves the site with the real migrations, the real market function (with Alpaca and Finnhub answered by test doubles), and enough of Supabase's Data API and Auth to run the actual browser client. It catches problems between the pieces that unit tests miss.

GitHub Actions runs all of these tests on every pull request and every merge to `main` (`.github/workflows/tests.yml`). Each run keeps the browser screenshots for 14 days: open the run, then download them under Artifacts.

## Troubleshooting

| What you see | Fix |
| --- | --- |
| "Student sign-in is turned off for this site" | Turn on anonymous sign-ins (step 3). |
| "Too many people joined from this network" | Raise the anonymous sign-in rate limit (step 3). |
| Prices never update | Check `cron.job_run_details` for errors, the function's logs in Supabase, and that `CRON_SECRET` matches in both places. |
| Market data status says "Not connected" | Add the Alpaca secrets to the function (step 5). |
| Search only finds about 100 companies | Press **Sync symbols and calendar now** in the mentor panel. |
| A mentor's confirmation email never arrives | Turn off "Confirm email" or add the mentor under Authentication, then Users (step 3). |
| Calls to the function fail with 401 | JWT verification is still on for `market`; turn it off (step 5). |
| A server error that a function could not be found, naming `set_game_lessons`, `set_game_admin`, or `reset_exam` | The site is newer than the database. Run the latest file in `supabase/migrations` the same way you created the database (step 2). |
| "Only this game's admins can change it" | You have a mentor login but are not one of that game's admins. Ask an admin to add you by email under **Admins** on the game's page. A game with no admins left (none of them is a mentor any longer, or its creator had no mentor login when the October 2026 update ran) is open to every mentor. |
| "No tries left" on a lesson exam | The student missed that exam three times. An admin of their game opens the student's page from the roster and presses **Reset exam** next to the lesson. The student gets 3 new tries and keeps their best score. |

## Files

```
index.html, config.js          the site
vercel.json                    Vercel settings: build with scripts/build-site.mjs, publish dist/site
assets/css/app.css             design tokens and components
assets/js/app.js               shell, routing, live price loop
assets/js/views/               pages
assets/js/api/live.js          Supabase and the market function
assets/js/api/demo.js          demo mode
assets/js/engine/              order rules (demo) and the simulated market
assets/js/data/                lessons and exams, glossary, resources, featured companies
supabase/migrations/           schema, security, trading engine, mentor tools, game admins and required lessons
supabase/functions/market/     market data and the every-minute cycle
supabase/setup/                mentor code and scheduler scripts
docs/mentor-guide.md           a one-page guide for mentors running sessions
docs/HANDOVER.md               the developer handover: architecture, status, conventions, roadmap
CLAUDE.md                      working notes for Claude Code
tests/                         database, function, engine, and browser tests
.github/workflows/tests.yml    runs every test on each pull request
```

Play money for learning. Nothing in this app is investment advice.
