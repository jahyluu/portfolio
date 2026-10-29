import { useLayoutEffect, useRef } from 'react'
import type { SpotLight } from 'three'
import { DOWNLIGHTS, MY_SCREEN, PENDANT, type Vec3 } from './layout'
import { COLOR } from './palette'
import { LOW_POWER } from '../quality'

// master brightness, bump up if the room looks too dark
export const BRIGHTNESS = 1

// warm even base + pools from the downlights. my table is the brightest spot,
// the window is the only cool light
export function Lighting() {
  const [px, py, pz] = PENDANT.position
  const [sx, sy, sz] = MY_SCREEN.center
  const [nx, ny, nz] = MY_SCREEN.normal
  return (
    <>
      {/* sky/ground fill, ground color fakes bounce off the wood floor */}
      <hemisphereLight args={[COLOR.skyFill, COLOR.groundFill, 0.9 * BRIGHTNESS]} />
      <ambientLight intensity={0.15 * BRIGHTNESS} color={COLOR.warmLight} />

      {/* over my table, no fixture */}
      <Spot position={[px, py - 0.08, pz]} intensity={16} angle={0.85} shadows />

      {DOWNLIGHTS.map((light, i) => (
        <Spot key={i} position={light.position} intensity={light.intensity * 1.4} shadows={light.shadows} />
      ))}

      {/* moonlight through the east window */}
      <directionalLight position={[10, 4, 0.3]} color={COLOR.nightLight} intensity={0.25 * BRIGHTNESS} />

      {/* screen glow on my face */}
      <pointLight
        position={[sx + nx * 0.12, sy + ny * 0.12, sz + nz * 0.12]}
        color={COLOR.screen}
        intensity={0.8 * BRIGHTNESS}
        distance={1.2}
        decay={2}
      />
    </>
  )
}

type SpotProps = { position: Vec3; intensity: number; angle?: number; penumbra?: number; shadows?: boolean }

// straight-down spot, penumbra 1 so the edge blends out
function Spot({ position, intensity, angle = 0.8, penumbra = 1, shadows = false }: SpotProps) {
  const light = useRef<SpotLight>(null!)
  const [x, , z] = position

  useLayoutEffect(() => {
    // target goes on the floor directly below
    light.current.target.position.set(x, 0, z)
    light.current.target.updateMatrixWorld()
  }, [x, z])

  return (
    <spotLight
      ref={light}
      position={position}
      color={COLOR.warmLight}
      intensity={intensity * BRIGHTNESS}
      angle={angle}
      penumbra={penumbra}
      distance={8}
      decay={2}
      castShadow={shadows}
      shadow-mapSize={LOW_POWER ? [512, 512] : [1024, 1024]}
      shadow-normalBias={0.02}
    />
  )
}
