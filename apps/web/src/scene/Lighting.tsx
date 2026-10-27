import { useLayoutEffect, useRef } from 'react'
import type { SpotLight } from 'three'
import { DOWNLIGHTS, MY_SCREEN, PENDANT, SOLO_TABLE, TABLE_HEIGHT, type Vec3 } from './layout'
import { COLOR } from './palette'

// one knob for the whole room. raise it if everything reads too dark on your screen
const BRIGHTNESS = 1

// soft late-afternoon feel: a warm, even base so nothing is murky, with gentle
// pools on top. my pendant is still the brightest spot, the window the only cool light
export function Lighting() {
  const [px, py, pz] = PENDANT.position
  const [sx, sy, sz] = MY_SCREEN.center
  const [nx, ny, nz] = MY_SCREEN.normal
  return (
    <>
      {/* warm wash over the whole room: light from above, wood bounce from below */}
      <hemisphereLight args={[COLOR.skyFill, COLOR.groundFill, 0.9 * BRIGHTNESS]} />
      <ambientLight intensity={0.15 * BRIGHTNESS} color={COLOR.warmLight} />

      {/* hero pendant: brightest pool in the room */}
      <Spot position={[px, py - 0.08, pz]} intensity={16} angle={0.85} shadows />
      {/* spill so the shade and the ceiling above it aren't black */}
      <pointLight position={PENDANT.position} color={COLOR.warmLight} intensity={0.6 * BRIGHTNESS} distance={2.5} decay={2} />

      {DOWNLIGHTS.map((light, i) => (
        <Spot key={i} position={light.position} intensity={light.intensity * 1.4} shadows={light.shadows} />
      ))}

      {/* night coming in through the window */}
      <directionalLight position={[-10, 4, 1]} color={COLOR.nightLight} intensity={0.25 * BRIGHTNESS} />

      {/* screen glow on my face, and on the solo worker's */}
      <pointLight
        position={[sx + nx * 0.12, sy + ny * 0.12, sz + nz * 0.12]}
        color={COLOR.screen}
        intensity={0.8 * BRIGHTNESS}
        distance={1.2}
        decay={2}
      />
      <pointLight
        position={[SOLO_TABLE.position[0], TABLE_HEIGHT + 0.2, SOLO_TABLE.position[2] + 0.25]}
        color={COLOR.screen}
        intensity={0.5 * BRIGHTNESS}
        distance={1.2}
        decay={2}
      />
    </>
  )
}

type SpotProps = { position: Vec3; intensity: number; angle?: number; shadows?: boolean }

// warm cone pointing straight down. fully soft edge so pools blend into the room
function Spot({ position, intensity, angle = 0.8, shadows = false }: SpotProps) {
  const light = useRef<SpotLight>(null!)
  const [x, , z] = position

  useLayoutEffect(() => {
    // spotlights aim at a target object. put it on the floor right below
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
      penumbra={1}
      distance={8}
      decay={2}
      castShadow={shadows}
      shadow-mapSize={[1024, 1024]}
      shadow-normalBias={0.02}
    />
  )
}
