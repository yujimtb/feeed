import { login } from '../actions'

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams
  return (
    <form action={login}>
      <h1>ログイン</h1>
      {error && <p role="alert">メールアドレスかパスワードが違います。</p>}
      <input type="hidden" name="next" value={next ?? '/accounts'} />
      <label>メールアドレス <input name="email" type="email" autoComplete="username" required /></label>
      <label>パスワード <input name="password" type="password" autoComplete="current-password" required /></label>
      <button>ログイン</button>
    </form>
  )
}
