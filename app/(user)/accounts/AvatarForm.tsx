'use client'

import { useEffect, useRef, useState } from 'react'
import { setAvatar } from '../../actions'

// JSあり: 「画像を変更」が隠し file input を開き、選択で即送信する。
// JSなし: file input と送信ボタンがそのまま出る
export function AvatarForm({ accountId, hasAvatar }: { accountId: string; hasAvatar: boolean }) {
  const [js, setJs] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  useEffect(() => setJs(true), [])

  return (
    <form ref={formRef} action={setAvatar} className="acct-avatar">
      <input type="hidden" name="account_id" value={accountId} />
      <input
        ref={fileRef}
        type="file"
        name="avatar"
        accept="image/*"
        className={js ? 'vh' : undefined}
        onChange={() => formRef.current?.requestSubmit()}
      />
      {js ? (
        <button type="button" className="linklike" onClick={() => fileRef.current?.click()}>
          画像を変更
        </button>
      ) : (
        <button type="submit" className="linklike">
          画像を変更
        </button>
      )}
      {hasAvatar && (
        <button type="submit" className="linklike">
          外す
        </button>
      )}
      <details className="acct-url">
        <summary>URLで指定</summary>
        <input name="avatar_url" type="url" placeholder="https://…" />
        <button className="btn" type="submit">
          設定
        </button>
      </details>
    </form>
  )
}
