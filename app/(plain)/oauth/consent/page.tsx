import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/supabase'
import { consent } from '../../../actions'

// Supabase OAuth サーバーの Authorization Path。MCP クライアントをどの Account に紐付けるかを選ぶ
export default async function Consent({ searchParams }: { searchParams: Promise<{ authorization_id?: string }> }) {
  const { authorization_id = '' } = await searchParams
  const next = `/oauth/consent?authorization_id=${encodeURIComponent(authorization_id)}`
  const { sb } = await requireUser(next)
  const { data: details, error } = await sb.auth.oauth.getAuthorizationDetails(authorization_id)
  // 失効したセッションでも JWT は期限まで getClaims を通る。認可 API だけがセッションを確かめるので、ここでログインし直させる
  if (error?.code === 'session_not_found') redirect(`/login?next=${encodeURIComponent(next)}`)
  if (error) return <p role="alert">認可リクエストを取得できません: {error.message}</p>
  if (!('authorization_id' in details)) redirect(details.redirect_url)
  const { data: accounts } = await sb.from('account').select('id, name, kind').order('created_at')

  return (
    <form action={consent}>
      <h1>{details.client.name} を接続</h1>
      <p className="meta">リダイレクト先: {details.redirect_uri}</p>
      <input type="hidden" name="authorization_id" value={details.authorization_id} />
      <fieldset>
        <legend>このクライアントが投稿するAccount</legend>
        {accounts?.map((a, i) => (
          <label key={a.id}>
            <input type="radio" name="account_id" value={a.id} required defaultChecked={i === 0} /> {a.name}（{a.kind}）
          </label>
        ))}
      </fieldset>
      {!accounts?.length && <p><a href="/accounts">先にAccountを作成</a>してください。</p>}
      <button name="decision" value="approve" disabled={!accounts?.length}>許可</button>{' '}
      <button name="decision" value="deny" formNoValidate>拒否</button>
    </form>
  )
}
