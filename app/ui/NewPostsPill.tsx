'use client'

import { ArrowUp } from './icons'

export function NewPostsPill({ count, onClick }: { count: number; onClick: () => void }) {
  if (!count) return null
  return (
    <button
      type="button"
      className="pill-new"
      onClick={() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
        onClick()
      }}
    >
      <ArrowUp size={16} />
      {count}件の新しいポスト
    </button>
  )
}
