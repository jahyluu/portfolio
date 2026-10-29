import { useState, type ComponentType } from 'react'
import { BIO, EXPERIENCE, PROFILE, PROJECTS, STACK } from './content'
import { AboutTile, ContactTile, FolderIcon, ProjectsTile, ResumeTile, StackTile } from './icons'
import { desktop } from './store'

export type AppId = 'projects' | 'project' | 'about' | 'stack' | 'resume' | 'contact'

type App = {
  title: (item?: string) => string
  // initial [width, height]
  size: [number, number]
  Tile: ComponentType<{ size?: number }>
  Content: ComponentType<{ item?: string }>
}

export const APPS: Record<AppId, App> = {
  projects: { title: () => 'Projects', size: [640, 420], Tile: ProjectsTile, Content: Finder },
  project: { title: (item) => PROJECTS.find((p) => p.id === item)?.name ?? 'Project', size: [560, 520], Tile: ProjectsTile, Content: ProjectDetails },
  about: { title: () => 'About Me', size: [520, 560], Tile: AboutTile, Content: About },
  stack: { title: () => 'Tech Stack', size: [520, 470], Tile: StackTile, Content: Stack },
  resume: { title: () => 'Resume.pdf', size: [620, 720], Tile: ResumeTile, Content: Resume },
  contact: { title: () => 'Contact', size: [400, 330], Tile: ContactTile, Content: Contact },
}

// dock order
export const DOCK: AppId[] = ['projects', 'about', 'stack', 'resume', 'contact']

function Finder() {
  const [selected, setSelected] = useState<string | null>(null)
  return (
    <div className="finder">
      <nav className="finder-sidebar">
        <p className="finder-heading">Favorites</p>
        <button className="finder-place active">Projects</button>
        <button className="finder-place" onClick={() => desktop.open('about')}>About Me</button>
        <button className="finder-place" onClick={() => desktop.open('stack')}>Tech Stack</button>
        <button className="finder-place" onClick={() => desktop.open('resume')}>Resume.pdf</button>
        <button className="finder-place" onClick={() => desktop.open('contact')}>Contact</button>
      </nav>
      <div className="finder-main" onClick={() => setSelected(null)}>
        <div className="finder-grid">
          {PROJECTS.map((project) => (
            <button
              key={project.id}
              className={`finder-item${selected === project.id ? ' selected' : ''}`}
              onClick={(event) => {
                event.stopPropagation()
                setSelected(project.id)
              }}
              onDoubleClick={() => desktop.open('project', project.id)}
              onKeyDown={(event) => event.key === 'Enter' && desktop.open('project', project.id)}
            >
              <FolderIcon color={project.color} size={60} />
              <span>{project.name}</span>
            </button>
          ))}
        </div>
        <p className="finder-status">{PROJECTS.length} items</p>
      </div>
    </div>
  )
}

export function ProjectDetails({ item }: { item?: string }) {
  const project = PROJECTS.find((p) => p.id === item)
  if (!project) return null
  return (
    <article className="doc">
      <header className="project-header">
        <FolderIcon color={project.color} size={56} />
        <div>
          <h1>{project.name}</h1>
          <p className="muted">{project.tagline}</p>
        </div>
      </header>
      <ul className="chips">
        {project.stack.map((tech) => (
          <li key={tech}>{tech}</li>
        ))}
      </ul>
      {project.summary.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      {(project.repo || project.live) && (
        <div className="actions">
          {project.live && (
            <a className="button primary" href={project.live} target="_blank" rel="noreferrer">
              Open live site
            </a>
          )}
          {project.repo && (
            <a className="button" href={project.repo} target="_blank" rel="noreferrer">
              View code
            </a>
          )}
        </div>
      )}
    </article>
  )
}

export function About() {
  return (
    <article className="doc">
      <header className="about-header">
        <div className="avatar">JL</div>
        <div>
          <h1>{PROFILE.name}</h1>
          <p className="muted">
            {PROFILE.title} · {PROFILE.location}
          </p>
        </div>
      </header>
      {BIO.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      <h2>Experience</h2>
      <ul className="timeline">
        {EXPERIENCE.map((job) => (
          <li key={job.company + job.role}>
            <strong>{job.role}</strong>
            <span>{job.company}</span>
            <span className="muted">{job.dates}</span>
          </li>
        ))}
      </ul>
    </article>
  )
}

export function Stack() {
  return (
    <article className="doc">
      {STACK.map(({ group, items }) => (
        <section key={group}>
          <h2>{group}</h2>
          <ul className="chips">
            {items.map((tech) => (
              <li key={tech}>{tech}</li>
            ))}
          </ul>
        </section>
      ))}
    </article>
  )
}

function Resume() {
  return (
    <div className="resume">
      <div className="toolbar">
        <a className="button" href={PROFILE.resume} download="JahyLuuResume.pdf">
          Download
        </a>
        <a className="button" href={PROFILE.resume} target="_blank" rel="noreferrer">
          Open in new tab
        </a>
      </div>
      <div className="resume-view">
        <div className="resume-page" aria-hidden="true">
          {[40, 90, 75, 85, 60, 0, 90, 80, 70, 88, 55, 0, 85, 75, 90, 65].map((width, i) =>
            width ? <span key={i} style={{ width: i === 0 ? undefined : `${width}%` }} /> : <br key={i} />,
          )}
        </div>
        <iframe src={`${PROFILE.resume}#view=FitH`} title="Resume" />
      </div>
    </div>
  )
}

export function Contact() {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(PROFILE.email).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <article className="doc contact">
      <p>The best way to reach me is email. I usually reply within a day.</p>
      <div className="contact-row">
        <a href={`mailto:${PROFILE.email}`}>{PROFILE.email}</a>
        <button className="button" onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="actions">
        <a className="button" href={PROFILE.linkedin} target="_blank" rel="noreferrer">
          LinkedIn
        </a>
        <a className="button" href={PROFILE.github} target="_blank" rel="noreferrer">
          GitHub
        </a>
      </div>
    </article>
  )
}
