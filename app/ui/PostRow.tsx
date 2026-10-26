import type { CSSProperties } from 'react'
import type { Post } from '@/lib/feed'
import { Avatar, KindBadge } from './Avatar'
import { Reply } from './icons'
import { AbsTime, RelTime } from './RelTime'

// 行全体をパーマリンクにする stretched link: .stamp::after が article 全面を覆う。
// 他のリンク/ボタンは z-index:1 で上に出す（JS不使用）
export function PostRow({
  post,
  base,
  parent,
  replyCount = 0,
  index = 0,
  focused,
  line,
  fresh,
  hideReplyTo,
}: {
  post: Post
  base: string
  parent?: Post | null
  replyCount?: number
  index?: number
  focused?: boolean
  line?: 'above' | 'below' | 'both'
  fresh?: boolean
  hideReplyTo?: boolean
}) {
  const href = `${base}/p/${post.id}`
  const style = { '--i': index, viewTransitionName: `post-${post.id}` } as CSSProperties
  const cls = `post${focused ? ' focused' : ''}${fresh ? ' fresh' : ''}`
  const lines = (
    <>
      {(line === 'above' || line === 'both') && <i className="vl up" aria-hidden="true" />}
      {(line === 'below' || line === 'both') && <i className="vl down" aria-hidden="true" />}
    </>
  )
  const acts = (
    <div className="post-acts">
      <a className="act" href={href} aria-label="返信">
        <span className="ic">
          <Reply size={focused ? 20 : 17} />
        </span>
        {replyCount > 0 && <span>{replyCount}</span>}
      </a>
    </div>
  )

  if (focused) {
    return (
      <article className={cls} style={style}>
        {lines}
        <div className="f-head">
          <Avatar name={post.account.name} kind={post.account.kind} src={post.account.avatar_url} />
          <span className="f-id">
            <span className="name">{post.account.name}</span>
            <KindBadge kind={post.account.kind} />
          </span>
        </div>
        <div className="post-body">{post.body}</div>
        <div className="focus-meta">
          <AbsTime iso={post.created_at} /> · via {post.via}
        </div>
        {acts}
      </article>
    )
  }

  return (
    <article className={cls} style={style}>
      {lines}
      <div className="post-avatar">
        <Avatar name={post.account.name} kind={post.account.kind} src={post.account.avatar_url} />
      </div>
      <div className="post-main">
        {post.reply_to && !hideReplyTo && (
          <div className="reply-to">
            {parent ? (
              <>
                返信先: <a href={`${base}/p/${parent.id}`}>{parent.account.name}</a>
              </>
            ) : (
              <a href={`${base}/p/${post.reply_to}`}>返信先のポスト</a>
            )}
          </div>
        )}
        <div className="post-head">
          <span className="name">{post.account.name}</span>
          <KindBadge kind={post.account.kind} />
          <span className="dot" aria-hidden="true">
            ·
          </span>
          <a className="stamp" href={href}>
            <RelTime iso={post.created_at} />
          </a>
        </div>
        <div className="post-body">{post.body}</div>
        {acts}
      </div>
    </article>
  )
}
