import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, InstancedMesh, Matrix4, QuadraticBezierCurve3, Vector3 } from 'three'
import { EAST, Flat, LEVEL, NIGHT, NightMaterial, PARK_SOUTH, RAIN, RAIN_ZONES, SOUTH, glowTexture } from './OutsideKit'
import { GLOW } from './palette'
import { Park } from './Park'
import { seeded } from './primitives'

// the rainy night outside: a narrow street past the window with a park across it
// (Park.tsx), and a street past the door that runs on along the park's south edge,
// lined with shops. the two streets meet at a corner. shared pieces are in OutsideKit

// a little bus stop on the strip between the street and the park, facing the street
const BUS_STOP = { x: 13.8, z: 4.2 }

export function Outside() {
  return (
    <group>
      <Streets />
      <SouthShops />
      <UtilityPoles />
      <BusStop />
      <Park />
      <Skyline />
      <Rain />
    </group>
  )
}

function Streets() {
  const { walk, road, zFrom } = EAST
  const slab = 0.2
  const corner = SOUTH.walk.to // sidewalks and curbs along the east street stop here
  const curbHeight = LEVEL.walk - LEVEL.road + 0.1
  const curbY = (LEVEL.walk + LEVEL.road - 0.1) / 2
  const southX = (SOUTH.xFrom + SOUTH.xTo) / 2
  const southWidth = SOUTH.xTo - SOUTH.xFrom
  const walkX = (walk.from + walk.to) / 2
  const walkWidth = walk.to - walk.from
  const eastRoadTo = SOUTH.road.from // the east street ends at the south street
  return (
    <group>
      {/* east: sidewalk along the cafe with a joint every meter, curb, the narrow
          street with white edge lines, then the curb at the park */}
      <Flat position={[walkX, LEVEL.walk - slab / 2, (zFrom + corner) / 2]} size={[walkWidth, slab, corner - zFrom]} color={NIGHT.walk} />
      {Array.from({ length: Math.floor(corner - zFrom) }, (_, k) => (
        <Flat key={k} position={[walkX, LEVEL.walk + 0.001, zFrom + k + 1]} size={[walkWidth, 0.004, 0.02]} color={NIGHT.joint} />
      ))}
      <Flat position={[(walk.to + road.from) / 2, curbY, (zFrom + corner) / 2]} size={[road.from - walk.to, curbHeight, corner - zFrom]} color={NIGHT.curb} />
      <Flat position={[(road.from + road.to) / 2, LEVEL.road - slab / 2, (zFrom + eastRoadTo) / 2]} size={[road.to - road.from, slab, eastRoadTo - zFrom]} color={NIGHT.road} />
      {[road.from + 0.25, road.to - 0.25].map((x) => (
        <Flat key={x} position={[x, LEVEL.road + 0.002, (zFrom + eastRoadTo) / 2]} size={[0.1, 0.004, eastRoadTo - zFrom]} color={NIGHT.roadLine} />
      ))}
      <Flat position={[(road.to + EAST.park) / 2, curbY, (zFrom + corner) / 2]} size={[EAST.park - road.to, curbHeight, corner - zFrom]} color={NIGHT.curb} />

      {/* south: sidewalk outside the door, and one along the park's edge */}
      <Flat
        position={[(SOUTH.xFrom + walk.from) / 2, LEVEL.walk - slab / 2, (SOUTH.walk.from + corner) / 2]}
        size={[walk.from - SOUTH.xFrom, slab, corner - SOUTH.walk.from]}
        color={NIGHT.walk}
      />
      <Flat
        position={[(EAST.park + SOUTH.xTo) / 2, LEVEL.walk - slab / 2, (PARK_SOUTH + corner) / 2]}
        size={[SOUTH.xTo - EAST.park, slab, corner - PARK_SOUTH]}
        color={NIGHT.walk}
      />
      {/* near curb, with a gap where the east street joins */}
      <Flat position={[(SOUTH.xFrom + road.from) / 2, curbY, (corner + SOUTH.road.from) / 2]} size={[road.from - SOUTH.xFrom, curbHeight, SOUTH.road.from - corner]} color={NIGHT.curb} />
      <Flat position={[(road.to + SOUTH.xTo) / 2, curbY, (corner + SOUTH.road.from) / 2]} size={[SOUTH.xTo - road.to, curbHeight, SOUTH.road.from - corner]} color={NIGHT.curb} />
      {/* the street, far curb and far sidewalk, all the way along */}
      <Flat position={[southX, LEVEL.road - slab / 2, (SOUTH.road.from + SOUTH.road.to) / 2]} size={[southWidth, slab, SOUTH.road.to - SOUTH.road.from]} color={NIGHT.road} />
      <Flat position={[southX, curbY, (SOUTH.road.to + SOUTH.farWalk.from) / 2]} size={[southWidth, curbHeight, SOUTH.farWalk.from - SOUTH.road.to]} color={NIGHT.curb} />
      <Flat
        position={[southX, LEVEL.walk - slab / 2, (SOUTH.farWalk.from + SOUTH.farWalk.to) / 2]}
        size={[southWidth, slab, SOUTH.farWalk.to - SOUTH.farWalk.from]}
        color={NIGHT.walk}
      />
    </group>
  )
}

