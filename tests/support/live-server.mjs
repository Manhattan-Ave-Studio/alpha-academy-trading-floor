// A local stand-in for a Supabase project, used to test live mode in a real browser:
//   * Postgres: the real migrations in PGlite, with row level security enforced per request
//   * Data API: the subset of PostgREST the app uses (table reads with filters, and RPC)
//   * Auth: anonymous and email/password sessions with JWT-shaped tokens
//   * Functions: the real `market` edge function, with Alpaca and Finnhub faked
//   * Static hosting for the site, with config.js pointed at this server
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createDb } from '../sql/harness.mjs';
import { createFakeMarket, callRpc, loadMarketFunction } from './market-fakes.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json' };
const IDENT = /^[a-z_][a-z0-9_]*$/;

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

export async function startLiveServer({ port = 5174, now = Date.parse('2026-10-12T14:00:00Z'), cronSecret = 'cron-secret-for-tests' } = {}) {
  const h = await createDb({ postgrestTypes: true });
  await h.setNow(new Date(now).toISOString());
  const origin = `http://localhost:${port}`;

  // One database connection: run requests one at a time.
  let chain = Promise.resolve();
  const serial = (fn) => {
    const p = chain.then(fn, fn);
    chain = p.catch(() => {});
    return p;
  };

  const users = new Map(); // id -> {id, email, password, is_anonymous}
  const tokens = new Map(); // access token -> user id
  const refresh = new Map(); // refresh token -> user id

  function issue(user) {
    const iat = Math.floor(now / 1000); // the browser clock is set to the same moment
    const access = `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub: user.id, role: 'authenticated', aud: 'authenticated', email: user.email ?? '', is_anonymous: !!user.is_anonymous, iat, exp: iat + 3600 })}.${Buffer.from(randomUUID()).toString('base64url')}`;
    const rt = randomUUID();
    tokens.set(access, user.id);
    refresh.set(rt, user.id);
    return {
      access_token: access,
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: iat + 3600,
      refresh_token: rt,
      user: publicUser(user)
    };
  }

  function publicUser(u) {
    return {
      id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email ?? '', phone: '',
      app_metadata: { provider: u.is_anonymous ? 'anonymous' : 'email' }, user_metadata: {}, identities: [],
      is_anonymous: !!u.is_anonymous, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
    };
  }

  async function createUser({ email = null, password = null, anon = false }) {
    const id = randomUUID();
    await serial(() => h.sql('insert into auth.users (id, email, is_anonymous) values ($1, $2, $3)', [id, email, anon]));
    const user = { id, email, password, is_anonymous: anon };
    users.set(id, user);
    return user;
  }

  function principal(req) {
    const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const uid = tokens.get(auth);
    if (!uid) return null;
    const u = users.get(uid);
    return { id: u.id, anon: !!u.is_anonymous };
  }

  // ---------------------------------------------------------------- market function
  const market = createFakeMarket({ now: () => now });
  globalThis.fetch = market.fetch;
  const fnModule = await loadMarketFunction({
    env: {
      SUPABASE_URL: origin,
      SUPABASE_SERVICE_ROLE_KEY: 'service-key',
      ALPACA_KEY_ID: 'alpaca-key',
      ALPACA_SECRET_KEY: 'alpaca-secret',
      CRON_SECRET: cronSecret,
      FINNHUB_API_KEY: 'finnhub-key'
    },
    client: () => ({
      rpc: async (fn, args) => {
        try {
          return { data: await serial(() => callRpc(h, 'service', fn, args)), error: null };
        } catch (e) {
          return { data: null, error: { message: e.message } };
        }
      },
      auth: {
        getUser: async (jwt) => {
          const uid = tokens.get(jwt);
          return uid ? { data: { user: publicUser(users.get(uid)) }, error: null } : { data: { user: null }, error: { message: 'invalid JWT' } };
        }
      }
    })
  });
  fnModule.setClock(() => now);

  // ---------------------------------------------------------------- Data API (subset)
  async function tableRead(table, params, who) {
    if (!IDENT.test(table)) throw Object.assign(new Error('bad table'), { status: 400 });
    let select = (params.get('select') || '*').replace(/\s+/g, '');
    let embedGames = false;
    if (select.includes('games(*)')) {
      embedGames = true;
      select = select.replace(/,?games\(\*\)/, '');
    }
    const cols = select.split(',').filter(Boolean).map((c) => {
      if (c === '*') return 't.*';
      if (!IDENT.test(c)) throw Object.assign(new Error(`bad column ${c}`), { status: 400 });
      return `t.${c}`;
    });
    const where = [];
    const vals = [];
    for (const [k, v] of params.entries()) {
      if (['select', 'order', 'limit', 'offset'].includes(k)) continue;
      if (!IDENT.test(k)) throw Object.assign(new Error(`bad filter ${k}`), { status: 400 });
      const dot = v.indexOf('.');
      const op = v.slice(0, dot);
      const raw = v.slice(dot + 1);
      if (op === 'eq' || op === 'neq') {
        vals.push(raw);
        where.push(`t.${k}::text ${op === 'eq' ? '=' : '<>'} $${vals.length}`);
      } else if (op === 'in') {
        const list = raw.replace(/^\(|\)$/g, '').match(/("([^"]*)"|[^,]+)/g) || [];
        vals.push(list.map((x) => x.replace(/^"|"$/g, '')));
        where.push(`t.${k}::text = any($${vals.length}::text[])`);
      } else {
        throw Object.assign(new Error(`unsupported operator ${op}`), { status: 400 });
      }
    }
    let order = '';
    if (params.get('order')) {
      order = ' order by ' + params.get('order').split(',').map((o) => {
        const [col, dir] = o.split('.');
        if (!IDENT.test(col)) throw Object.assign(new Error(`bad order ${col}`), { status: 400 });
        return `t.${col} ${dir === 'desc' ? 'desc' : 'asc'}`;
      }).join(', ');
    }
    const limit = params.get('limit') ? ` limit ${Number(params.get('limit'))}` : '';
    const sql = `select ${cols.join(', ')}${embedGames ? ', to_jsonb(g) as games' : ''} from public.${table} t`
      + (embedGames ? ' left join public.games g on g.id = t.game_id' : '')
      + (where.length ? ' where ' + where.join(' and ') : '') + order + limit;
    return serial(() => h.select(who, sql, vals)).then((rows) => JSON.parse(JSON.stringify(rows)));
  }

  // ---------------------------------------------------------------- HTTP
  async function body(req) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const s = Buffer.concat(chunks).toString('utf8');
    return s ? JSON.parse(s) : {};
  }

  function send(res, status, data, headers = {}) {
    res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
    res.end(data === undefined ? '' : JSON.stringify(data));
  }

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, origin);
    const path = url.pathname;
    try {
      // Auth
      if (path === '/auth/v1/signup' && req.method === 'POST') {
        const b = await body(req);
        if (b.email) {
          if ([...users.values()].some((u) => u.email === b.email)) return send(res, 422, { code: 422, error_code: 'user_already_exists', msg: 'User already registered' });
          return send(res, 200, issue(await createUser({ email: b.email, password: b.password })));
        }
        return send(res, 200, issue(await createUser({ anon: true })));
      }
      if (path === '/auth/v1/token' && req.method === 'POST') {
        const b = await body(req);
        if (url.searchParams.get('grant_type') === 'password') {
          const u = [...users.values()].find((x) => x.email === b.email && x.password === b.password);
          if (!u) return send(res, 400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
          return send(res, 200, issue(u));
        }
        const uid = refresh.get(b.refresh_token);
        if (!uid) return send(res, 400, { code: 400, error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token' });
        return send(res, 200, issue(users.get(uid)));
      }
      if (path === '/auth/v1/logout') {
        res.writeHead(204);
        return res.end();
      }
      if (path === '/auth/v1/user') {
        const p = principal(req);
        return p ? send(res, 200, publicUser(users.get(p.id))) : send(res, 401, { msg: 'invalid JWT' });
      }

      // Data API
      if (path.startsWith('/rest/v1/rpc/') && req.method === 'POST') {
        const fn = path.slice('/rest/v1/rpc/'.length);
        if (!IDENT.test(fn)) return send(res, 404, { message: 'not found' });
        const args = await body(req);
        try {
          const data = await serial(() => callRpc(h, principal(req), fn, args));
          return send(res, 200, data);
        } catch (e) {
          const permission = /permission denied/.test(e.message);
          return send(res, permission ? 403 : 400, { code: permission ? '42501' : 'P0001', message: e.message, details: null, hint: null });
        }
      }
      if (path.startsWith('/rest/v1/') && req.method === 'GET') {
        const table = path.slice('/rest/v1/'.length);
        try {
          return send(res, 200, await tableRead(table, url.searchParams, principal(req)));
        } catch (e) {
          return send(res, e.status || 400, { code: '42501', message: e.message, details: null, hint: null });
        }
      }

      // Functions
      if (path === '/functions/v1/market') {
        const headers = new Headers();
        for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
        const b = req.method === 'POST' ? JSON.stringify(await body(req)) : undefined;
        const r = await fnModule.handle(new Request(origin + path, { method: req.method, headers, body: b }));
        res.writeHead(r.status, Object.fromEntries(r.headers.entries()));
        return res.end(await r.text());
      }

      // Site
      if (path === '/config.js') {
        res.writeHead(200, { 'Content-Type': TYPES['.js'] });
        return res.end(`window.APP_CONFIG = ${JSON.stringify({ supabaseUrl: origin, supabaseKey: 'sb_publishable_test', publicUrl: origin + '/' })};`);
      }
      let p = decodeURIComponent(path);
      if (p.endsWith('/')) p += 'index.html';
      const file = normalize(join(root, p));
      if (!file.startsWith(root)) throw new Error('outside');
      const info = await stat(file);
      if (!info.isFile()) throw new Error('not a file');
      res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      return res.end(await readFile(file));
    } catch (e) {
      if (!res.headersSent) send(res, 404, { message: e.message });
    }
  });

  await new Promise((resolve) => server.listen(port, resolve));

  return {
    origin,
    now,
    h,
    market,
    serial,
    async cron(action = 'refresh') {
      const r = await fnModule.handle(new Request(origin + '/functions/v1/market', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-cron-secret': cronSecret },
        body: JSON.stringify({ action })
      }));
      return r.json();
    },
    async sql(q, params) {
      return serial(() => h.sql(q, params));
    },
    close: () => new Promise((resolve) => server.close(resolve))
  };
}
