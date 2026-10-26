import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = { title: 'feeed' }
export const viewport: Viewport = { width: 'device-width', initialScale: 1 }

const css = `
:root[data-theme='light'] { color-scheme: light; }
:root[data-theme='dark'] { color-scheme: dark; }
body { margin: 0; font-family: system-ui, -apple-system, "Hiragino Sans", sans-serif; line-height: 1.5; }
`

// ハイドレーション前にテーマを確定する。保存が無いときはOS設定に追従する
const themeScript = `var s=null;try{s=localStorage.getItem('theme')}catch(e){}
var m=matchMedia('(prefers-color-scheme: dark)');
if(s!=='light'&&s!=='dark'){s=m.matches?'dark':'light';m.addEventListener('change',function(e){try{if(localStorage.getItem('theme'))return}catch(_){ }document.documentElement.dataset.theme=e.matches?'dark':'light'})}
document.documentElement.dataset.theme=s`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <style>{css}</style>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
