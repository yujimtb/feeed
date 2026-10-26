'use client'

import { useEffect, useMemo, useOptimistic, useState, startTransition } from 'react'
import type { Post } from '@/lib/feed'
import { pollFeed, post } from '../actions'
import { Composer } from '../ui/Composer'
import { NewPostsPill } from '../ui/NewPostsPill'
import { Shell } from '../ui/Shell'
import { Timeline } from '../ui/Timeline'
import type { Viewer } from '../ui/Avatar'

const dedupeById = (ps: Post[]) => {
  const seen = new Set<string>()
  return ps.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
}

export function Feed({
  posts,
  viewer,
}: {
  posts: Post[]
  viewer: (Post['account'] & { id: string }) | null
}) {
  const [extra, setExtra] = useState<Post[]>([])
  const [pending, setPending] = useState<Post[]>([])
  const [fresh, setFresh] = useState<Set<string>>(new Set())
  const merged = useMemo(() => dedupeById([...extra, ...posts]), [extra, posts])
  const [optimistic, addOptimistic] = useOptimistic<Post[], Post>(merged, (cur, p) => [p, ...cur])

  // サーバー側に取り込まれた分は extra から落とす
  useEffect(() => {
    const ids = new Set(posts.map((p) => p.id))
    setExtra((cur) => {
      const kept = cur.filter((p) => !ids.has(p.id))
      return kept.length === cur.length ? cur : kept
    })
  }, [posts])

  // 20秒ごと + タブ復帰時に差分を取る。手元に無いものはピルで知らせる
  useEffect(() => {
    let stopped = false
    const poll = async () => {
      const since = merged.reduce((m, p) => (p.created_at > m ? p.created_at : m), '')
      if (!since) return
      const next = await pollFeed(since)
      if (stopped) return
      setPending((cur) => {
        const known = new Set([...merged.map((p) => p.id), ...cur.map((p) => p.id)])
        const add = next.filter((p) => !known.has(p.id))
        return add.length ? [...cur, ...add] : cur
      })
    }
    const t = setInterval(poll, 20_000)
    const onVis = () => {
      if (document.visibilityState === 'visible') poll()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      stopped = true
      clearInterval(t)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [merged])

  const showPending = () => {
    setFresh((cur) => new Set([...cur, ...pending.map((p) => p.id)]))
    setExtra((cur) => dedupeById([...pending, ...cur]))
    setPending([])
  }

  const action = viewer
    ? async (fd: FormData) => {
        const p: Post = {
          id: `optimistic-${crypto.randomUUID()}`,
          body: String(fd.get('body')),
          via: 'web',
          reply_to: null,
          root_id: null,
          created_at: new Date().toISOString(),
          account: viewer,
        }
        startTransition(() => addOptimistic(p))
        setFresh((cur) => new Set([...cur, p.id]))
        await post(fd)
      }
    : undefined

  return (
    <Shell title="ホーム" viewer={viewer} accountHref="/accounts" base="">
      {viewer ? (
        <Composer viewer={viewer} collapsed action={action} />
      ) : (
        <p className="acct-hint">
          <a href="/accounts">Account を選択</a>すると投稿できます。
        </p>
      )}
      <NewPostsPill count={pending.length} onClick={showPending} />
      <Timeline posts={optimistic} base="" fresh={fresh} />
    </Shell>
  )
}
