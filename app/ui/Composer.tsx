'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Avatar, type Viewer } from './Avatar'

const MAX = 10_000
const RING_C = 2 * Math.PI * 10
const canFieldSize = typeof CSS !== 'undefined' && CSS.supports('field-sizing', 'content')

export function Composer({
  viewer,
  placeholder = 'いまどうしてる？',
  submitLabel = 'ポストする',
  action,
  onSubmit,
  hidden,
  autoFocus,
  collapsed,
}: {
  viewer: NonNullable<Viewer>
  placeholder?: string
  submitLabel?: string
  action?: (fd: FormData) => void | Promise<void>
  onSubmit?: (body: string) => void
  hidden?: Record<string, string>
  autoFocus?: boolean
  collapsed?: boolean
}) {
  const [body, setBody] = useState('')
  const ta = useRef<HTMLTextAreaElement>(null)

  const remaining = MAX - body.length
  const over = remaining < 0
  const canSend = body.trim().length > 0 && !over

  // field-sizing 非対応ブラウザ向けフォールバック（対応済みならCSS任せ）
  useEffect(() => {
    const el = ta.current
    if (!el || canFieldSize) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [body])

  const submit = (e: FormEvent<HTMLFormElement>) => {
    if (!canSend) {
      e.preventDefault()
      return
    }
    if (onSubmit) {
      e.preventDefault()
      onSubmit(body)
      setBody('')
    } else if (action) {
      // form action に任せる（preventDefault しない）。入力は即座に戻す
      setBody('')
    } else {
      e.preventDefault()
    }
  }

  return (
    <form
      className={`composer${body ? ' has-body' : ''}`}
      data-collapsed={collapsed || undefined}
      action={action}
      onSubmit={submit}
    >
      <Avatar name={viewer.name} kind={viewer.kind} src={viewer.avatar_url} />
      <div className="c-main">
        {hidden &&
          Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        <textarea
          ref={ta}
          name="body"
          required
          maxLength={MAX}
          placeholder={placeholder}
          autoFocus={autoFocus}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') e.currentTarget.form?.requestSubmit()
          }}
          aria-label={placeholder}
        />
        <div className="c-tools">
          <div className="c-tools-in">
            <span className="c-as">{viewer.name} として投稿</span>
            <svg className={`ring${over ? ' over' : ''}`} width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="track" cx="12" cy="12" r="10" fill="none" strokeWidth="2" />
              <circle
                className="prog"
                cx="12"
                cy="12"
                r="10"
                fill="none"
                strokeWidth="2"
                strokeDasharray={RING_C}
                strokeDashoffset={RING_C * (1 - Math.min(1, body.length / MAX))}
                transform="rotate(-90 12 12)"
              />
            </svg>
            {remaining < 1000 && (
              <span className={`ring-num${over ? ' over' : ''}`}>{remaining}</span>
            )}
            <button className="btn" type="submit" disabled={!canSend}>
              {submitLabel}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}
