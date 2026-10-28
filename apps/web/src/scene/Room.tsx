import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, InstancedMesh, Object3D } from 'three'
import { BOUNDS, CEILING, DOOR, DOWNLIGHTS, ROOM, WAINSCOT_HEIGHT, WINDOW, type Vec3 } from './layout'
import { COLOR, GLOW } from './palette'
import { Box } from './primitives'
import { RainGlass } from './RainGlass'

// floor, walls, ceiling, window, door. outside is in Outside.tsx
export function Room() {
  return (
    <group>
      <Floor />
      <Walls />
      <Ceiling />
      <WindowFrame />
      <Door />
    </group>
  )
}

// storefront window grid
const WINDOW_GRID = { bays: 4, knee: 0.45, post: 0.1, depth: 0.08 }

const PLANK_WIDTH = 0.16
const PLANK_LENGTH = 1.2
// per-row joint offset (fraction of a plank). 5-row cycle so the joints don't form a diagonal
const ROW_STAGGER = 0.4
const GAP = 0.006
const WALL_THICKNESS = 0.1

// E-W planks, staggered rows, all one instanced mesh
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
      {/* shows through the plank gaps */}
      <Box position={[0, -0.07, centerZ]} size={[width, 0.06, depth]} color={COLOR.floorBase} castShadow={false} />
      <instancedMesh ref={mesh} args={[undefined, undefined, planks.length]} receiveShadow>
        {/* full plank, the ones at the walls get scaled down */}
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
    // start a plank early so the first one is cut by the wall
    for (let start = minX - offset, i = 0; start < maxX; start += PLANK_LENGTH, i++) {
      const from = Math.max(start, minX)
      const to = Math.min(start + PLANK_LENGTH, maxX)
      if (to - from < 0.05) continue
      // random shade per plank
      const pick = Math.floor(Math.abs(Math.sin(row * 12.9898 + i * 78.233) * 43758.5453)) % COLOR.floorPlanks.length
      planks.push({ x: (from + to) / 2, z, length: to - from, color: COLOR.floorPlanks[pick] })
    }
  }
  return planks
}

// opening in a wall. from/to = along the wall, bottom/top = height
type Opening = { from: number; to: number; bottom: number; top: number }

function Walls() {
  const { minX, maxX, minZ, maxZ } = BOUNDS
  const t = WALL_THICKNESS
  const storefront: Opening = { from: WINDOW.zFrom, to: WINDOW.zTo, bottom: WINDOW_GRID.knee, top: WINDOW.yTo }
  const door: Opening = { from: DOOR.xFrom, to: DOOR.xTo, bottom: 0, top: DOOR.height }
  return (
    <group>
      <WallRun along="x" at={minZ - t / 2} from={minX} to={maxX} />
      <WallRun along="x" at={maxZ + t / 2} from={minX} to={maxX} openings={[door]} />
      <WallRun along="z" at={minX - t / 2} from={minZ} to={maxZ} />
      <WallRun along="z" at={maxX + t / 2} from={minZ} to={maxZ} openings={[storefront]} />
    </group>
  )
}

type Piece = { from: number; to: number; bottom: number; top: number }
type RunProps = { along: 'x' | 'z'; at: number; from: number; to: number; openings?: Opening[] }

// builds a wall out of pieces around its openings.
// along = axis it runs on, at = position on the other axis
function WallRun({ along, at, from, to, openings = [] }: RunProps) {
  const pieces: Piece[] = []
  let cursor = from
  for (const o of [...openings].sort((a, b) => a.from - b.from)) {
    if (o.from > cursor) pieces.push({ from: cursor, to: o.from, bottom: 0, top: ROOM.height })
    if (o.bottom > 0) pieces.push({ from: o.from, to: o.to, bottom: 0, top: o.bottom })
    pieces.push({ from: o.from, to: o.to, bottom: o.top, top: ROOM.height })
    cursor = o.to
  }
  if (to > cursor) pieces.push({ from: cursor, to, bottom: 0, top: ROOM.height })
  return (
    <group>
      {pieces.map((piece, i) => (
        <WallPiece key={i} along={along} at={at} piece={piece} capStart={piece.from === from} capEnd={piece.to === to} />
      ))}
    </group>
  )
}

type PieceProps = { along: 'x' | 'z'; at: number; piece: Piece; capStart: boolean; capEnd: boolean }

