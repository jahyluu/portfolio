import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, InstancedMesh, Object3D } from 'three'
import { BOUNDS, CEILING, DOOR, DOWNLIGHTS, ROOM, WAINSCOT_HEIGHT, WINDOW } from './layout'
import { COLOR, GLOW } from './palette'
import { Box } from './primitives'

// the shell: plank floor, paneled walls, beamed ceiling, window, door
export function Room() {
  return (
    <group>
      <Floor />
      <Walls />
      <Ceiling />
      <Window />
      <Door />
    </group>
  )
}

const PLANK_WIDTH = 0.16
const PLANK_LENGTH = 1.2
// how far each row's joints shift along, as a fraction of a plank. cycles every 5
// rows (0, .4, .8, .2, .6) so the joints never line up into a diagonal staircase
const ROW_STAGGER = 0.4
const GAP = 0.006
const WALL_THICKNESS = 0.1

// planks run east-west, staggered row to row like a real floor.
// one instanced mesh = one draw call for all of them
function Floor() {
  const { width, centerZ, depth } = ROOM
  const planks = useMemo(() => layOutPlanks(), [])
  const mesh = useRef<InstancedMesh>(null!)

  useLayoutEffect(() => {
    const dummy = new Object3D()
    const color = new Color()
    planks.forEach((plank, i) => {
      dummy.position.set(plank.x, -0.02, plank.z)
      dummy.scale.set(plank.length / PLANK_LENGTH, 1, 1)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)
      mesh.current.setColorAt(i, color.set(plank.color))
    })
    mesh.current.instanceMatrix.needsUpdate = true
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true
  }, [planks])

  return (
    <group>
      {/* dark underlay that shows in the gaps between planks */}
      <Box position={[0, -0.07, centerZ]} size={[width, 0.06, depth]} color={COLOR.floorBase} castShadow={false} />
      <instancedMesh ref={mesh} args={[undefined, undefined, planks.length]} receiveShadow>
        {/* full-length plank. ones cut short at the walls are scaled down */}
        <boxGeometry args={[PLANK_LENGTH - GAP, 0.04, PLANK_WIDTH - GAP]} />
        <meshStandardMaterial flatShading roughness={0.75} />
      </instancedMesh>
    </group>
  )
}

type Plank = { x: number; z: number; length: number; color: string }

function layOutPlanks(): Plank[] {
  const { minX, maxX, minZ } = BOUNDS
  const rows = Math.ceil(ROOM.depth / PLANK_WIDTH)
  const planks: Plank[] = []
  for (let row = 0; row < rows; row++) {
    const z = minZ + PLANK_WIDTH * (row + 0.5)
    const offset = ((row * ROW_STAGGER) % 1) * PLANK_LENGTH
    // start one plank early so the first one gets cut at the west wall
    for (let start = minX - offset, i = 0; start < maxX; start += PLANK_LENGTH, i++) {
      const from = Math.max(start, minX)
      const to = Math.min(start + PLANK_LENGTH, maxX)
      if (to - from < 0.05) continue
      // pseudo-random shade per plank, same every load
      const pick = Math.floor(Math.abs(Math.sin(row * 12.9898 + i * 78.233) * 43758.5453)) % COLOR.floorPlanks.length
      planks.push({ x: (from + to) / 2, z, length: to - from, color: COLOR.floorPlanks[pick] })
    }
  }
  return planks
}

function Walls() {
  const { minX, maxX, minZ, maxZ } = BOUNDS
  const { width, depth, centerZ } = ROOM
  const t = WALL_THICKNESS
  return (
    <group>
      <Wall center={[0, minZ - t / 2]} footprint={[width, t]} />
      <Wall center={[0, maxZ + t / 2]} footprint={[width, t]} />
      <Wall center={[minX - t / 2, centerZ]} footprint={[t, depth]} />
      <Wall center={[maxX + t / 2, centerZ]} footprint={[t, depth]} />
    </group>
  )
}

type WallProps = { center: [x: number, z: number]; footprint: [x: number, z: number] }

// dark wood below, plaster above, a rail where they meet.
// the wood and rail stick out a little past the plaster
function Wall({ center: [x, z], footprint: [sx, sz] }: WallProps) {
  const h = ROOM.height
  const w = WAINSCOT_HEIGHT
  return (
    <group>
      <Box position={[x, w / 2, z]} size={[sx + 0.04, w, sz + 0.04]} color={COLOR.wainscot} castShadow={false} />
      <Box position={[x, w + (h - w) / 2, z]} size={[sx, h - w, sz]} color={COLOR.plaster} castShadow={false} />
      <Box position={[x, w, z]} size={[sx + 0.07, 0.05, sz + 0.07]} color={COLOR.trim} castShadow={false} />
    </group>
  )
}

function Ceiling() {
  const { width, depth, height, centerZ } = ROOM
  const { beamDepth, beamWidth, beamsX, beamsZ } = CEILING
  const beamY = height - beamDepth / 2
  return (
    <group>
      <Box position={[0, height + 0.05, centerZ]} size={[width, 0.1, depth]} color={COLOR.ceilingPanel} castShadow={false} />
      {beamsX.map((x) => (
        <Box key={`x${x}`} position={[x, beamY, centerZ]} size={[beamWidth, beamDepth, depth]} color={COLOR.beam} castShadow={false} />
      ))}
      {beamsZ.map((z) => (
        <Box key={`z${z}`} position={[0, beamY, z]} size={[width, beamDepth, beamWidth]} color={COLOR.beam} castShadow={false} />
      ))}
      {/* the visible lamp disk for each downlight. the light itself is in Lighting */}
      {DOWNLIGHTS.map(({ position: [x, , z] }, i) => (
        <mesh key={i} position={[x, height - 0.005, z]}>
          <cylinderGeometry args={[0.06, 0.06, 0.01, 12]} />
          <meshBasicMaterial color={GLOW.downlight} />
        </mesh>
      ))}
    </group>
  )
}

// placeholder night until the window commit (clear glass, street, rain)
function Window() {
  const width = WINDOW.zTo - WINDOW.zFrom
  const height = WINDOW.yTo - WINDOW.yFrom
  return (
    <mesh
      position={[BOUNDS.minX + 0.01, WINDOW.yFrom + height / 2, WINDOW.zFrom + width / 2]}
      rotation={[0, Math.PI / 2, 0]}
    >
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial color={COLOR.night} />
    </mesh>
  )
}

function Door() {
  const width = DOOR.xTo - DOOR.xFrom
  return (
    <Box
      position={[DOOR.xFrom + width / 2, DOOR.height / 2, BOUNDS.maxZ - 0.03]}
      size={[width, DOOR.height, 0.06]}
      color={COLOR.door}
      castShadow={false}
    />
  )
}
