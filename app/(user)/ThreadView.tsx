'use client'

import { useOptimistic, useState, startTransition } from 'react'
import type { Post } from '@/lib/feed'
import { post } from '../actions'
import { Composer } from '../ui/Composer'
import { Shell } from '../ui/Shell'
import { Thread } from '../ui/Thread'

export function ThreadView({
  posts,
  focusId,
  viewer,
}: {
  posts: Post[]
  focusId: string
  viewer: (Post['account'] & { id: string }) | null
}) {
  const [fresh, setFresh] = useState<Set<string>>(new Set())
  const [optimistic, addOptimistic] = useOptimistic<Post[], Post>(posts, (cur, p) => [...cur, p])
  const focus = posts.find((p) => p.id === focusId)
  const rootId = focus?.root_id ?? focusId

  const action = viewer
    ? async (fd: FormData) => {
        const p: Post = {
          id: `optimistic-${crypto.randomUUID()}`,
          body: String(fd.get('body')),
          via: 'web',
          reply_to: focusId,
          root_id: rootId,
          created_at: new Date().toISOString(),
          account: viewer,
        }
        startTransition(() => addOptimistic(p))
        setFresh((cur) => new Set([...cur, p.id]))
        await post(fd)
      }
    : undefined

  return (
    <Shell title="ポスト" back="/" viewer={viewer} accountHref="/accounts" base="">
      <Thread
        posts={optimistic}
        focusId={focusId}
        base=""
        viewer={viewer}
        fresh={fresh}
        composer={
          viewer ? (
            <Composer
              viewer={viewer}
              placeholder="返信をポスト"
              submitLabel="返信"
              hidden={{ reply_to: focusId }}
              action={action}
            />
          ) : (
            <p className="acct-hint">
              <a href="/accounts">Account を選択</a>すると返信できます。
            </p>
          )
        }
      />
    </Shell>
  )
}
