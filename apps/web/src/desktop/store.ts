import { useSyncExternalStore } from 'react'
import { APPS, type AppId } from './apps'

export type DesktopWindow = {
  id: string
  app: AppId
  // which item, for apps that open more than one window (a project)
  item?: string
  x: number
  y: number
  width: number
  height: number
  z: number
  minimized: boolean
  maximized: boolean
}

type State = {
  windows: DesktopWindow[]
  focused: string | null
  selectedIcon: string | null
}

// module-level on purpose: survives scrolling out to the cafe and back, and resets on reload.
// don't move this into localStorage/sessionStorage, those would survive a reload
let state: State = { windows: [], focused: null, selectedIcon: null }
let topZ = 1
const listeners = new Set<() => void>()

function set(next: Partial<State>) {
  state = { ...state, ...next }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useDesktop() {
  return useSyncExternalStore(subscribe, () => state)
}

export const MENU_BAR_HEIGHT = 28

function update(id: string, change: Partial<DesktopWindow>) {
  set({ windows: state.windows.map((win) => (win.id === id ? { ...win, ...change } : win)) })
}

export const desktop = {
  open(app: AppId, item?: string) {
    const id = item ? `${app}:${item}` : app
    const existing = state.windows.find((win) => win.id === id)
    if (existing) {
      update(id, { minimized: false, z: ++topZ })
      set({ focused: id })
      return
    }
    const [width, height] = APPS[app].size
    // cascade new windows so they don't stack exactly on top of each other
    const n = state.windows.length % 6
    const x = Math.max(16, Math.min(window.innerWidth - width - 16, 140 + n * 32))
    const y = Math.max(MENU_BAR_HEIGHT + 12, Math.min(window.innerHeight - height - 100, 70 + n * 32))
    set({
      windows: [...state.windows, { id, app, item, x, y, width, height, z: ++topZ, minimized: false, maximized: false }],
      focused: id,
    })
  },

  close(id: string) {
    const windows = state.windows.filter((win) => win.id !== id)
    set({ windows, focused: state.focused === id ? topWindow(windows) : state.focused })
  },

  focus(id: string) {
    if (state.focused === id) return
    update(id, { z: ++topZ })
    set({ focused: id })
  },

  move(id: string, x: number, y: number) {
    update(id, { x, y })
  },

  minimize(id: string) {
    update(id, { minimized: true })
    set({ focused: topWindow(state.windows.filter((win) => win.id !== id)) })
  },

  toggleMaximize(id: string) {
    const win = state.windows.find((w) => w.id === id)
    if (win) update(id, { maximized: !win.maximized, z: ++topZ })
  },

  select(icon: string | null) {
    set({ selectedIcon: icon })
  },
}

function topWindow(windows: DesktopWindow[]) {
  const visible = windows.filter((win) => !win.minimized)
  if (!visible.length) return null
  return visible.reduce((a, b) => (a.z > b.z ? a : b)).id
}
