// Runs the real migrations inside PGlite (Postgres compiled to WebAssembly) with a small
// stand-in for Supabase's auth schema and roles, so RLS and SECURITY DEFINER behave like production.
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const SUPABASE_STUB = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
grant anon, authenticated, service_role to postgres;
create schema extensions;
create extension pgcrypto with schema extensions;
grant usage on schema extensions to anon, authenticated, service_role;
create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
create table auth.users (
  id uuid primary key,
  email text,
  is_anonymous boolean not null default false,
  created_at timestamptz default now()
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(coalesce(current_setting('request.jwt.claim.sub', true),
                         (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')), '')::uuid
$$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
grant execute on function auth.uid(), auth.jwt() to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
set timezone = 'UTC';
`;

// options.postgrestTypes: return numeric as numbers, dates as YYYY-MM-DD, and timestamps as ISO
// strings, the way the Supabase Data API (PostgREST) serializes them.
export async function createDb(options = {}) {
  const parsers = options.postgrestTypes
    ? {
        1700: (v) => Number(v),
        1082: (v) => v,
        1184: (v) => new Date(v.replace(' ', 'T').replace(/([+-]\d\d)$/, '$1:00')).toISOString()
      }
    : undefined;
  const db = new PGlite({ extensions: { pgcrypto }, ...(parsers ? { parsers } : {}) });
  await db.exec(SUPABASE_STUB);
  const dir = join(root, 'supabase', 'migrations');
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(dir, f), 'utf8'));
  }
  await db.exec(readFileSync(join(root, 'supabase', 'seed.sql'), 'utf8'));
  return new Harness(db);
}

export class Harness {
  constructor(db) {
    this.db = db;
  }

  async setNow(iso) {
    await this.db.query(`select set_config('app.now', $1, false)`, [iso]);
  }

  async createUser({ email = null, anon = false } = {}) {
    const id = randomUUID();
    await this.db.query('insert into auth.users (id, email, is_anonymous) values ($1, $2, $3)', [id, email, anon]);
    return { id, email, anon };
  }

  // Run fn inside a transaction as a given principal: a user object, 'service', or null (anon).
  async as(who, fn) {
    const db = this.db;
    await db.exec('begin');
    try {
      if (who === 'service') {
        await db.exec('set local role service_role');
      } else if (who) {
        await db.query(`select set_config('request.jwt.claims', $1, true)`, [
          JSON.stringify({ sub: who.id, role: 'authenticated', is_anonymous: !!who.anon })
        ]);
        await db.exec('set local role authenticated');
      } else {
        await db.exec('set local role anon');
      }
      const out = await fn(db);
      await db.exec('commit');
      return out;
    } catch (e) {
      await db.exec('rollback');
      throw e;
    }
  }

  async rpc(who, fn, args = {}) {
    const keys = Object.keys(args);
    const sql = `select * from public.${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(', ')})`;
    return this.as(who, async (db) => (await db.query(sql, keys.map((k) => args[k]))).rows);
  }

  async rpc1(who, fn, args = {}) {
    const rows = await this.rpc(who, fn, args);
    const row = rows[0];
    if (row && Object.keys(row).length === 1 && Object.keys(row)[0] === fn) return row[fn];
    return row;
  }

  async select(who, sql, params = []) {
    return this.as(who, async (db) => (await db.query(sql, params)).rows);
  }

  // Superuser query, bypassing RLS (test setup and assertions).
  async sql(sql, params = []) {
    return (await this.db.query(sql, params)).rows;
  }

  async quotes(rows) {
    return this.rpc1('service', 'ingest_quotes', { p_rows: JSON.stringify(rows) });
  }

  async cycle() {
    return this.rpc1('service', 'run_market_cycle');
  }
}
