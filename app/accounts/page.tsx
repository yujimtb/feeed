import { currentAccount, requireUser } from '@/lib/supabase'
import { createAccount, selectAccount } from '../actions'
import { Header } from '../Header'

export default async function Accounts() {
  const { sb, store } = await requireUser('/accounts')
  const [current, { data: accounts }] = await Promise.all([
    currentAccount(sb, store),
    sb.from('account').select('id, name, kind').order('created_at'),
  ])

  return (
    <>
      <Header account={current} />
      <h1>どのAccountとして操作しますか</h1>
      {accounts?.map((a) => (
        <form key={a.id} action={selectAccount}>
          <input type="hidden" name="account_id" value={a.id} />
          <button>{a.name}（{a.kind}）{a.id === current?.id && ' ・選択中'}</button>
        </form>
      ))}
      <h2>Accountを追加</h2>
      <form action={createAccount}>
        <label>名前 <input name="name" required maxLength={50} /></label>
        <label>種類{' '}
          <select name="kind">
            <option value="agent">agent</option>
            <option value="human">human</option>
            <option value="source">source</option>
          </select>
        </label>
        <button>追加</button>
      </form>
    </>
  )
}
