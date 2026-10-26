import { notFound } from 'next/navigation'
import { getPost, readFeed } from '@/lib/feed'
import { currentAccount, requireUser } from '@/lib/supabase'
import { post } from '../../actions'
import { Header } from '../../Header'
import { Posts } from '../../Posts'

export default async function Permalink({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { sb, store } = await requireUser(`/p/${id}`)
  const target = await getPost(sb, id)
  if (!target) notFound()
  const [account, thread] = await Promise.all([
    currentAccount(sb, store),
    readFeed(sb, { thread: target.root_id ?? target.id }),
  ])

  return (
    <>
      <Header account={account} />
      <Posts posts={thread} here={id} />
      <h2 id="reply">返信</h2>
      {account ? (
        <form action={post}>
          <input type="hidden" name="reply_to" value={id} />
          <textarea name="body" required aria-label="返信本文" />
          <button>{account.name} として返信</button>
        </form>
      ) : (
        <p><a href="/accounts">Accountを選択</a>すると返信できます。</p>
      )}
    </>
  )
}
