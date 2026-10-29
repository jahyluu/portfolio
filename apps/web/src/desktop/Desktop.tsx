import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { APPS, DOCK, type AppId } from './apps'
import { AppleIcon, DocumentIcon, FolderIcon } from './icons'
import { useDesktopActive } from '../handoff'
import { goToCafe } from '../scroll'
import { useScreenRect } from './screen'
import { registerDesktop, scheduleSnapshot, takeSnapshot } from './snapshot'
import { desktop, MENU_BAR_HEIGHT, useDesktop, type DesktopWindow } from './store'
import './desktop.css'

// always mounted (just faded out in the cafe) so open windows and scroll positions survive
// leaving. the laptop shows a snapshot of it meanwhile (snapshot.ts)
export function Desktop() {
  const state = useDesktop()
  const { windows, focused } = state
  // no clicks or focus while it's hidden
  const active = useDesktopActive()
  const { width, height, left, top } = useScreenRect()
  // full screen when the top window is maximized
  const visible = windows.filter((win) => !win.minimized)
  const topWindow = visible.length ? visible.reduce((a, b) => (a.z > b.z ? a : b)) : null
  const fullScreen = !!topWindow?.maximized

  // initial snapshot after load, then after every change
  useEffect(() => scheduleSnapshot(1000), [])
  useEffect(() => {
    if (active) scheduleSnapshot()
  }, [active, state, width, height])
  // catch anything that changed right before leaving
  const wasActive = useRef(active)
  useEffect(() => {
    if (wasActive.current && !active) takeSnapshot()
    wasActive.current = active
  }, [active])

  return (
    <div
      ref={registerDesktop}
      className={`desktop${fullScreen ? ' full-screen' : ''}`}
      style={{ width, height, left, top }}
      inert={!active}
      onPointerDown={() => desktop.select(null)}
      // scrolling inside a window counts as a change too
      onScrollCapture={() => scheduleSnapshot()}
    >
      <div className="wallpaper" />
      {/* hover strips along the top and bottom edges, used in full screen (desktop.css) */}
      <div className="menu-zone">
        <MenuBar title={focused ? APPS[windows.find((w) => w.id === focused)!.app].title() : 'Finder'} />
      </div>
      <DesktopIcons />
      {windows.map((win) => (
        <Window key={win.id} win={win} focused={win.id === focused} />
      ))}
      <div className="dock-zone">
        <Dock />
      </div>
    </div>
  )
}

function MenuBar({ title }: { title: string }) {
  const now = useClock()
  return (
    <header className="menu-bar" style={{ height: MENU_BAR_HEIGHT }}>
      <span className="menu-mark">
        <AppleIcon />
      </span>
      <strong>{title}</strong>
      <span className="menu-item">File</span>
      <span className="menu-item">Edit</span>
      <span className="menu-item">View</span>
      <span className="menu-item">Window</span>
      <span className="menu-spacer" />
      <button className="menu-item menu-action" onClick={goToCafe}>
        Back to café <kbd>1</kbd>
      </button>
      <time className="menu-item" dateTime={now.toISOString()}>
        {now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}{' '}
        {now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
      </time>
    </header>
  )
}

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10_000)
    return () => clearInterval(timer)
  }, [])
  return now
}

const ICONS: { id: AppId; label: string; icon: ReactNode }[] = [
  { id: 'projects', label: 'Projects', icon: <FolderIcon /> },
  { id: 'about', label: 'About Me', icon: <DocumentIcon /> },
  { id: 'stack', label: 'Tech Stack', icon: <DocumentIcon /> },
  { id: 'resume', label: 'Resume.pdf', icon: <DocumentIcon label="PDF" /> },
  { id: 'contact', label: 'Contact', icon: <DocumentIcon /> },
]