// shops across the south street, west to east. the bright one at x 0-4 is straight
// across from the door; the rest run on past the park
const SOUTH_SHOPS: { from: number; to: number; kind: 'shutter' | 'warm' | 'bright'; awning?: string }[] = [
  { from: -8, to: -4, kind: 'shutter' },
  { from: -4, to: 0, kind: 'warm', awning: '#7a2e2a' },
  { from: 0, to: 4, kind: 'bright', awning: '#2e4a6b' },
  { from: 4, to: 8, kind: 'warm', awning: '#3f5a3a' },
  { from: 8, to: 12, kind: 'shutter' },
  { from: 12, to: 16, kind: 'warm', awning: '#8a4b23' },
  { from: 16, to: 20, kind: 'warm', awning: '#5a3a6b' },
  { from: 20, to: 24, kind: 'bright', awning: '#2e4a6b' },
  { from: 24, to: 28, kind: 'shutter' },
  { from: 28, to: SOUTH.xTo, kind: 'warm', awning: '#7a2e2a' },
]

function SouthShops() {
  const face = SOUTH.facade
  return (
    <group>
      {SOUTH_SHOPS.map(({ from, to, kind, awning }, i) => {
        const x = (from + to) / 2
        const width = to - from
        const height = 6.5 + Math.floor(seeded(i + 80) * 3) * 1.2
        return (
          <group key={from}>
            <Flat position={[x, LEVEL.walk + height / 2, face + 3]} size={[width, height, 6]} color={NIGHT.building[i % NIGHT.building.length]} />
            {kind === 'shutter' ? (
              <>
                <Flat position={[x, LEVEL.walk + 1.3, face - 0.01]} size={[width - 0.8, 2.6, 0.02]} color={NIGHT.shutter} />
                {Array.from({ length: 12 }, (_, k) => (
                  <Flat key={k} position={[x, LEVEL.walk + 0.15 + k * 0.21, face - 0.025]} size={[width - 0.8, 0.025, 0.006]} color={NIGHT.shutterRib} />
                ))}
              </>
            ) : (
              <>
                {/* dark frame, the lit shop window in front of it */}
                <Flat position={[x, LEVEL.walk + 1.4, face - 0.01]} size={[width - 0.6, 2.4, 0.02]} color={NIGHT.frame} />
                <Flat
                  position={[x, LEVEL.walk + 1.4, face - 0.025]}
                  size={[width - 0.8, 2.2, 0.006]}
                  color={kind === 'warm' ? NIGHT.shopWarm : NIGHT.shopBright}
                />
              </>
            )}
            {/* awning, tilted down toward the street */}
            {awning && <Flat position={[x, LEVEL.walk + 2.85, face - 0.45]} size={[width - 0.4, 0.04, 0.9]} rotation={[-0.3, 0, 0]} color={awning} />}
            {/* apartment windows upstairs */}
            {[x - width / 4, x + width / 4].map((wx, col) => {
              const r = seeded(i * 13 + col + 90)
              const color = r < 0.35 ? NIGHT.windowWarm : r < 0.5 ? NIGHT.windowCool : NIGHT.windowDark
              return <Flat key={col} position={[wx, LEVEL.walk + 4.3, face - 0.01]} size={[1.0, 1.3, 0.02]} color={color} />
            })}
          </group>
        )
      })}
    </group>
  )
}

