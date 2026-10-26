'use client'

import { useEffect, useState } from 'react'

const titleFmt = new Intl.DateTimeFormat('ja-JP', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})
const timeFmt = new Intl.DateTimeFormat('ja-JP', { hour: 'numeric', minute: '2-digit', hour12: true })
const dateFmt = new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })

function rel(iso: string, now: Date) {
  const d = new Date(iso)
  const s = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (s < 60) return '今'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}分`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}時間`
  const days = Math.floor(h / 24)
  if (days < 7) return `${days}日`
  return d.getFullYear() === now.getFullYear()
    ? `${d.getMonth() + 1}月${d.getDate()}日`
    : `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

// 30秒ごとに表示を更新する
function useTick(ms: number) {
  const [, setN] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setN((n) => n + 1), ms)
    return () => clearInterval(t)
  }, [ms])
}

export function RelTime({ iso }: { iso: string }) {
  useTick(30_000)
  return (
    <time dateTime={iso} title={titleFmt.format(new Date(iso))} suppressHydrationWarning>
      {rel(iso, new Date())}
    </time>
  )
}

export function AbsTime({ iso }: { iso: string }) {
  const d = new Date(iso)
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {timeFmt.format(d)} · {dateFmt.format(d)}
    </time>
  )
}
