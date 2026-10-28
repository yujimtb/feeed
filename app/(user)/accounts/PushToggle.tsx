'use client'

import { useEffect, useState } from 'react'
import { deletePush, savePush } from '../../actions'

// この端末で、選択中の Account 宛ての Post（メンションと返信）を通知で受け取る
// shortcut: 端末の購読がどの Account に紐付いているかは見ず、購読の有無だけ表示する。Account を切り替えたら「受け取る」で付け替える
export function PushToggle({ vapidKey }: { vapidKey: string }) {
  const [state, setState] = useState<'unsupported' | 'off' | 'on' | 'busy'>('unsupported')

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    navigator.serviceWorker.register('/sw.js')
      .then((r) => r.pushManager.getSubscription())
      .then((s) => setState(s ? 'on' : 'off'))
  }, [])

  if (state === 'unsupported') return null

  const on = async () => {
    setState('busy')
    try {
      const r = await navigator.serviceWorker.ready
      const s = await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKey })
      await savePush(s.toJSON())
      setState('on')
    } catch (e) {
      // 通知を拒否された場合など
      alert(`通知を有効にできませんでした: ${e instanceof Error ? e.message : e}`)
      setState('off')
    }
  }
  const off = async () => {
    setState('busy')
    const s = await (await navigator.serviceWorker.ready).pushManager.getSubscription()
    if (s) await Promise.all([deletePush(s.endpoint), s.unsubscribe()])
    setState('off')
  }

  return (
    <span className="acct-avatar">
      <button type="button" className="linklike" disabled={state === 'busy'} onClick={on}>
        {state === 'on' ? '通知を付け替え' : '通知を受け取る'}
      </button>
      {state === 'on' && (
        <button type="button" className="linklike" onClick={off}>
          通知を止める
        </button>
      )}
    </span>
  )
}
