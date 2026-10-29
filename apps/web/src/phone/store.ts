import { useSyncExternalStore } from 'react'

export type PhoneAppId = 'projects' | 'about' | 'stack' | 'resume' | 'contact'

// open app, like an android task. pages = back stack (just the open project for now)
export type Task = { app: PhoneAppId; pages: string[] }

type State = {
  // newest first
  tasks: Task[]
  view: 'home' | 'app' | 'recents'
  // app on screen, also where back from recents goes
  current: PhoneAppId | null
}

// in memory like the desktop store: survives scrolling out, resets on reload
let state: State = { tasks: [], view: 'home', current: null }
const listeners = new Set<() => void>()

function set(next: Partial<State>) {
  state = { ...state, ...next }
  listeners.forEach((listener) => listener())
}

export function usePhone() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    () => state,
  )
}

function bringToFront(app: PhoneAppId, change?: Partial<Task>) {
  const task = state.tasks.find((t) => t.app === app) ?? { app, pages: [] }
  return [{ ...task, ...change }, ...state.tasks.filter((t) => t.app !== app)]
}

export const phone = {
  open(app: PhoneAppId) {
    set({ tasks: bringToFront(app), view: 'app', current: app })
  },

  // e.g. a project from the list
  push(page: string) {
    const task = state.tasks.find((t) => t.app === state.current)
    if (task) set({ tasks: bringToFront(task.app, { pages: [...task.pages, page] }) })
  },

  recents() {
    set({ view: state.view === 'recents' ? (state.current ? 'app' : 'home') : 'recents' })
  },

  home() {
    set({ view: 'home', current: null })
  },

  // pop a page, or go home. app stays in recents like on android
  back() {
    if (state.view === 'recents') return phone.recents()
    if (state.view !== 'app') return
    const task = state.tasks.find((t) => t.app === state.current)
    if (task?.pages.length) set({ tasks: state.tasks.map((t) => (t === task ? { ...t, pages: t.pages.slice(0, -1) } : t)) })
    else phone.home()
  },

  close(app: PhoneAppId) {
    const tasks = state.tasks.filter((t) => t.app !== app)
    const current = state.current === app ? null : state.current
    // last card closed, back to home
    set({ tasks, current, view: tasks.length ? state.view : 'home' })
  },

  closeAll() {
    set({ tasks: [], current: null, view: 'home' })
  },
}
