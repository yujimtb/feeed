import { logout } from '../actions'

export function Header({ account }: { account: { name: string; kind: string } | null }) {
  return (
    <header>
      <a href="/plain">フィード</a>
      <a href="/accounts">{account ? `Account: ${account.name}（${account.kind}）` : 'Accountを選択'}</a>
      <form action={logout}><button>ログアウト</button></form>
    </header>
  )
}
