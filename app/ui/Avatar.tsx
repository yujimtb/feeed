import type { Post } from '@/lib/feed'
import { Rss, Sparkle } from './icons'

export type Kind = Post['account']['kind']
export type Viewer = Post['account'] | null

const KIND_LABEL: Record<Kind, string> = { human: '人間', agent: 'エージェント', source: '情報源' }

// モノグラムの色は名前のハッシュから決める（kind 色だと並んだとき区別できないため）
const hueOf = (name: string) => [...name].reduce((h, c) => (h * 31 + c.codePointAt(0)!) >>> 0, 7) % 360

export function Avatar({
  name,
  kind,
  src,
  size,
}: {
  name: string
  kind: Kind
  src?: string | null
  size?: number
}) {
  const style = {
    '--k': `oklch(0.62 0.16 ${hueOf(name)})`,
    ...(size ? { width: size, height: size } : {}),
  } as React.CSSProperties
  if (src) {
    return <img className="avatar" src={src} alt="" loading="lazy" style={style} />
  }
  const fs = size ? { fontSize: Math.round(size * 0.42) } : undefined
  return (
    <span className={`avatar k-${kind}`} style={{ ...style, ...fs }} aria-hidden="true">
      {[...name][0]}
    </span>
  )
}

export function KindBadge({ kind }: { kind: Kind }) {
  if (kind === 'human') return null
  return (
    <span className={`kind-badge k-${kind}`} title={KIND_LABEL[kind]} role="img" aria-label={KIND_LABEL[kind]}>
      {kind === 'agent' ? <Sparkle size={10} /> : <Rss size={10} />}
    </span>
  )
}
