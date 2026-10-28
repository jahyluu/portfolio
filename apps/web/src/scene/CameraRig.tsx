import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils, PerspectiveCamera, Vector3 } from 'three'
import { updateHandoff, type ScreenRegion } from '../handoff'
import { scroll, scrollToProgress } from '../scroll'
import { CAMERA_PATH, LAPTOP, MY_SCREEN, SCREEN_SIZE, type Vec3 } from './layout'

// lower = floatier
const SMOOTHING = 5
// < 1 so the screen overfills the viewport and the bezel never shows
const FILL = 0.97
// dev: keys 1-5 jump to these
const PREVIEW_STOPS = [0, 0.25, 0.5, 0.75, 1]

// camera follows the spiral in layout.ts based on scroll
export function CameraRig() {
  const camera = useThree((state) => state.camera) as PerspectiveCamera
  const width = useThree((state) => state.size.width)
  const height = useThree((state) => state.size.height)
  const smoothed = useRef(scroll.progress)

  const spiral = useMemo(
    () => makeSpiral(fullScreenPosition(camera.fov, width / height)),
    [camera.fov, width, height],
  )

  // the part of my screen that ends up filling the window, where the desktop gets drawn
  const region = useMemo(() => screenRegion(width / height), [width, height])

  const position = useMemo(() => new Vector3(), [])
  const target = useMemo(() => new Vector3(), [])

  useFrame((_, delta) => {
    smoothed.current = MathUtils.damp(smoothed.current, scroll.progress, SMOOTHING, delta)
    spiral(smoothed.current, position, target)
    camera.position.copy(position)
    camera.lookAt(target)
    camera.updateMatrixWorld()
    updateHandoff(smoothed.current, camera, region, { width, height })
  })

  useEffect(() => {
    if (!import.meta.env.DEV) return
    const onKey = (event: KeyboardEvent) => {
      const stop = PREVIEW_STOPS[Number(event.key) - 1]
      if (stop !== undefined) scrollToProgress(stop)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return null
}

function toVector([x, y, z]: Vec3) {
  return new Vector3(x, y, z)
}

// spiral around my screen from CAMERA_PATH.start to `end`.
// returned fn writes position + look-at for t in [0, 1]
function makeSpiral(end: Vec3) {
  const [cx, , cz] = MY_SCREEN.center
  const { start, startTarget, startPan, turnEase, dropEase } = CAMERA_PATH

  const startAngle = Math.atan2(start[0] - cx, start[2] - cz)
  let endAngle = Math.atan2(end[0] - cx, end[2] - cz)
  // go around the window side
  while (endAngle > startAngle) endAngle -= Math.PI * 2

  const startRadius = Math.hypot(start[0] - cx, start[2] - cz)
  const endRadius = Math.hypot(end[0] - cx, end[2] - cz)
  // startPan shifts the opening look-at to the camera's right
  const forward = new Vector3(startTarget[0] - start[0], 0, startTarget[2] - start[2]).normalize()
  const right = new Vector3(-forward.z, 0, forward.x)
  const lookFrom = toVector(startTarget).addScaledVector(right, startPan)
  const lookTo = toVector(MY_SCREEN.center)

  return (t: number, position: Vector3, target: Vector3) => {
    const angle = startAngle + (endAngle - startAngle) * (1 - (1 - t) ** turnEase)
    // log spiral, constant shrink ratio so it doesn't speed up at the end
    const radius = startRadius * (endRadius / startRadius) ** t
    const y = end[1] + (start[1] - end[1]) * (1 - t) ** dropEase
    position.set(cx + radius * Math.sin(angle), y, cz + radius * Math.cos(angle))
    // look-at moves from the table to the screen over the first half
    target.lerpVectors(lookFrom, lookTo, MathUtils.smoothstep(t, 0, 0.5))
  }
}

// how much of the screen is in view at the end, in meters. same shape as the window.
// wide windows are limited by the screen's width, tall ones by its height
function visibleHeight(aspect: number) {
  return Math.min(SCREEN_SIZE.height, SCREEN_SIZE.width / aspect) * FILL
}

function screenRegion(aspect: number): ScreenRegion {
  const height = visibleHeight(aspect)
  return {
    center: toVector(MY_SCREEN.center),
    // facing the screen you look along +z, so its right is -x
    right: new Vector3(-1, 0, 0),
    up: new Vector3(0, Math.cos(LAPTOP.tilt), Math.sin(LAPTOP.tilt)),
    normal: toVector(MY_SCREEN.normal),
    width: height * aspect,
    height,
  }
}

// distance where the screen fills the viewport
function fullScreenPosition(fovDegrees: number, aspect: number): Vec3 {
  const visible = visibleHeight(aspect)
  const distance = visible / (2 * Math.tan(MathUtils.degToRad(fovDegrees) / 2))
  const [cx, cy, cz] = MY_SCREEN.center
  const [nx, ny, nz] = MY_SCREEN.normal
  return [cx + nx * distance, cy + ny * distance, cz + nz * distance]
}
