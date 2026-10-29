import { useSyncExternalStore } from 'react'

// cafe -> desktop handoff. uses the camera's smoothed scroll, not the raw scroll, so it
// lines up with where the camera actually is

// camera has landed (CameraRig guarantees it reaches the end). not 1 because scroll
// positions can be fractional
const ACTIVE_AT = 0.9995

// smoothed scroll progress, shared with anything that needs to follow the camera
export const smoothedScroll = { progress: 0 }

let active = false
const listeners = new Set<() => void>()

// called every frame by CameraRig
export function updateHandoff(progress: number) {
  smoothedScroll.progress = progress
  const next = progress >= ACTIVE_AT
  if (next === active) return
  active = next
  document.documentElement.classList.toggle('desktop-active', active)
  listeners.forEach((listener) => listener())
}

export function useDesktopActive() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    () => active,
  )
}
