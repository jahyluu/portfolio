import { useSyncExternalStore } from 'react'
import { MathUtils, Vector3, type Camera } from 'three'

// cafe -> desktop handoff. the desktop is one DOM element that's always on: while you're in
// the cafe it's warped onto my laptop screen with a perspective transform, and at the end of
// the scroll that transform flattens out to the whole window. driven by the camera's
// smoothed scroll (not the raw scroll) so it stays glued to the screen

// clickable once it's basically all the way in
const ACTIVE_AT = 0.985
// past this it's close enough to drop the transform entirely
const FLAT_AT = 0.998
// darken it a little from far away so it sits in the scene instead of glowing over it
const DIM = { far: 0.18, fadeFrom: 0.6, fadeTo: 0.95 }

// where the camera is along the scroll (smoothed), for anything else that needs it
export const camera = { progress: 0 }

let element: HTMLElement | null = null
let active = false
const listeners = new Set<() => void>()

export function registerDesktop(node: HTMLElement | null) {
  element = node
}

export type ScreenRegion = {
  center: Vector3
  // unit vectors along the screen, as seen from the front
  right: Vector3
  up: Vector3
  normal: Vector3
  width: number
  height: number
}

const corners = [new Vector3(), new Vector3(), new Vector3(), new Vector3()]
const toCamera = new Vector3()

// called every frame by CameraRig, after the camera has moved
export function updateHandoff(progress: number, view: Camera, region: ScreenRegion, viewport: { width: number; height: number }) {
  camera.progress = progress
  const next = progress >= ACTIVE_AT
  if (next !== active) {
    active = next
    document.documentElement.classList.toggle('desktop-active', active)
    listeners.forEach((listener) => listener())
  }
  if (!element) return

  const dim = DIM.far * (1 - MathUtils.smoothstep(progress, DIM.fadeFrom, DIM.fadeTo))
  element.style.setProperty('--dim', dim.toFixed(3))

  if (progress >= FLAT_AT) {
    element.style.transform = 'none'
    element.style.visibility = ''
    return
  }

  // hidden from behind the lid, or if any corner is behind the camera
  toCamera.copy(view.position).sub(region.center)
  let visible = toCamera.dot(region.normal) > 0
  const { center, right, up, width, height } = region
  // top left, top right, bottom right, bottom left
  ;[
    [-1, 1],
    [1, 1],
    [1, -1],
    [-1, -1],
  ].forEach(([x, y], i) => {
    const corner = corners[i].copy(center).addScaledVector(right, (x * width) / 2).addScaledVector(up, (y * height) / 2)
    if (corner.clone().applyMatrix4(view.matrixWorldInverse).z >= 0) visible = false
    corner.project(view)
    corner.set(((corner.x + 1) / 2) * viewport.width, ((1 - corner.y) / 2) * viewport.height, 0)
  })
  element.style.visibility = visible ? '' : 'hidden'
  if (visible) element.style.transform = rectToQuad(viewport.width, viewport.height, corners)
}

// css matrix3d that maps the rect (0, 0, w, h) onto the quad [tl, tr, br, bl]
// (the usual square-to-quad projective mapping, scaled from the unit square to w x h)
function rectToQuad(w: number, h: number, [p0, p1, p2, p3]: Vector3[]) {
  const dx1 = p1.x - p2.x
  const dx2 = p3.x - p2.x
  const dx3 = p0.x - p1.x + p2.x - p3.x
  const dy1 = p1.y - p2.y
  const dy2 = p3.y - p2.y
  const dy3 = p0.y - p1.y + p2.y - p3.y
  const det = dx1 * dy2 - dx2 * dy1
  const g = (dx3 * dy2 - dx2 * dy3) / det
  const k = (dx1 * dy3 - dx3 * dy1) / det
  const a = p1.x - p0.x + g * p1.x
  const b = p3.x - p0.x + k * p3.x
  const d = p1.y - p0.y + g * p1.y
  const e = p3.y - p0.y + k * p3.y
  const m = [a / w, d / w, 0, g / w, b / h, e / h, 0, k / h, 0, 0, 1, 0, p0.x, p0.y, 0, 1]
  return `matrix3d(${m.map((n) => n.toFixed(6)).join(',')})`
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
