import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { APPS, DOCK, type AppId } from './apps'
import { PROFILE } from './content'
import { CupMark, DocumentIcon, FolderIcon } from './icons'
import { registerDesktop, useDesktopActive } from '../handoff'
import { desktop, MENU_BAR_HEIGHT, useDesktop, type DesktopWindow } from './store'
import './desktop.css'

// the laptop's desktop. always mounted: in the cafe it's drawn onto my laptop screen (see
// handoff.ts), so open windows and scroll positions survive scrolling out and back in
export function Desktop() {
  const { windows, focused } = useDesktop()
  // while it's faded out it shouldn't take clicks or keyboard focus
  const active = useDesktopActive()
  return (
    <div ref={registerDesktop} className="desktop" inert={!active} onPointerDown={() => desktop.select(null)}>
      <MenuBar title={focused ? APPS[windows.find((w) => w.id === focused)!.app].title() : 'Finder'} />
      <DesktopIcons />
      {windows.map((win) => (
        <Window key={win.id} win={win} focused={win.id === focused} />
      ))}
      <Dock />
    </div>
  )
}

function MenuBar({ title }: { title: string }) {
  const now = useClock()
  return (
    <header className="menu-bar" style={{ height: MENU_BAR_HEIGHT }}>
      <span className="menu-mark">
        <CupMark />
      </span>
      <strong>{title}</strong>
      <span className="menu-item">File</span>
      <span className="menu-item">Edit</span>
      <span className="menu-item">View</span>
      <span className="menu-item">Window</span>
      <span className="menu-spacer" />
      <span className="menu-item">{PROFILE.name}</span>
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

function Window({ win, focused }: { win: DesktopWindow; focused: boolean }) {
  const app = APPS[win.app]
  const drag = useRef<{ dx: number; dy: number } | null>(null)

  const onPointerDown = (event: ReactPointerEvent) => {
    if (win.maximized || (event.target as HTMLElement).closest('button')) return
    drag.current = { dx: event.clientX - win.x, dy: event.clientY - win.y }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const onPointerMove = (event: ReactPointerEvent) => {
    if (!drag.current) return
    // keep the title bar on screen so it can always be grabbed again
    const x = Math.min(Math.max(event.clientX - drag.current.dx, 80 - win.width), window.innerWidth - 80)
    const y = Math.min(Math.max(event.clientY - drag.current.dy, MENU_BAR_HEIGHT), window.innerHeight - 60)
    desktop.move(win.id, x, y)
  }
  const onPointerUp = () => {
    drag.current = null
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
      <div
        className="title-bar"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={() => desktop.toggleMaximize(win.id)}
      >
        <div className="traffic-lights">
          <button className="light close" aria-label="Close" onClick={() => desktop.close(win.id)} />
          <button className="light minimize" aria-label="Minimize" onClick={() => desktop.minimize(win.id)} />
          <button className="light zoom" aria-label="Zoom" onClick={() => desktop.toggleMaximize(win.id)} />
        </div>
        <span className="window-title">{app.title(win.item)}</span>
      </div>
      <div className="window-body">
        <app.Content item={win.item} />
      </div>
    </section>
  )
}

function Dock() {
  const { windows } = useDesktop()
  return (
    <nav className="dock" aria-label="Dock">
      {DOCK.map((id) => {
        const { Tile, title } = APPS[id]
        // the projects tile also lights up for open project windows
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
