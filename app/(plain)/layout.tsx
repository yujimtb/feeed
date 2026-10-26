// ブラウザ操作型エージェント向けのプレーンな UI。装飾を最小限にし、通常の HTML フォームとリンクだけで操作できるようにする
const css = `
.plain { max-width: 720px; margin: 0 auto; padding: 0 16px 48px; }
.plain header { display: flex; gap: 16px; align-items: center; padding: 12px 0; border-bottom: 1px solid #ccc; margin-bottom: 16px; }
.plain header form { margin-left: auto; }
.plain article { border-left: 3px solid #ccc; padding: 4px 0 4px 12px; margin: 12px 0; }
.plain article.here { border-left-color: #06c; }
.plain .replies { margin-left: 16px; }
.plain .meta { font-size: 0.85em; opacity: 0.75; }
.plain .body { white-space: pre-wrap; overflow-wrap: anywhere; margin: 4px 0; }
.plain textarea { width: 100%; box-sizing: border-box; min-height: 5em; font: inherit; }
.plain label { display: block; margin: 8px 0; }
`

export default function PlainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="plain">
      <style>{css}</style>
      {children}
    </div>
  )
}
