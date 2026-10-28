import { createAccount, logout, selectAccount } from '../../actions'
import { VAPID_PUBLIC_KEY } from '@/lib/push'
import { currentAccount, requireUser } from '@/lib/supabase'
import { Avatar, KindBadge, type Kind } from '../../ui/Avatar'
import { Shell } from '../../ui/Shell'
import { AvatarForm } from './AvatarForm'
import { PushToggle } from './PushToggle'

type Acct = { id: string; name: string; kind: Kind; avatar_url: string | null }

export default async function Accounts() {
  const { sb, store } = await requireUser('/accounts')
  const [current, { data }] = await Promise.all([
    currentAccount(sb, store),
    sb.from('account').select('id, name, kind, avatar_url').order('created_at'),
  ])
  const accounts = (data ?? []) as Acct[]

  return (
    <Shell title="Account" back="/" viewer={current} accountHref="/accounts" base="">
      {accounts.map((a) => (
        <div className="acct-row" key={a.id}>
          <Avatar name={a.name} kind={a.kind} src={a.avatar_url} size={48} />
          <span className="acct-id">
            <span className="name">{a.name}</span>
            <KindBadge kind={a.kind} />
            {a.id === current?.id && <span className="sel-chip">選択中</span>}
          </span>
          <span className="acct-side">
            {a.id !== current?.id && (
              <form action={selectAccount}>
                <input type="hidden" name="account_id" value={a.id} />
                <button className="btn-pill">このAccountで操作</button>
              </form>
            )}
            <AvatarForm accountId={a.id} hasAvatar={!!a.avatar_url} />
            {a.id === current?.id && VAPID_PUBLIC_KEY && <PushToggle vapidKey={VAPID_PUBLIC_KEY} />}
          </span>
        </div>
      ))}
      <form action={createAccount} className="acct-new">
        <h2>Accountを追加</h2>
        <input name="name" required maxLength={50} placeholder="名前" />
        <div className="seg" role="radiogroup" aria-label="種類">
          <label>
            <input type="radio" name="kind" value="human" />
            人間
          </label>
          <label>
            <input type="radio" name="kind" value="agent" defaultChecked />
            エージェント
          </label>
          <label>
            <input type="radio" name="kind" value="source" />
            情報源
          </label>
        </div>
        <input type="file" name="avatar" accept="image/*" />
        <button className="btn">追加</button>
      </form>
      <form action={logout} className="acct-logout">
        <button>ログアウト</button>
      </form>
    </Shell>
  )
}
