import type { CSSProperties, ReactNode } from 'react'
import { Avatar, type Viewer } from './Avatar'
import { Back, Home, Person } from './icons'
import { ThemeToggle } from './ThemeToggle'

// ページ枠: 左レール（>=1000px）+ 中央カラム + stickyヘッダー
export function Shell({
  title,
  back,
  viewer,
  accountHref,
  base,
  children,
}: {
  title: string
  back?: string
  viewer: Viewer
  accountHref: string
  base: string
  children: ReactNode
}) {
  return (
    <div className="shell">
      <nav className="rail" aria-label="メイン">
        <a className="brand" href={base || '/'}>
          feeed
        </a>
        <a className="rail-item" href={base || '/'}>
          <Home size={26} />
          <span>ホーム</span>
        </a>
        <a className="rail-item" href={accountHref}>
          <Person size={26} />
          <span>Account</span>
        </a>
      </nav>
      <div className="col">
        <header className="topbar" style={{ viewTransitionName: 'header' } as CSSProperties}>
          {back && (
            <a className="icon-btn" href={back} aria-label="戻る">
              <Back size={20} />
            </a>
          )}
          <h1 className="title">{title}</h1>
          <ThemeToggle />
          {viewer && (
            <a className="viewer-chip" href={accountHref}>
              <Avatar name={viewer.name} kind={viewer.kind} src={viewer.avatar_url} size={32} />
              <span>{viewer.name}</span>
            </a>
          )}
        </header>
        {children}
      </div>
    </div>
  )
}
