import { useSyncExternalStore } from 'react'

// ready = ScenePrep is done merging and compiling, the intro waits for it.
// introDone = fully revealed, heavy stuff like the desktop snapshot waits for that

let ready = false
let introDone = false
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function markSceneReady() {
  if (ready) return
  ready = true
  document.documentElement.classList.add('scene-ready')
  listeners.forEach((listener) => listener())
}

export function useSceneReady() {
  return useSyncExternalStore(subscribe, () => ready)
}

export function markIntroDone() {
  if (introDone) return
  introDone = true
  listeners.forEach((listener) => listener())
}

export function useIntroDone() {
  return useSyncExternalStore(subscribe, () => introDone)
}
