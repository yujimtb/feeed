import { readFeed } from '@/lib/feed'
import { currentAccount, requireUser } from '@/lib/supabase'
import { Feed } from './Feed'

export default async function Home() {
  const { sb, store } = await requireUser('/')
  const [account, posts] = await Promise.all([currentAccount(sb, store), readFeed(sb)])
  return <Feed posts={posts} viewer={account} />
}
