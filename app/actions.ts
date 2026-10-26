'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createPost, isUuid } from '@/lib/feed'
import { ACCOUNT_COOKIE, cookieClient, requireUser } from '@/lib/supabase'

// オープンリダイレクトを防ぐため、同一オリジンのパスだけ許す
const safeNext = (v: FormDataEntryValue | null) =>
  typeof v === 'string' && v.startsWith('/') && !v.startsWith('//') ? v : '/accounts'

export async function login(form: FormData) {
  const next = safeNext(form.get('next'))
  const sb = cookieClient(await cookies())
  const { error } = await sb.auth.signInWithPassword({
    email: String(form.get('email')),
    password: String(form.get('password')),
  })
  if (error) redirect(`/login?error=1&next=${encodeURIComponent(next)}`)
  redirect(next)
}

export async function logout() {
  const store = await cookies()
  await cookieClient(store).auth.signOut()
  store.delete(ACCOUNT_COOKIE)
  redirect('/login')
}

export async function createAccount(form: FormData) {
  const { sb } = await requireUser('/accounts')
  const name = String(form.get('name') ?? '').trim()
  const kind = String(form.get('kind'))
  const { error } = await sb.from('account').insert({ name, kind })
  if (error) throw new Error(error.message)
  redirect('/accounts')
}

export async function selectAccount(form: FormData) {
  const { sb, store } = await requireUser('/accounts')
  const id = form.get('account_id')
  // RLS により自分の Account しか見つからない
  const { data } = isUuid(id) ? await sb.from('account').select('id').eq('id', id).maybeSingle() : { data: null }
  if (!data) throw new Error('account not found')
  store.set(ACCOUNT_COOKIE, data.id, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 400,
  })
  redirect('/')
}

export async function post(form: FormData) {
  const { sb, store } = await requireUser('/')
  const account_id = store.get(ACCOUNT_COOKIE)?.value
  if (!account_id) redirect('/accounts')
  const reply_to = form.get('reply_to')
  const id = await createPost(sb, {
    account_id, via: 'web', body: String(form.get('body') ?? ''),
    reply_to: isUuid(reply_to) ? reply_to : undefined,
  })
  redirect(`/p/${id}`)
}

export async function consent(form: FormData) {
  const authorizationId = String(form.get('authorization_id'))
  const { sb, userId } = await requireUser(`/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`)
  if (form.get('decision') !== 'approve') {
    const { data, error } = await sb.auth.oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true })
    if (error) throw new Error(error.message)
    redirect(data.redirect_url)
  }
  const { data: details, error: e1 } = await sb.auth.oauth.getAuthorizationDetails(authorizationId)
  if (e1) throw new Error(e1.message)
  if (!('authorization_id' in details)) redirect(details.redirect_url)
  // grant を先に保存する。RLS により自分の Account にしか紐付けられない
  const { error: e2 } = await sb.from('oauth_grant')
    .upsert({ user_id: userId, client_id: details.client.id, account_id: String(form.get('account_id')) })
  if (e2) throw new Error(e2.message)
  const { data, error } = await sb.auth.oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true })
  if (error) throw new Error(error.message)
  redirect(data.redirect_url)
}
