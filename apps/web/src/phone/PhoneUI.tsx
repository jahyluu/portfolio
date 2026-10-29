import { useEffect, useRef, useState, type ComponentType, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { About, Contact, ProjectDetails, Stack } from '../desktop/apps'
import { PROFILE, PROJECTS } from '../desktop/content'
import { AboutTile, CafeTile, ContactTile, FolderIcon, ProjectsTile, ResumeTile, StackTile } from '../desktop/icons'
import { useUiRect } from '../desktop/screen'
import { registerDesktop, scheduleSnapshot, useSnapshots } from '../desktop/snapshot'
import { useDesktopActive } from '../handoff'
import { goToCafe } from '../scroll'
import { phone, usePhone, type PhoneAppId, type Task } from './store'
import '../desktop/desktop.css'
import './phone.css'

type PhoneApp = { title: string; Tile: ComponentType<{ size?: number }>; Screen: ComponentType<{ task: Task }> }

const APPS: Record<PhoneAppId, PhoneApp> = {
  projects: { title: 'Projects', Tile: ProjectsTile, Screen: Projects },
  about: { title: 'About Me', Tile: AboutTile, Screen: () => <Page title="About Me"><About /></Page> },
  stack: { title: 'Tech Stack', Tile: StackTile, Screen: () => <Page title="Tech Stack"><Stack /></Page> },
  resume: { title: 'Resume', Tile: ResumeTile, Screen: Resume },
  contact: { title: 'Contact', Tile: ContactTile, Screen: () => <Page title="Contact"><Contact /></Page> },
}

// stable DOM order, recents reorders with css `order`. moving the nodes resets their scroll
const APP_ORDER = Object.keys(APPS) as PhoneAppId[]

// my phone's screen. always mounted like the desktop, fades in when the camera lands
export function PhoneUI() {
  const state = usePhone()
  const { tasks, view, current } = state
  const active = useDesktopActive()
  const { rect, style } = useUiRect()

  useSnapshots(active, [state], rect)

  return (
    <div
      ref={registerDesktop}
      className={`phone view-${view}`}
      style={style}
      inert={!active}
      onScrollCapture={() => scheduleSnapshot()}
    >
      <div className="wallpaper" />
      <StatusBar />
      <Home />
      <div className="tasks" onClick={() => view === 'recents' && phone.recents()}>
        {APP_ORDER.map((app) => {
          const index = tasks.findIndex((t) => t.app === app)
          if (index < 0) return null
          return <TaskView key={app} task={tasks[index]} order={index} shown={view === 'recents' || current === app} />
        })}
        {view === 'recents' && !tasks.length && <p className="recents-empty">No recent apps</p>}
      </div>
      {view === 'recents' && tasks.length > 0 && (
        <button className="close-all" onClick={phone.closeAll}>
          Close all
        </button>
      )}
      <NavBar />
    </div>
  )
}

function StatusBar() {
  const now = useClock()
  return (
    <header className="status-bar">
      <time dateTime={now.toISOString()}>{now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M$/i, '')}</time>
      <span className="status-icons" aria-hidden="true">
        {/* wifi */}
        <svg viewBox="0 0 16 16">
          <path d="M8 13.5 1.2 6.1a9.6 9.6 0 0 1 13.6 0z" />
        </svg>
        {/* signal */}
        <svg viewBox="0 0 16 16">
          <path d="M14 2v12H2z" />
        </svg>
        {/* battery */}
        <svg viewBox="0 0 16 16" className="battery">
          <rect x="1" y="4.5" width="12.5" height="7" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.1" />
          <rect x="2.4" y="5.9" width="8.4" height="4.2" rx="0.6" />
          <rect x="14.2" y="6.6" width="1.2" height="2.8" rx="0.5" />
        </svg>
      </span>
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

// one ui style home screen: clock up top, icons low, dock row at the bottom
const GRID: PhoneAppId[] = ['stack']
const DOCK: PhoneAppId[] = ['projects', 'about', 'resume', 'contact']

function Home() {
  const now = useClock()
  return (
    <main className="home">
      <div className="clock-widget">
        <span className="clock-time">{now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M$/i, '')}</span>
        <span className="clock-date">{now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
      </div>
      <div className="app-grid">
        {GRID.map((app) => (
          <AppIcon key={app} app={app} />
        ))}
        <button className="app-icon cafe-icon" onClick={goToCafe}>
          <CafeTile size={56} />
          <span>Café</span>
        </button>
      </div>
      <div className="home-dock">
        {DOCK.map((app) => (
          <AppIcon key={app} app={app} />
        ))}
      </div>
    </main>
  )
}

function AppIcon({ app }: { app: PhoneAppId }) {
  const { title, Tile } = APPS[app]
  return (
    <button className="app-icon" onClick={() => phone.open(app)}>
      <Tile size={56} />
      <span>{title}</span>
    </button>
  )
}

// open app. full screen, or a card in recents (swipe up to close)
function TaskView({ task, order, shown }: { task: Task; order: number; shown: boolean }) {
  const { title, Tile, Screen } = APPS[task.app]
  const { view } = usePhone()
  const recents = view === 'recents'
  const swipe = useRef<{ x: number; y: number; dy: number; moved: boolean } | null>(null)
  // swipes fire a click too, don't open on those
  const swiped = useRef(false)
  const [dy, setDy] = useState(0)
  const [closing, setClosing] = useState(false)

  const onPointerDown = (event: ReactPointerEvent) => {
    if (!recents) return
    swiped.current = false
    swipe.current = { x: event.clientX, y: event.clientY, dy: 0, moved: false }
  }
  const onPointerMove = (event: ReactPointerEvent) => {
    const s = swipe.current
    if (!s) return
    const dx = event.clientX - s.x
    s.dy = Math.min(0, event.clientY - s.y)
    // horizontal = scrolling the strip, let it go
    if (!s.moved && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(s.dy)) {
      swipe.current = null
      return
    }
    if (Math.abs(s.dy) > 8) {
      s.moved = true
      event.currentTarget.setPointerCapture(event.pointerId)
      setDy(s.dy)
    }
  }
  const onPointerUp = () => {
    const s = swipe.current
    swipe.current = null
    if (!s) return
    swiped.current = s.moved
    if (s.dy < -90) {
      setClosing(true)
      setTimeout(() => phone.close(task.app), 180)
    } else setDy(0)
  }

  return (
    <section
      className={`task${shown ? ' shown' : ''}${closing ? ' closing' : ''}`}
      style={{ order, ...(recents && dy ? { transform: `translateY(${dy}px)`, transition: 'none' } : null) }}
      aria-label={title}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={(event) => {
        if (!recents) return
        event.stopPropagation()
        if (!swiped.current) phone.open(task.app)
      }}
    >
      {recents && (
        <span className="task-label">
          <Tile size={22} />
          {title}
        </span>
      )}
      <div className="task-screen" inert={recents}>
        <Screen task={task} />
      </div>
    </section>
  )
}

// one ui style page: big title that scrolls up into a toolbar
function Page({ title, back, children }: { title: string; back?: () => void; children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false)
  return (
    <div className={`page${scrolled ? ' scrolled' : ''}`}>
      <div className="toolbar-compact">
        {back && (
          <button className="toolbar-back" aria-label="Back" onClick={back}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
        )}
        <span>{title}</span>
      </div>
      <div className="page-body" onScroll={(event) => setScrolled(event.currentTarget.scrollTop > 90)}>
        <h1 className="page-title">{title}</h1>
        <div className="page-content">{children}</div>
      </div>
    </div>
  )
}

function Projects({ task }: { task: Task }) {
  const open = task.pages.at(-1)
  const project = PROJECTS.find((p) => p.id === open)
  return (
    <>
      <Page title="Projects">
        <ul className="list">
          {PROJECTS.map((p) => (
            <li key={p.id}>
              <button onClick={() => phone.push(p.id)}>
                <FolderIcon color={p.color} size={40} />
                <span>
                  <strong>{p.name}</strong>
                  <span className="muted">{p.tagline}</span>
                </span>
                <svg className="chevron" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      </Page>
      {project && (
        <div className="subpage" key={project.id}>
          <Page title={project.name} back={phone.back}>
            <ProjectDetails item={project.id} />
          </Page>
        </div>
      )}
    </>
  )
}

// most phones can't show a pdf inline, so just a preview + buttons
function Resume() {
  return (
    <Page title="Resume">
      <div className="resume-card">
        <div className="resume-page" aria-hidden="true">
          {[40, 90, 75, 85, 60, 0, 90, 80, 70, 88, 55, 0, 85, 75].map((width, i) =>
            width ? <span key={i} style={{ width: i === 0 ? undefined : `${width}%` }} /> : <br key={i} />,
          )}
        </div>
      </div>
      <div className="actions">
        <a className="button primary" href={PROFILE.resume} target="_blank" rel="noreferrer">
          Open PDF
        </a>
        <a className="button" href={PROFILE.resume} download="JahyLuuResume.pdf">
          Download
        </a>
      </div>
    </Page>
  )
}

// samsung order: recents, home, back
function NavBar() {
  return (
    <nav className="nav-bar" aria-label="Navigation">
      <button aria-label="Recent apps" onClick={phone.recents}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 6.5v11M12 6.5v11M17 6.5v11" />
        </svg>
      </button>
      <button aria-label="Home" onClick={phone.home}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="6" y="6" width="12" height="12" rx="4" />
        </svg>
      </button>
      <button aria-label="Back" onClick={phone.back}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 5.5 8.5 12l6.5 6.5" />
        </svg>
      </button>
    </nav>
  )
}
