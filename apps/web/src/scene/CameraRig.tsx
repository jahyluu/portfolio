import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils, PerspectiveCamera, Vector3 } from 'three'
import { scroll, scrollToProgress } from '../scroll'
import { CAMERA_PATH, MY_SCREEN, SCREEN_SIZE, type Vec3 } from './layout'

// how fast the camera catches up to the scroll. lower = floatier
const SMOOTHING = 5
// < 1 so the display slightly overfills the window and the edges never show
const FILL = 0.97
// dev only: 1-5 jumps to 0, 25, 50, 75, 100% of the scroll
const PREVIEW_STOPS = [0, 0.25, 0.5, 0.75, 1]

// scroll-driven camera on the spiral from layout.ts
export function CameraRig() {
  const camera = useThree((state) => state.camera) as PerspectiveCamera
  const width = useThree((state) => state.size.width)
  const height = useThree((state) => state.size.height)
  const smoothed = useRef(scroll.progress)

  const spiral = useMemo(
    () => makeSpiral(fullScreenPosition(camera.fov, width / height)),
    [camera.fov, width, height],
  )

  const position = useMemo(() => new Vector3(), [])
  const target = useMemo(() => new Vector3(), [])

  useFrame((_, delta) => {
    smoothed.current = MathUtils.damp(smoothed.current, scroll.progress, SMOOTHING, delta)
    spiral(smoothed.current, position, target)
    camera.position.copy(position)
    camera.lookAt(target)
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

// spiral centered on my screen, from the corner to `end`.
// returns a fn that fills in camera position + look-at point for t = 0-1
function makeSpiral(end: Vec3) {
  const [cx, , cz] = MY_SCREEN.center
  const { start, startTarget, startPan, turnEase, dropEase } = CAMERA_PATH

  const startAngle = Math.atan2(start[0] - cx, start[2] - cz)
  let endAngle = Math.atan2(end[0] - cx, end[2] - cz)
  // go around the window side, not the counter side
  while (endAngle > startAngle) endAngle -= Math.PI * 2

  const startRadius = Math.hypot(start[0] - cx, start[2] - cz)
  const endRadius = Math.hypot(end[0] - cx, end[2] - cz)
  // opening look-at point, nudged sideways by startPan (to the camera's right)
  const forward = new Vector3(startTarget[0] - start[0], 0, startTarget[2] - start[2]).normalize()
  const right = new Vector3(-forward.z, 0, forward.x)
  const lookFrom = toVector(startTarget).addScaledVector(right, startPan)
  const lookTo = toVector(MY_SCREEN.center)

  return (t: number, position: Vector3, target: Vector3) => {
    const angle = startAngle + (endAngle - startAngle) * (1 - (1 - t) ** turnEase)
    // log spiral: shrinks by the same ratio every step, so the end never rushes
    const radius = startRadius * (endRadius / startRadius) ** t
    const y = end[1] + (start[1] - end[1]) * (1 - t) ** dropEase
    position.set(cx + radius * Math.sin(angle), y, cz + radius * Math.cos(angle))
    // gaze slides from my table to my screen over the first half
    target.lerpVectors(lookFrom, lookTo, MathUtils.smoothstep(t, 0, 0.5))
  }
}

// camera spot straight in front of my display where it covers the whole window.
// wide window -> limited by display width, tall window -> by its height
function fullScreenPosition(fovDegrees: number, aspect: number): Vec3 {
  const visibleHeight = Math.min(SCREEN_SIZE.height, SCREEN_SIZE.width / aspect) * FILL
  const distance = visibleHeight / (2 * Math.tan(MathUtils.degToRad(fovDegrees) / 2))
  const [cx, cy, cz] = MY_SCREEN.center
  const [nx, ny, nz] = MY_SCREEN.normal
  return [cx + nx * distance, cy + ny * distance, cz + nz * distance]
}
