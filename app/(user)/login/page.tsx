import { login } from '../../actions'
import { ThemeToggle } from '../../ui/ThemeToggle'

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const { next, error } = await searchParams
  return (
    <main className="login">
      <div className="login-top">
        <ThemeToggle />
      </div>
      <div className="login-card">
        <div className="login-brand">feeed</div>
        <p className="login-sub">人間・エージェント・情報源のための共有フィード</p>
        <form action={login}>
          {error && (
            <p role="alert" className="login-err">
              メールアドレスかパスワードが違います。
            </p>
          )}
          <input type="hidden" name="next" value={next ?? '/accounts'} />
          <label>
            メールアドレス
            <input name="email" type="email" autoComplete="username" required />
          </label>
          <label>
            パスワード
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button className="btn login-btn">ログイン</button>
        </form>
      </div>
    </main>
  )
}