// wooden-style utility poles along the sidewalk, wires sagging between them
// (none straight in front of the window, where one would read as a stray post)
const POLE = { x: 7.55, height: 7.5, z: [-16, -9, 5.4] }

function UtilityPoles() {
  const armY = LEVEL.walk + POLE.height - 0.35
  const wires = useMemo(() => {
    const curves: QuadraticBezierCurve3[] = []
    for (let i = 0; i < POLE.z.length - 1; i++) {
      for (const dx of [-0.45, 0.45]) {
        const a = new Vector3(POLE.x + dx, armY, POLE.z[i])
        const b = new Vector3(POLE.x + dx, armY, POLE.z[i + 1])
        const middle = a.clone().lerp(b, 0.5)
        middle.y -= 0.6 // sag
        curves.push(new QuadraticBezierCurve3(a, middle, b))
      }
    }
    return curves
  }, [armY])
  return (
    <group>
      {POLE.z.map((z) => (
        <group key={z}>
          <Flat position={[POLE.x, LEVEL.walk + POLE.height / 2, z]} size={[0.16, POLE.height, 0.16]} color={NIGHT.pole} />
          <Flat position={[POLE.x, armY, z]} size={[1.2, 0.1, 0.1]} color={NIGHT.pole} />
        </group>
      ))}
      {/* transformer can on the middle pole */}
      <Flat position={[POLE.x - 0.25, armY - 0.9, POLE.z[1]]} size={[0.3, 0.5, 0.3]} color={NIGHT.metal} />
      {wires.map((curve, i) => (
        <mesh key={i}>
          <tubeGeometry args={[curve, 16, 0.012, 4, false]} />
          <meshBasicMaterial color={NIGHT.wire} fog={false} />
        </mesh>
      ))}
    </group>
  )
}

