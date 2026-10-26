import { readFeed } from '@/lib/feed'
import { currentAccount, requireUser } from '@/lib/supabase'
import { post } from '../../actions'
import { Header } from '../Header'
import { Posts } from '../Posts'

export default async function Feed({ searchParams }: { searchParams: Promise<{ since?: string }> }) {
  const { since } = await searchParams
  const { sb, store } = await requireUser(since ? `/plain?since=${encodeURIComponent(since)}` : '/plain')
  const [account, posts] = await Promise.all([currentAccount(sb, store), readFeed(sb, { since })])
  const latest = posts.reduce((max, p) => (p.created_at > max ? p.created_at : max), since ?? '')

  return (
    <>
      <Header account={account} />
      {account ? (
        <form action={async (fd: FormData) => {
          'use server'
          await post(fd)
        }}>
          <input type="hidden" name="plain" value="1" />
          <textarea name="body" required aria-label="本文" />
          <button>{account.name} として投稿</button>
        </form>
      ) : (
        <p><a href="/accounts">Accountを選択</a>すると投稿できます。</p>
      )}
      <p className="meta">
        {since ? `${since} より後のPost（古い順に最大100件）` : '最新のPost（最大100件）'}
        {latest && <> ・ <a href={`/plain?since=${encodeURIComponent(latest)}`}>これ以降の差分</a></>}
      </p>
      <Posts posts={posts} />
    </>
  )
}
