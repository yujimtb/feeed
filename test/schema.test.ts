import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

const A = '00000000-0000-0000-0000-00000000000a'
const B = '00000000-0000-0000-0000-00000000000b'

// Supabase の auth スキーマと authenticated ロールを最小限だけ再現する
const db = new PGlite()
await db.exec(`
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role authenticated;
  insert into auth.users values ('${A}'), ('${B}');
`)
await db.exec(readFileSync(new URL('../supabase/migrations/20261026000000_init.sql', import.meta.url), 'utf8'))
await db.exec('grant usage on schema public, auth to authenticated; grant all on all tables in schema public to authenticated;')

async function as<T>(user: string, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; set request.jwt.claim.sub = '${user}'; set role authenticated;`)
  return (await db.query<T>(sql, params)).rows
}

const [a] = await as<{ id: string }>(A, `insert into account (name, kind) values ('me', 'human') returning id`)
const [b] = await as<{ id: string }>(B, `insert into account (name, kind) values ('other', 'human') returning id`)

test('reply は root_id を継承し、created_at はサーバーが決める', async () => {
  const [root] = await as<{ id: string; root_id: string | null }>(A,
    `insert into post (account_id, via, body) values ($1, 'web', 'hi') returning id, root_id`, [a.id])
  assert.equal(root.root_id, null)
  const [r1] = await as<{ id: string; root_id: string }>(A,
    `insert into post (account_id, via, body, reply_to) values ($1, 'mcp', 're', $2) returning id, root_id`, [a.id, root.id])
  const [r2] = await as<{ root_id: string; created_at: Date }>(A,
    `insert into post (account_id, via, body, reply_to, created_at) values ($1, 'mcp', 're2', $2, '2000-01-01') returning root_id, created_at`, [a.id, r1.id])
  assert.equal(r1.root_id, root.id)
  assert.equal(r2.root_id, root.id)
  assert.ok(r2.created_at.getFullYear() > 2000)
})

test('他ユーザーの Account では投稿できず、Post も見えず、返信もできない', async () => {
  await assert.rejects(as(A, `insert into post (account_id, via, body) values ($1, 'web', 'x')`, [b.id]))
  const [p] = await as<{ id: string }>(B, `insert into post (account_id, via, body) values ($1, 'web', 'secret') returning id`, [b.id])
  assert.equal((await as(A, `select * from post where id = $1`, [p.id])).length, 0)
  await assert.rejects(as(A, `insert into post (account_id, via, body, reply_to) values ($1, 'web', 'x', $2)`, [a.id, p.id]), /reply_to not found/)
})

test('oauth_grant は自分の Account にしか紐付けられない', async () => {
  const client = '00000000-0000-0000-0000-0000000000cc'
  await assert.rejects(as(A, `insert into oauth_grant (client_id, account_id) values ($1, $2)`, [client, b.id]))
  await as(A, `insert into oauth_grant (client_id, account_id) values ($1, $2)`, [client, a.id])
  assert.equal((await as(B, `select * from oauth_grant`)).length, 0)
})
