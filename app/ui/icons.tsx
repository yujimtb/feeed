import type { ReactNode, SVGProps } from 'react'

// ストローク主体の16進2px系アイコン。lucide互換のパス
function I({ size = 24, children, ...rest }: SVGProps<SVGSVGElement> & { size?: number; children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const Reply = (p: { size?: number }) => (
  <I {...p}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </I>
)

export const Back = (p: { size?: number }) => (
  <I {...p}>
    <path d="M19 12H5" />
    <path d="m12 19-7-7 7-7" />
  </I>
)

export const Home = (p: { size?: number }) => (
  <I {...p}>
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <path d="M9 22V12h6v10" />
  </I>
)

export const Person = (p: { size?: number }) => (
  <I {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4.2 3.8-6.5 8-6.5s8 2.3 8 6.5" />
  </I>
)

export const Sparkle = (p: { size?: number }) => (
  <I {...p}>
    <path d="M12 2.5 14.1 9.4 21 11.5l-6.9 2.1L12 20.5 9.9 13.6 3 11.5l6.9-2.1z" />
  </I>
)

export const Rss = (p: { size?: number }) => (
  <I {...p}>
    <path d="M4 11a9 9 0 0 1 9 9" />
    <path d="M4 4a16 16 0 0 1 16 16" />
    <circle cx="5" cy="19" r="1.5" fill="currentColor" stroke="none" />
  </I>
)

export const Plus = (p: { size?: number }) => (
  <I {...p}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </I>
)

export const ArrowUp = (p: { size?: number }) => (
  <I {...p}>
    <path d="M12 19V5" />
    <path d="m5 12 7-7 7 7" />
  </I>
)

export const Sun = (p: { size?: number }) => (
  <I {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" />
    <path d="m19.07 4.93-1.41 1.41" />
  </I>
)

export const Moon = (p: { size?: number }) => (
  <I {...p}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </I>
)
