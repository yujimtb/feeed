import { after } from 'next/server'
import webpush from 'web-push'
import { addressedTo, getPost } from './feed'
import type { DB } from './supabase'

export const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? null
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
// Apple の Push サービスは subject に到達可能な https か mailto を要求する
const SUBJECT = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL ?? 'localhost'}`

type Sub = { endpoint: string; keys: { p256dh: string; auth: string }; account: { id: string; name: string } }

// 新しい Post が宛てた Account を購読している端末へ Web Push を送る。投稿の応答は待たせない
export function pushAfterPost(sb: DB, postId: string) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return
  const vapidDetails = { subject: SUBJECT, publicKey: VAPID_PUBLIC_KEY, privateKey: VAPID_PRIVATE_KEY }
  after(async () => {
    const { data } = await sb.from('push_subscription').select('endpoint, keys, account(id, name)')
    const subs = (data ?? []) as unknown as Sub[]
    const post = subs.length ? await getPost(sb, postId) : null
    if (!post) return
    const targets = new Set<string>()
    for (const a of new Map(subs.map((s) => [s.account.id, s.account])).values()) {
      if ((await addressedTo(sb, a, [post])).length) targets.add(a.id)
    }
    const payload = JSON.stringify({ title: post.account.name, body: post.body.slice(0, 200), url: `/p/${post.root_id ?? post.id}` })
    await Promise.all(subs.filter((s) => targets.has(s.account.id)).map((s) =>
      webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload, { vapidDetails }).catch(async (e) => {
        // 購読が切れた端末は消す
        if (e.statusCode === 404 || e.statusCode === 410) await sb.from('push_subscription').delete().eq('endpoint', s.endpoint)
        else console.error('push failed', e.statusCode, e.body)
      })))
  })
}
