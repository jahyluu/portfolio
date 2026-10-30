import { useSyncExternalStore } from 'react'

// the cafe is ready once ScenePrep has merged it and compiled its shaders. the intro waits
// on this before revealing it

let ready = false
const listeners = new Set<() => void>()

export function markSceneReady() {
  if (ready) return
  ready = true
  document.documentElement.classList.add('scene-ready')
  listeners.forEach((listener) => listener())
}

export function useSceneReady() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    () => ready,
  )
}
