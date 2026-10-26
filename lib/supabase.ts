import { createServerClient } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export const SUPABASE_URL = process.env.SUPABASE_URL!
export const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!

export function cookieClient(store: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        // Server Component からは書けない。更新は proxy.ts が担う
        try { list.forEach(({ name, value, options }) => store.set(name, value, options)) } catch {}
      },
    },
  })
}

// MCP 用: OAuth で発行されたアクセストークンでそのまま RLS を通す
export function tokenClient(token: string) {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// ログイン済みでなければ /login へ。戻り先は next
export async function requireUser(next: string) {
  const store = await cookies()
  const sb = cookieClient(store)
  const { data } = await sb.auth.getClaims()
  if (!data) redirect(`/login?next=${encodeURIComponent(next)}`)
  return { sb, store, userId: data.claims.sub }
}

export type DB = SupabaseClient

// Web UI で選択中の Account。値は自分の Account か RLS で確かめてから使う
export const ACCOUNT_COOKIE = 'account'

export async function currentAccount(sb: DB, store: Awaited<ReturnType<typeof cookies>>) {
  const id = store.get(ACCOUNT_COOKIE)?.value
  if (!id) return null
  const { data } = await sb
    .from('account')
    .select('id, name, kind, avatar_url')
    .eq('id', id)
    .maybeSingle()
  return data as { id: string; name: string; kind: 'human' | 'agent' | 'source'; avatar_url: string | null } | null
}