// wainscot + rail + plaster. caps = extend past the ends to wrap the corners
// (skipped at openings since the frame covers it)
function WallPiece({ along, at, piece: { from, to, bottom, top }, capStart, capEnd }: PieceProps) {
  const w = WAINSCOT_HEIGHT
  const slab = (y0: number, y1: number, grow: number, color: string) => {
    const a = from - (capStart ? grow / 2 : 0)
    const b = to + (capEnd ? grow / 2 : 0)
    const y = (y0 + y1) / 2
    const thickness = WALL_THICKNESS + grow
    const position: Vec3 = along === 'x' ? [(a + b) / 2, y, at] : [at, y, (a + b) / 2]
    const size: Vec3 = along === 'x' ? [b - a, y1 - y0, thickness] : [thickness, y1 - y0, b - a]
    return <Box position={position} size={size} color={color} castShadow={false} />
  }
  return (
    <group>
      {bottom < w && slab(bottom, Math.min(top, w), 0.04, COLOR.wainscot)}
      {top > w && slab(Math.max(bottom, w), top, 0, COLOR.plaster)}
      {bottom < w - 0.025 && top > w + 0.025 && slab(w - 0.025, w + 0.025, 0.07, COLOR.trim)}
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
      {/* downlight disks, the actual lights are in Lighting.tsx */}
      {DOWNLIGHTS.map(({ position: [x, , z] }, i) => (
        <mesh key={i} position={[x, height - 0.005, z]}>
          <cylinderGeometry args={[0.06, 0.06, 0.01, 12]} />
          <meshBasicMaterial color={GLOW.downlight} />
        </mesh>
      ))}
    </group>
  )
}

function WindowFrame() {
  const { zFrom, zTo, yTo } = WINDOW
  const { bays, knee, post, depth } = WINDOW_GRID
  const x = BOUNDS.maxX - 0.05 - depth / 2
  const width = zTo - zFrom
  const zMid = (zFrom + zTo) / 2
  const bayWidth = width / bays
  const glassHeight = yTo - knee
  const glassMid = knee + glassHeight / 2
  return (
    <group>
      {/* knee panel + sill */}
      <Box position={[x, knee / 2, zMid]} size={[depth, knee, width]} color={COLOR.wainscot} castShadow={false} />
      <Box position={[x - 0.02, knee, zMid]} size={[depth + 0.04, 0.05, width + 0.04]} color={COLOR.windowFrame} castShadow={false} />
      {/* head rail */}
      <Box position={[x, yTo - post / 2, zMid]} size={[depth, post, width]} color={COLOR.windowFrame} castShadow={false} />
      {/* posts */}
      {Array.from({ length: bays + 1 }, (_, b) => (
        <Box key={`post${b}`} position={[x, glassMid, zFrom + b * bayWidth]} size={[depth, glassHeight, post]} color={COLOR.windowFrame} castShadow={false} />
      ))}
      <RainGlass position={[x, glassMid, zMid]} rotationY={-Math.PI / 2} width={width} height={glassHeight} />
    </group>
  )
}

// glass door in the south wall
const DOOR_GLASS = { side: 0.1, top: 0.12, bottom: 0.2 }
const DOOR_DEPTH = 0.05

function Door() {
  const { xFrom, xTo, height } = DOOR
  const { side, top, bottom } = DOOR_GLASS
  const width = xTo - xFrom
  const x = xFrom + width / 2
  const z = BOUNDS.maxZ + WALL_THICKNESS / 2
  const roomFace = z - DOOR_DEPTH / 2
  const glassWidth = width - side * 2
  const glassHeight = height - top - bottom
  const trimZ = BOUNDS.maxZ - 0.01
  return (
    <group>
      {/* stiles and rails */}
      <Box position={[xFrom + side / 2, height / 2, z]} size={[side, height, DOOR_DEPTH]} color={COLOR.windowFrame} castShadow={false} />
      <Box position={[xTo - side / 2, height / 2, z]} size={[side, height, DOOR_DEPTH]} color={COLOR.windowFrame} castShadow={false} />
      <Box position={[x, height - top / 2, z]} size={[glassWidth, top, DOOR_DEPTH]} color={COLOR.windowFrame} castShadow={false} />
      <Box position={[x, bottom / 2, z]} size={[glassWidth, bottom, DOOR_DEPTH]} color={COLOR.windowFrame} castShadow={false} />
      <RainGlass position={[x, bottom + glassHeight / 2, z]} rotationY={Math.PI} width={glassWidth} height={glassHeight} />
      {/* trim + threshold */}
      <Box position={[xFrom - 0.03, (height + 0.06) / 2, trimZ]} size={[0.06, height + 0.06, 0.054]} color={COLOR.trim} castShadow={false} />
      <Box position={[xTo + 0.03, (height + 0.06) / 2, trimZ]} size={[0.06, height + 0.06, 0.054]} color={COLOR.trim} castShadow={false} />
      <Box position={[x, height + 0.03, trimZ]} size={[width + 0.12, 0.06, 0.054]} color={COLOR.trim} castShadow={false} />
      <Box position={[x, 0.005, z]} size={[width, 0.03, WALL_THICKNESS]} color={COLOR.trim} castShadow={false} />
      {/* pull handle */}
      <Box position={[xTo - side / 2, 1.0, roomFace - 0.03]} size={[0.025, 0.25, 0.025]} color={COLOR.brass} />
    </group>
  )
}