// top right, like macOS
function DesktopIcons() {
  const { selectedIcon } = useDesktop()
  return (
    <nav className="desktop-icons" aria-label="Desktop">
      {ICONS.map(({ id, label, icon }) => (
        <button
          key={id}
          className={`desktop-icon${selectedIcon === id ? ' selected' : ''}`}
          onPointerDown={(event) => {
            event.stopPropagation()
            desktop.select(id)
          }}
          onDoubleClick={() => desktop.open(id)}
          onKeyDown={(event) => event.key === 'Enter' && desktop.open(id)}
        >
          {icon}
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}

const MIN_SIZE = { width: 320, height: 200 }
const RESIZE_EDGES = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']

function Window({ win, focused }: { win: DesktopWindow; focused: boolean }) {
  const app = APPS[win.app]
  const screen = useScreenRect()
  const drag = useRef<{ dx: number; dy: number } | null>(null)

  const onPointerDown = (event: ReactPointerEvent) => {
    if (win.maximized || (event.target as HTMLElement).closest('button')) return
    drag.current = { dx: event.clientX - win.x, dy: event.clientY - win.y }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const onPointerMove = (event: ReactPointerEvent) => {
    if (!drag.current) return
    // keep the title bar on screen so it can always be grabbed
    const x = Math.min(Math.max(event.clientX - drag.current.dx, 80 - win.width), screen.width - 80)
    const y = Math.min(Math.max(event.clientY - drag.current.dy, MENU_BAR_HEIGHT), screen.height - 60)
    desktop.move(win.id, x, y)
  }
  const onPointerUp = () => {
    drag.current = null
  }

  // dir = which edges move (n/s/e/w)
  const resizing = useRef<{ dir: string; x: number; y: number; rect: { x: number; y: number; width: number; height: number } } | null>(null)
  const startResize = (dir: string) => (event: ReactPointerEvent) => {
    event.stopPropagation()
    desktop.focus(win.id)
    resizing.current = { dir, x: event.clientX, y: event.clientY, rect: { x: win.x, y: win.y, width: win.width, height: win.height } }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const onResize = (event: ReactPointerEvent) => {
    const r = resizing.current
    if (!r) return
    const dx = event.clientX - r.x
    const dy = event.clientY - r.y
    let { x, y, width, height } = r.rect
    if (r.dir.includes('e')) width = Math.min(Math.max(width + dx, MIN_SIZE.width), screen.width - x)
    if (r.dir.includes('s')) height = Math.min(Math.max(height + dy, MIN_SIZE.height), screen.height - y)
    if (r.dir.includes('w')) {
      const right = x + width
      x = Math.min(Math.max(x + dx, 0), right - MIN_SIZE.width)
      width = right - x
    }
    if (r.dir.includes('n')) {
      const bottom = y + height
      y = Math.min(Math.max(y + dy, MENU_BAR_HEIGHT), bottom - MIN_SIZE.height)
      height = bottom - y
    }
    desktop.setRect(win.id, { x, y, width, height })
  }
  const endResize = () => {
    resizing.current = null
  }

  const style = win.maximized
    ? { left: 0, top: MENU_BAR_HEIGHT, width: '100%', height: `calc(100% - ${MENU_BAR_HEIGHT}px)`, zIndex: win.z }
    : { left: win.x, top: win.y, width: win.width, height: win.height, zIndex: win.z }

  return (
    <section
      className={`window${focused ? ' focused' : ''}${win.maximized ? ' maximized' : ''}`}
      style={{ ...style, display: win.minimized ? 'none' : undefined }}
      onPointerDown={(event) => {
        event.stopPropagation()
        desktop.focus(win.id)
      }}
      aria-label={app.title(win.item)}
    >
      {/* hover strip that reveals the title bar in full screen */}
      {win.maximized && <div className="title-reveal" />}
      <div
        className="title-bar"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={() => desktop.toggleMaximize(win.id)}
      >
        {/* glyphs show on hover */}
        <div className="traffic-lights">
          <button className="light close" aria-label="Close" onClick={() => desktop.close(win.id)}>
            <svg viewBox="0 0 12 12" aria-hidden="true">
              <path d="M3.5 3.5l5 5M8.5 3.5l-5 5" />
            </svg>
          </button>
          <button className="light minimize" aria-label="Minimize" onClick={() => desktop.minimize(win.id)}>
            <svg viewBox="0 0 12 12" aria-hidden="true">
              <path d="M2.8 6h6.4" />
            </svg>
          </button>
          <button
            className="light zoom"
            aria-label={win.maximized ? 'Exit full screen' : 'Enter full screen'}
            onClick={() => desktop.toggleMaximize(win.id)}
          >
            <svg viewBox="0 0 12 12" aria-hidden="true">
              {win.maximized ? (
                // exit: arrows point in
                <path d="M5.4 5.4V1.8L1.8 5.4zM6.6 6.6v3.6l3.6-3.6z" />
              ) : (
                // enter: arrows point out
                <path d="M3 3h4.2L3 7.2zM9 9H4.8L9 4.8z" />
              )}
            </svg>
          </button>
        </div>
        <span className="window-title">{app.title(win.item)}</span>
      </div>
      <div className="window-body">
        <app.Content item={win.item} />
      </div>
      {!win.maximized &&
        RESIZE_EDGES.map((dir) => (
          <div
            key={dir}
            className={`resize resize-${dir}`}
            onPointerDown={startResize(dir)}
            onPointerMove={onResize}
            onPointerUp={endResize}
            onPointerCancel={endResize}
          />
        ))}
    </section>
  )
}

function Dock() {
  const { windows } = useDesktop()
  return (
    <nav className="dock" aria-label="Dock">
      {DOCK.map((id) => {
        const { Tile, title } = APPS[id]
        // open project windows count for the projects tile
        const open = windows.some((win) => win.app === id || (id === 'projects' && win.app === 'project'))
        return (
          <button key={id} className="dock-item" onClick={() => desktop.open(id)} aria-label={title()}>
            <span className="dock-label">{title()}</span>
            <Tile size={48} />
            <span className={`dock-dot${open ? ' on' : ''}`} />
          </button>
        )
      })}
    </nav>
  )
}