// a small, open wooden shelter: four posts, a sloped tin roof, a bench and a low back
// rail, with a warm light under the roof. open on all sides so it doesn't wall off
// the park behind it. a round stop sign stands beside it on its north side.
// built facing +z, turned to face the street (-x)
function BusStop() {
  const glow = useMemo(() => glowTexture(), [])
  const posts: [number, number][] = [
    [-0.75, 0.35],
    [0.75, 0.35],
    [-0.75, -0.35],
    [0.75, -0.35],
  ]
  return (
    <group position={[BUS_STOP.x, LEVEL.walk, BUS_STOP.z]} rotation={[0, -Math.PI / 2, 0]}>
      {posts.map(([x, z]) => (
        <mesh key={`${x},${z}`} position={[x, 1.0, z]}>
          <boxGeometry args={[0.07, 2.0, 0.07]} />
          <NightMaterial color={NIGHT.wood} />
        </mesh>
      ))}
      {/* roof, higher at the front, with a trim board along its front edge */}
      <mesh position={[0, 2.06, 0.05]} rotation={[0.12, 0, 0]}>
        <boxGeometry args={[1.9, 0.05, 1.15]} />
        <NightMaterial color={NIGHT.busRoof} />
      </mesh>
      <mesh position={[0, 2.08, 0.62]}>
        <boxGeometry args={[1.9, 0.12, 0.04]} />
        <NightMaterial color={NIGHT.wood} />
      </mesh>
      {/* bench and back rail */}
      <mesh position={[0, 0.45, -0.15]}>
        <boxGeometry args={[1.3, 0.04, 0.32]} />
        <NightMaterial color={NIGHT.wood} />
      </mesh>
      {[-0.55, 0.55].map((x) => (
        <mesh key={x} position={[x, 0.22, -0.15]}>
          <boxGeometry args={[0.05, 0.44, 0.28]} />
          <NightMaterial color={NIGHT.metal} />
        </mesh>
      ))}
      {[0.75, 1.05].map((y) => (
        <mesh key={y} position={[0, y, -0.35]}>
          <boxGeometry args={[1.5, 0.08, 0.03]} />
          <NightMaterial color={NIGHT.wood} />
        </mesh>
      ))}
      {/* the warm light under the roof, and its pool on the ground */}
      <mesh position={[0, 1.97, 0]}>
        <boxGeometry args={[0.18, 0.05, 0.1]} />
        <meshBasicMaterial color={GLOW.bulb} fog={false} />
      </mesh>
      <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.8, 2.8]} />
        <meshBasicMaterial map={glow} color={NIGHT.warmLight} transparent opacity={0.3} blending={AdditiveBlending} depthWrite={false} fog={false} />
      </mesh>
      {/* stop sign: pole, round sign with a pale band, a timetable board below */}
      {/* clear of the roof's edge (it reaches 0.95 out) */}
      <group position={[-1.35, 0, 0.45]}>
        <mesh position={[0, 1.05, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 2.1, 6]} />
          <NightMaterial color={NIGHT.metal} />
        </mesh>
        <mesh position={[0, 2.0, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.03, 12]} />
          <NightMaterial color={NIGHT.busSign} />
        </mesh>
        <mesh position={[0, 2.0, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.01, 12]} />
          <NightMaterial color={NIGHT.label} />
        </mesh>
        <mesh position={[0, 1.4, 0.03]}>
          <boxGeometry args={[0.22, 0.3, 0.03]} />
          <NightMaterial color={NIGHT.label} />
        </mesh>
        <BusIcon position={[0, 1.42, 0.05]} />
      </group>
    </group>
  )
}

// a black front-view bus on the timetable board, so it reads as a bus stop: body,
// destination strip, two-pane windshield, headlights, mirrors, bumper and wheels.
// the light parts are the board's own color, like cutouts. faces +z like the board
function BusIcon({ position }: { position: [number, number, number] }) {
  const cutout = NIGHT.label
  return (
    <group position={position}>
      {/* body, bumper, wheels, mirrors */}
      <mesh position={[0, 0.005, 0]}>
        <boxGeometry args={[0.13, 0.14, 0.006]} />
        <NightMaterial color={NIGHT.busIcon} />
      </mesh>
      <mesh position={[0, -0.058, 0]}>
        <boxGeometry args={[0.15, 0.022, 0.008]} />
        <NightMaterial color={NIGHT.busIcon} />
      </mesh>
      {[-0.045, 0.045].map((x) => (
        <mesh key={`w${x}`} position={[x, -0.078, 0]}>
          <boxGeometry args={[0.03, 0.03, 0.006]} />
          <NightMaterial color={NIGHT.busIcon} />
        </mesh>
      ))}
      {[-0.074, 0.074].map((x) => (
        <mesh key={`m${x}`} position={[x, 0.018, 0]}>
          <boxGeometry args={[0.014, 0.03, 0.006]} />
          <NightMaterial color={NIGHT.busIcon} />
        </mesh>
      ))}
      {/* destination strip, windshield panes, headlights */}
      <mesh position={[0, 0.054, 0.004]}>
        <boxGeometry args={[0.09, 0.016, 0.004]} />
        <NightMaterial color={cutout} />
      </mesh>
      {[-0.026, 0.026].map((x) => (
        <mesh key={`g${x}`} position={[x, 0.014, 0.004]}>
          <boxGeometry args={[0.044, 0.044, 0.004]} />
          <NightMaterial color={cutout} />
        </mesh>
      ))}
      {[-0.042, 0.042].map((x) => (
        <mesh key={`h${x}`} position={[x, -0.03, 0.004]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.004, 8]} />
          <NightMaterial color={cutout} />
        </mesh>
      ))}
    </group>
  )
}

