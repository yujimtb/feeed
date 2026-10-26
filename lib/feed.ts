import type { DB } from './supabase'

export type Post = {
  id: string
  body: string
  via: 'web' | 'mcp'
  reply_to: string | null
  root_id: string | null
  created_at: string
  account: { name: string; kind: 'human' | 'agent' | 'source' }
}

export const LIMIT = 100
const COLS = 'id, body, via, reply_to, root_id, created_at, account(name, kind)'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const isUuid = (s: unknown): s is string => typeof s === 'string' && UUID.test(s)

// since あり: 古い順に LIMIT 件（最後の created_at を次の since にすれば取りこぼさない）
// since なし: 新しい順に LIMIT 件
// thread: そのスレッド（root とその返信すべて）に絞る
export async function readFeed(sb: DB, opts: { since?: string; thread?: string } = {}) {
  let q = sb.from('post').select(COLS).order('created_at', { ascending: !!opts.since }).limit(LIMIT)
  if (opts.since) q = q.gt('created_at', opts.since)
  if (opts.thread) {
    if (!isUuid(opts.thread)) throw new Error('thread must be a uuid')
    q = q.or(`id.eq.${opts.thread},root_id.eq.${opts.thread}`)
  }
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data as unknown as Post[]
}

export async function getPost(sb: DB, id: string) {
  if (!isUuid(id)) return null
  const { data } = await sb.from('post').select(COLS).eq('id', id).maybeSingle()
  return data as unknown as Post | null
}

// account_id と via は呼び出し側（サーバー）が決める。クライアント入力から受け取らないこと
export async function createPost(sb: DB, p: { account_id: string; via: 'web' | 'mcp'; body: string; reply_to?: string }) {
  const body = p.body.trim()
  if (!body) throw new Error('body is empty')
  const { data, error } = await sb.from('post')
    .insert({ account_id: p.account_id, via: p.via, body, reply_to: p.reply_to ?? null })
    .select('id').single()
  if (error) throw new Error(error.message)
  return data.id as string
}
