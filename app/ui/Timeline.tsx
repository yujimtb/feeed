import type { Post } from '@/lib/feed'
import type { Viewer } from './Avatar'
import { PostRow } from './PostRow'

// grouped: グループは「スレッド内の最新 created_at」降順。直接返信は新しい2件を古い順に表示
// （返信の返信は数だけ数える）。親が手元に無い返信はルート扱いで「返信先のポスト」リンクを出す
export function Timeline({
  posts,
  base,
  fresh,
}: {
  posts: Post[]
  base: string
  viewer?: Viewer
  fresh?: Set<string>
}) {
  const byId = new Map(posts.map((p) => [p.id, p]))
  const replies = new Map<string, number>()
  for (const p of posts) {
    if (p.reply_to) replies.set(p.reply_to, (replies.get(p.reply_to) ?? 0) + 1)
  }
  const sorted = [...posts].sort((a, b) => b.created_at.localeCompare(a.created_at))
  let i = 0

  const roots = sorted.filter((p) => !p.reply_to || !byId.has(p.reply_to))
  const kids = (id: string) =>
    posts.filter((p) => p.reply_to === id).sort((a, b) => a.created_at.localeCompare(b.created_at))
  const descendants = (id: string) => {
    const list: Post[] = []
    const walk = (x: Post) => {
      for (const k of kids(x.id)) {
        list.push(k)
        walk(k)
      }
    }
    walk(byId.get(id)!)
    return list
  }
  const latest = (r: Post, desc: Post[]) =>
    desc.reduce((m, x) => (x.created_at > m ? x.created_at : m), r.created_at)
  const groups = roots
    .map((r) => ({ r, desc: descendants(r.id) }))
    .sort((a, b) => latest(b.r, b.desc).localeCompare(latest(a.r, a.desc)))

  return (
    <div className="timeline grouped">
      {groups.map(({ r, desc }) => {
        const shown = kids(r.id).slice(-2)
        const total = desc.length
        const more = total > 2
        return (
          <div className="tgroup" key={r.id}>
            <PostRow
              post={r}
              base={base}
              replyCount={replies.get(r.id) ?? 0}
              index={i++}
              line={shown.length ? 'below' : undefined}
              fresh={fresh?.has(r.id)}
            />
            {shown.map((k, j) => (
              <PostRow
                key={k.id}
                post={k}
                base={base}
                replyCount={replies.get(k.id) ?? 0}
                index={i++}
                line={j < shown.length - 1 || more ? 'both' : 'above'}
                fresh={fresh?.has(k.id)}
                hideReplyTo
              />
            ))}
            {more && (
              <a className="show-all" href={`${base}/p/${r.id}`}>
                返信をすべて表示（{total}件）
              </a>
            )}
          </div>
        )
      })}
    </div>
  )
}
