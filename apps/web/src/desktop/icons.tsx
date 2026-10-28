import { useId, type ReactNode } from 'react'

// all drawn on a 64x64 grid

export function FolderIcon({ color = '#6aa7ff', size = 64 }: { color?: string; size?: number }) {
  const id = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity="0.78" />
        </linearGradient>
      </defs>
      {/* back panel with the tab */}
      <path d="M6 14a4 4 0 0 1 4-4h14l5 5h25a4 4 0 0 1 4 4v29a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4z" fill={color} opacity="0.55" />
      <rect x="6" y="20" width="52" height="34" rx="4" fill={`url(#${id})`} />
      <rect x="6" y="20" width="52" height="2" rx="1" fill="#fff" opacity="0.25" />
    </svg>
  )
}

export function DocumentIcon({ label, labelColor = '#e5484d', size = 64 }: { label?: string; labelColor?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M14 4h26l12 12v42a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="#f7f6f3" />
      <path d="M40 4v10a2 2 0 0 0 2 2h10z" fill="#d9d6cf" />
      {[24, 30, 36, 42].map((y) => (
        <rect key={y} x="18" y={y} width={y === 42 ? 18 : 28} height="2.4" rx="1.2" fill="#c9c5bc" />
      ))}
      {label && (
        <>
          <rect x="16" y="46" width="32" height="10" rx="2" fill={labelColor} />
          <text x="32" y="53.6" textAnchor="middle" fontSize="7" fontWeight="700" fill="#fff" fontFamily="system-ui, sans-serif">
            {label}
          </text>
        </>
      )}
    </svg>
  )
}

// app tiles for the dock: rounded square with a gradient and a glyph
function Tile({ from, to, children, size }: { from: string; to: string; children: ReactNode; size: number }) {
  const id = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="14" fill={`url(#${id})`} />
      {children}
    </svg>
  )
}

export function ProjectsTile({ size = 64 }: { size?: number }) {
  return (
    <Tile from="#7cb4ff" to="#3d74e0" size={size}>
      <path d="M14 22a3 3 0 0 1 3-3h9l4 4h17a3 3 0 0 1 3 3v17a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3z" fill="#fff" opacity="0.95" />
    </Tile>
  )
}

export function AboutTile({ size = 64 }: { size?: number }) {
  return (
    <Tile from="#f6b26b" to="#e07a3c" size={size}>
      <circle cx="32" cy="25" r="9" fill="#fff" />
      <path d="M16 49c2-9 8-13 16-13s14 4 16 13z" fill="#fff" />
    </Tile>
  )
}

export function StackTile({ size = 64 }: { size?: number }) {
  return (
    <Tile from="#5ad1a8" to="#1f9a73" size={size}>
      <path d="M32 14 50 23 32 32 14 23z" fill="#fff" />
      <path d="M14 32l18 9 18-9" fill="none" stroke="#fff" strokeWidth="4" strokeLinejoin="round" opacity="0.85" />
      <path d="M14 41l18 9 18-9" fill="none" stroke="#fff" strokeWidth="4" strokeLinejoin="round" opacity="0.65" />
    </Tile>
  )
}

export function ResumeTile({ size = 64 }: { size?: number }) {
  return (
    <Tile from="#ff7a85" to="#d6334a" size={size}>
      <rect x="19" y="13" width="26" height="36" rx="3" fill="#fff" />
      {[21, 27, 33, 39].map((y) => (
        <rect key={y} x="24" y={y} width={y === 39 ? 10 : 16} height="2.6" rx="1.3" fill="#d6334a" opacity="0.6" />
      ))}
    </Tile>
  )
}

export function ContactTile({ size = 64 }: { size?: number }) {
  return (
    <Tile from="#9d8cff" to="#6a4fe0" size={size}>
      <rect x="13" y="19" width="38" height="27" rx="4" fill="#fff" />
      <path d="M15 22l17 13 17-13" fill="none" stroke="#6a4fe0" strokeWidth="3" strokeLinejoin="round" />
    </Tile>
  )
}

// menu bar mark: a little coffee cup
export function CupMark() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 6h9v4a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z" fill="currentColor" />
      <path d="M11 7h1.5a2 2 0 0 1 0 4H11" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 1.5c-.8 1 .8 1.6 0 2.8M8 1.5c-.8 1 .8 1.6 0 2.8" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  )
}