// a row of distant buildings past the park, so the view ends in a city, not a void
function Skyline() {
  const x = 42
  const blocks = Array.from({ length: 11 }, (_, i) => ({ z: -28 + i * 5, height: 9 + seeded(i + 200) * 14 }))
  return (
    <group>
      {blocks.map(({ z, height }, i) => (
        <group key={z}>
          <Flat position={[x, height / 2, z]} size={[6, height, 4.6]} color={NIGHT.building[(i + 1) % NIGHT.building.length]} />
          {[3, 6, 9, 12, 15, 18].filter((y) => y < height - 1).flatMap((y, row) =>
            [z - 1, z + 1].map((wz, col) => {
              const r = seeded(i * 37 + row * 5 + col + 210)
              if (r > 0.3) return null
              return <Flat key={`${row}-${col}`} position={[x - 3.01, y, wz]} size={[0.02, 1.1, 0.8]} color={r < 0.2 ? NIGHT.windowWarm : NIGHT.windowCool} />
            }),
          )}
        </group>
      ))}
    </group>
  )
}

// --- falling rain (how heavy it is: RAIN_ZONES in OutsideKit)
function makeDrops() {
  const total = RAIN_ZONES.reduce((n, zone) => n + zone.count, 0)
  const x = new Float32Array(total)
  const y = new Float32Array(total)
  const z = new Float32Array(total)
  const speed = new Float32Array(total)
  let i = 0
  for (const zone of RAIN_ZONES) {
    for (let k = 0; k < zone.count; k++, i++) {
      x[i] = zone.x[0] + seeded(i * 3.1) * (zone.x[1] - zone.x[0])
      z[i] = zone.z[0] + seeded(i * 5.7 + 1) * (zone.z[1] - zone.z[0])
      y[i] = RAIN.bottom + seeded(i * 7.3 + 2) * (RAIN.top - RAIN.bottom)
      speed[i] = RAIN.speed[0] + seeded(i * 9.1 + 3) * (RAIN.speed[1] - RAIN.speed[0])
    }
  }
  return { x, y, z, speed }
}

// one instanced mesh for every streak. each frame only their heights change, written
// straight into the instance matrices
function Rain() {
  const mesh = useRef<InstancedMesh>(null!)
  const drops = useMemo(() => makeDrops(), [])
  const count = drops.y.length

  useLayoutEffect(() => {
    const matrix = new Matrix4()
    for (let i = 0; i < count; i++) {
      mesh.current.setMatrixAt(i, matrix.makeTranslation(drops.x[i], drops.y[i], drops.z[i]))
    }
    mesh.current.instanceMatrix.needsUpdate = true
  }, [drops, count])

  useFrame((_, delta) => {
    const step = Math.min(delta, 0.1) // don't jump after a hidden tab comes back
    const span = RAIN.top - RAIN.bottom
    const matrices = mesh.current.instanceMatrix.array
    for (let i = 0; i < count; i++) {
      let y = drops.y[i] - drops.speed[i] * step
      if (y < RAIN.bottom) y += span
      drops.y[i] = y
      matrices[i * 16 + 13] = y // the y of the translation
    }
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    // keyed by count: a new count remounts the mesh, so the placing above always runs on it
    <instancedMesh key={count} ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <boxGeometry args={[0.007, 0.22, 0.007]} />
      <meshBasicMaterial color={NIGHT.rain} transparent opacity={0.4} depthWrite={false} fog={false} />
    </instancedMesh>
  )
}
