import type { ReactNode } from 'react'
import type { Post } from '@/lib/feed'
import type { Viewer } from './Avatar'
import { PostRow } from './PostRow'

// 祖先チェーン → フォーカス投稿 → コンポーザー → 返信（直接返信ごとに子孫を縦線つきで直下に続ける）
// 接続線は各返信グループ内で閉じる（Xの会話表示）。兄弟グループ同士・フォーカス投稿とはつなげない
export function Thread({
  posts,
  focusId,
  base,
  composer,
  fresh,
}: {
  posts: Post[]
  focusId: string
  base: string
  viewer?: Viewer
  composer: ReactNode
  fresh?: Set<string>
}) {
  const byId = new Map(posts.map((p) => [p.id, p]))
  const focus = byId.get(focusId)
  if (!focus) return null
  const replies = new Map<string, number>()
  for (const p of posts) {
    if (p.reply_to) replies.set(p.reply_to, (replies.get(p.reply_to) ?? 0) + 1)
  }
  const kids = (id: string) =>
    posts.filter((p) => p.reply_to === id).sort((a, b) => a.created_at.localeCompare(b.created_at))

  const ancestors: Post[] = []
  for (let cur = focus; cur.reply_to && byId.has(cur.reply_to); ) {
    cur = byId.get(cur.reply_to)!
    ancestors.unshift(cur)
  }

  // 直接返信ごとのサブツリーを深さ優先で平坦化する
  const groups = kids(focusId).map((d) => {
    const list: Post[] = []
    const walk = (n: Post) => {
      list.push(n)
      kids(n.id).forEach(walk)
    }
    walk(d)
    return list
  })

  let i = 0
  return (
    <div className="thread">
      {ancestors.map((p, j) => (
        <PostRow
          key={p.id}
          post={p}
          base={base}
          replyCount={replies.get(p.id) ?? 0}
          index={i++}
          line={j === 0 ? 'below' : 'both'}
          hideReplyTo
        />
      ))}
      <PostRow
        post={focus}
        focused
        base={base}
        replyCount={replies.get(focus.id) ?? 0}
        index={i++}
        line={ancestors.length ? 'above' : undefined}
      />
      <div className="thread-composer">{composer}</div>
      {groups.map((g) =>
        g.map((p, j) => {
          const line =
            g.length === 1 ? undefined : j === 0 ? 'below' : j === g.length - 1 ? 'above' : 'both'
          return (
            <PostRow
              key={p.id}
              post={p}
              base={base}
              replyCount={replies.get(p.id) ?? 0}
              index={i++}
              line={line}
              fresh={fresh?.has(p.id)}
              hideReplyTo
            />
          )
        }),
      )}
    </div>
  )
}
