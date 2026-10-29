import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils, PerspectiveCamera, Vector3 } from 'three'
import { updateHandoff } from '../handoff'
import { deviceFor, screenRect, type Device } from '../desktop/screen'
import { scroll, startOnDesktop } from '../scroll'
import { CAMERA_PATH, MY_PHONE, MY_SCREEN, PHONE_SCREEN, SCREEN_SIZE, type Vec3 } from './layout'

// lower = floatier
const SMOOTHING = 5
// minimum speed (progress/sec). damping alone never quite reaches the target, this makes
// the camera actually land so the desktop lines up
const MIN_SPEED = 0.03
// phone mode: turn off the spiral toward my phone from here (scroll progress)
const PHONE_TURN_FROM = 0.6
const UP = new Vector3(0, 1, 0)
// camera follows the spiral in layout.ts based on scroll
export function CameraRig() {
  const camera = useThree((state) => state.camera) as PerspectiveCamera
  const width = useThree((state) => state.size.width)
  const height = useThree((state) => state.size.height)
  // #desktop starts at the end instead of spiraling in from the cafe
  const smoothed = useRef(startOnDesktop ? 1 : scroll.progress)

  const device = deviceFor(width, height)
  const spiral = useMemo(
    () => makeSpiral(fullScreenPosition(camera.fov, width, height, 'laptop')),
    [camera.fov, width, height],
  )
  // phone end pose. up = the phone's top so it reads upright
  const phoneEnd = useMemo(
    () => device === 'phone' ? { position: toVector(fullScreenPosition(camera.fov, width, height, 'phone')), target: toVector(MY_PHONE.center), up: toVector(MY_PHONE.top) } : null,
    [device, camera.fov, width, height],
  )

  const position = useMemo(() => new Vector3(), [])
  const target = useMemo(() => new Vector3(), [])

  useFrame((_, delta) => {
    smoothed.current = easeToward(smoothed.current, scroll.progress, delta)
    spiral(smoothed.current, position, target)
    camera.up.copy(UP)
    if (phoneEnd) {
      const turn = MathUtils.smootherstep(smoothed.current, PHONE_TURN_FROM, 1)
      position.lerp(phoneEnd.position, turn)
      // aim at the phone early or it swings in from the edge
      target.lerp(phoneEnd.target, MathUtils.smootherstep(smoothed.current, PHONE_TURN_FROM, 0.85))
      camera.up.lerp(phoneEnd.up, turn).normalize()
    }
    camera.position.copy(position)
    camera.lookAt(target)
    updateHandoff(smoothed.current)
  })

  return null
}

function easeToward(current: number, target: number, delta: number) {
  const gap = target - current
  const minStep = MIN_SPEED * delta
  if (Math.abs(gap) <= minStep) return target
  const eased = MathUtils.damp(current, target, SMOOTHING, delta)
  return Math.abs(eased - current) < minStep ? current + Math.sign(gap) * minStep : eased
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


// final camera position: square on to the screen, at the distance where the screen is
// exactly as tall as the desktop rect
function fullScreenPosition(fovDegrees: number, viewportWidth: number, viewportHeight: number, device: Device): Vec3 {
  const [screenHeight, { center, normal }] = device === 'phone' ? [PHONE_SCREEN.height, MY_PHONE] : [SCREEN_SIZE.height, MY_SCREEN]
  const visible = (screenHeight * viewportHeight) / screenRect(viewportWidth, viewportHeight, device).height
  const distance = visible / (2 * Math.tan(MathUtils.degToRad(fovDegrees) / 2))
  const [cx, cy, cz] = center
  const [nx, ny, nz] = normal
  return [cx + nx * distance, cy + ny * distance, cz + nz * distance]
}
