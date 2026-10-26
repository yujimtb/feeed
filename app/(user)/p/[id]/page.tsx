import { notFound } from 'next/navigation'
import { getPost, readFeed } from '@/lib/feed'
import { currentAccount, requireUser } from '@/lib/supabase'
import { ThreadView } from '../../ThreadView'

export default async function Permalink({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { sb, store } = await requireUser(`/p/${id}`)
  const target = await getPost(sb, id)
  if (!target) notFound()
  const [account, thread] = await Promise.all([
    currentAccount(sb, store),
    readFeed(sb, { thread: target.root_id ?? target.id }),
  ])
  return <ThreadView posts={thread} focusId={id} viewer={account} />
}
