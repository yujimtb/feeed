import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { addressedTo, type Post } from '../lib/feed.ts'

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
await db.exec(readFileSync(new URL('../supabase/migrations/20261027000000_avatar.sql', import.meta.url), 'utf8'))
await db.exec(readFileSync(new URL('../supabase/migrations/20261028000000_push.sql', import.meta.url), 'utf8'))
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

test('avatar_url は自分の Account だけ更新できる', async () => {
  await as(A, `update account set avatar_url = 'https://example.com/a.png' where id = $1`, [a.id])
  assert.equal((await as<{ avatar_url: string }>(A, `select avatar_url from account where id = $1`, [a.id]))[0].avatar_url, 'https://example.com/a.png')
  await as(A, `update account set avatar_url = 'https://example.com/x.png' where id = $1`, [b.id])
  assert.equal((await as<{ avatar_url: string | null }>(B, `select avatar_url from account where id = $1`, [b.id]))[0].avatar_url, null)
})

test('oauth_grant は自分の Account にしか紐付けられない', async () => {
  const client = '00000000-0000-0000-0000-0000000000cc'
  await assert.rejects(as(A, `insert into oauth_grant (client_id, account_id) values ($1, $2)`, [client, b.id]))
  await as(A, `insert into oauth_grant (client_id, account_id) values ($1, $2)`, [client, a.id])
  assert.equal((await as(B, `select * from oauth_grant`)).length, 0)
})

test('push_subscription は自分の Account にしか紐付けられず、他ユーザーからは見えない', async () => {
  const keys = '{"p256dh":"x","auth":"y"}'
  await assert.rejects(as(A, `insert into push_subscription (endpoint, account_id, keys) values ('https://push.example/1', $1, $2)`, [b.id, keys]))
  await assert.rejects(as(A, `insert into push_subscription (endpoint, account_id, keys) values ('http://push.example/1', $1, $2)`, [a.id, keys]))
  await as(A, `insert into push_subscription (endpoint, account_id, keys) values ('https://push.example/1', $1, $2)`, [a.id, keys])
  assert.equal((await as(B, `select * from push_subscription`)).length, 0)
})

test('addressedTo はメンションと自分の Post への返信を拾い、自分の投稿は除く', async () => {
  const p = (id: string, name: string, body: string, reply_to: string | null = null) =>
    ({ id, body, reply_to, account: { name } }) as Post
  // 自分（me）の Post は m1 だけという想定の最小スタブ
  const sb = { from: () => ({ select: () => ({ eq: () => ({ in: async () => ({ data: [{ id: 'm1' }], error: null }) }) }) }) }
  const hits = await addressedTo(sb as never, { id: a.id, name: 'Me' }, [
    p('1', 'Muse', 'hi @me'),
    p('2', 'Muse', 're', 'm1'),
    p('3', 'Muse', 're', 'x1'),
    p('4', 'Me', 'note to @me'),
    p('5', 'Dots', 'plain'),
  ])
  assert.deepEqual(hits.map((h) => h.id), ['1', '2'])
})
