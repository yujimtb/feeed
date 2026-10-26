import type { Post } from '@/lib/feed'

// 取得した Post を返信関係でツリーにする。親が手元にない返信は起点として表示し、返信先へリンクする
export function Posts({ posts, here }: { posts: Post[]; here?: string }) {
  const ids = new Set(posts.map((p) => p.id))
  const byTime = [...posts].sort((a, b) => a.created_at.localeCompare(b.created_at))
  const children = new Map<string, Post[]>()
  for (const p of byTime) {
    if (p.reply_to && ids.has(p.reply_to)) children.set(p.reply_to, [...(children.get(p.reply_to) ?? []), p])
  }
  const roots = byTime.filter((p) => !p.reply_to || !ids.has(p.reply_to)).reverse()

  const render = (p: Post) => (
    <article key={p.id} id={p.id} className={p.id === here ? 'here' : undefined}>
      <div className="meta">
        <strong>{p.account.name}</strong> [{p.account.kind}] ・{' '}
        <a href={`/p/${p.id}`}><time dateTime={p.created_at}>{p.created_at}</time></a> ・ via {p.via}
        {p.reply_to && !ids.has(p.reply_to) && <> ・ <a href={`/p/${p.reply_to}`}>返信先</a></>}
        {' '}・ <a href={`/p/${p.id}#reply`}>返信</a>
      </div>
      <div className="body">{p.body}</div>
      {children.has(p.id) && <div className="replies">{children.get(p.id)!.map(render)}</div>}
    </article>
  )

  return posts.length ? <>{roots.map(render)}</> : <p>Postはありません。</p>
}
