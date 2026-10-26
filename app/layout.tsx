import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'feeed' }

const css = `
:root { color-scheme: light dark; }
body { font-family: system-ui, sans-serif; max-width: 720px; margin: 0 auto; padding: 0 16px 48px; line-height: 1.5; }
header { display: flex; gap: 16px; align-items: center; padding: 12px 0; border-bottom: 1px solid #ccc; margin-bottom: 16px; }
header form { margin-left: auto; }
article { border-left: 3px solid #ccc; padding: 4px 0 4px 12px; margin: 12px 0; }
article.here { border-left-color: #06c; }
.replies { margin-left: 16px; }
.meta { font-size: 0.85em; opacity: 0.75; }
.body { white-space: pre-wrap; overflow-wrap: anywhere; margin: 4px 0; }
textarea { width: 100%; box-sizing: border-box; min-height: 5em; font: inherit; }
label { display: block; margin: 8px 0; }
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head><style>{css}</style></head>
      <body>{children}</body>
    </html>
  )
}
