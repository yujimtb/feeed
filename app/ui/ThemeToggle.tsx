'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from './icons'

// dataset.theme を反転して localStorage に保存する。SSR時は中立の空アイコン
export function ThemeToggle() {
  const [theme, setTheme] = useState<string | null>(null)
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme ?? 'light')
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem('theme', next)
    } catch {}
    setTheme(next)
  }

  const label = theme === 'light' ? 'ダークモードにする' : 'ライトモードにする'
  return (
    <button type="button" className="icon-btn theme-toggle" aria-label={label} title={label} onClick={toggle}>
      {theme === 'light' ? <Moon size={20} /> : theme === 'dark' ? <Sun size={20} /> : <span className="theme-blank" />}
    </button>
  )
}
