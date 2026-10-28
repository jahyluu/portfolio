import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CanvasTexture, SRGBColorSpace, type Mesh, type MeshBasicMaterial } from 'three'
import { Croissant } from './Bar'
import {
  CAMERA_PATH,
  GROUP_SEATS,
  GROUP_TABLE,
  MY_TABLE,
  SLEEPER_SEAT,
  SLEEPER_TABLE,
  STUDY_SEATS,
  STUDY_TABLE,
  TABLE_HEIGHT,
  WEST_TABLES,
  WINDOW_TABLE,
  WINDOW_TABLES,
  type Vec3,
} from './layout'
import { COLOR } from './palette'
import { Cylinder, seeded } from './primitives'

// small things on the tables: coffee (with steam on mine), pastries, the study
// group's papers and notebooks. people, chairs and laptops are in CafeBlockout

export function Tabletops() {
  const [mx, , mz] = MY_TABLE.position
  const wx = WINDOW_TABLE.x
  return (
    <group>
      {/* my table. tart on my left; my coffee is in Me.tsx so I can pick it up */}
      <PastryPlate position={[mx + 0.36, TABLE_HEIGHT, mz - 0.12]} pastry="tart" />

      {/* window booth: a cup in front of everyone sitting there, a shared pastry for the couple */}
      {WINDOW_TABLES.flatMap(({ z, bench, chair }) => [
        bench && <CoffeeCup key={`b${z}`} position={[wx + 0.2, TABLE_HEIGHT, z + 0.2]} rotationY={Math.PI / 2} />,
        chair && <CoffeeCup key={`c${z}`} position={[wx - 0.2, TABLE_HEIGHT, z - 0.2]} rotationY={-Math.PI / 2} />,
      ])}
      <PastryPlate position={[wx, TABLE_HEIGHT, WINDOW_TABLES[0].z]} rotationY={0.8} />

      {/* west wall: a book and a cup for the reader */}
      {WEST_TABLES.filter(({ seats: [north] }) => north).map(({ position: [x, , z] }) => (
        <group key={z}>
          <CoffeeCup position={[x + 0.2, TABLE_HEIGHT, z - 0.12]} />
          <mesh position={[x - 0.05, TABLE_HEIGHT + 0.012, z - 0.1]} rotation={[0, 0.3, 0]} castShadow>
            <boxGeometry args={[0.15, 0.024, 0.22]} />
            <meshStandardMaterial color="#6b2f2a" flatShading />
          </mesh>
        </group>
      ))}

      <StudyClutter />
      <SleeperClutter />
      <PokerGame />
    </group>
  )
}

// mug on a saucer, filled to just under the rim
export function CoffeeCup({ position, rotationY = 0, steam = false }: { position: Vec3; rotationY?: number; steam?: boolean }) {
  const cream = COLOR.ceramics[0]
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <Cylinder position={[0, 0.005, 0]} radius={[0.065, 0.05]} height={0.01} segments={12} color={cream} roughness={0.4} />
      <Cylinder position={[0, 0.055, 0]} radius={[0.042, 0.035]} height={0.09} segments={10} color={cream} roughness={0.4} />
      <mesh position={[0, 0.1005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.034, 10]} />
        <meshStandardMaterial color={COLOR.coffee} roughness={0.2} />
      </mesh>
      <MugHandle position={[0, 0.055, 0]} color={cream} />
      {steam && <Steam position={[0, 0.1, 0]} />}
    </group>
  )
}

// mug handle: a ring that wraps a bit past halfway, so both ends curl back into the
// cup wall instead of stopping flat against it. sticks out on the cup's +x side.
// center = ring center from the cup's middle, wrap = extra angle past a half ring
const HANDLE = { radius: 0.022, tube: 0.006, center: 0.045, wrap: 0.75 }

function MugHandle({ position: [x, y, z], color }: { position: Vec3; color: string }) {
  const { radius, tube, center, wrap } = HANDLE
  return (
    <mesh position={[x + center, y, z]} rotation={[0, 0, -Math.PI / 2 - wrap]} castShadow>
      <torusGeometry args={[radius, tube, 5, 12, Math.PI + 2 * wrap]} />
      <meshStandardMaterial color={color} flatShading roughness={0.4} />
    </mesh>
  )
}

const PUFFS = 7

// soft puffs that rise, drift and fade on a loop, staggered so there's always some
function Steam({ position }: { position: Vec3 }) {
  const puffs = useRef<Mesh[]>([])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    puffs.current.forEach((puff, i) => {
      const life = (t * 0.35 + i / PUFFS) % 1 // 0 -> 1 over ~3s
      const drift = 0.012 * (1 + life * 2) // sways wider as it rises
      puff.position.set(Math.sin(t * 1.3 + i * 2.1) * drift, life * 0.22, Math.cos(t + i) * 0.008)
      puff.scale.setScalar(0.6 + life * 1.4)
      ;(puff.material as MeshBasicMaterial).opacity = Math.sin(life * Math.PI) * 0.22
    })
  })

  return (
    <group position={position}>
      {Array.from({ length: PUFFS }, (_, i) => (
        <mesh
          key={i}
          ref={(mesh) => {
            if (mesh) puffs.current[i] = mesh
          }}
        >
          <icosahedronGeometry args={[0.012, 0]} />
          <meshBasicMaterial color="#f4ece2" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

type PastryPlateProps = { position: Vec3; rotationY?: number; pastry?: 'croissant' | 'tart' }

function PastryPlate({ position, rotationY = 0, pastry = 'croissant' }: PastryPlateProps) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <Cylinder position={[0, 0.006, 0]} radius={[0.09, 0.07]} height={0.012} segments={12} color={COLOR.ceramics[5]} roughness={0.4} />
      {pastry === 'croissant' ? <Croissant position={[0, 0.012, 0]} /> : <FruitTart position={[0, 0.012, 0]} />}
    </group>
  )
}

// golden crust, custard, a ring of strawberries, kiwi slices and blueberries
function FruitTart({ position }: { position: Vec3 }) {
  const crustTop = 0.022
  const top = crustTop + 0.004 // custard surface
  const strawberries = 6
  return (
    <group position={position}>
      <Cylinder position={[0, crustTop / 2, 0]} radius={[0.058, 0.052]} height={crustTop} segments={14} color={COLOR.pastry} />
      <Cylinder position={[0, crustTop + 0.002, 0]} radius={0.05} height={0.004} segments={14} color="#f1dfb0" castShadow={false} />
      {/* strawberry halves around the edge, tips pointing out */}
      {Array.from({ length: strawberries }, (_, i) => {
        const angle = (i / strawberries) * Math.PI * 2
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * 0.036, top + 0.008, Math.sin(angle) * 0.036]}
            rotation={[0, -angle, -Math.PI / 2]}
            castShadow
          >
            <coneGeometry args={[0.011, 0.024, 6]} />
            <meshStandardMaterial color="#c8303a" flatShading roughness={0.4} />
          </mesh>
        )
      })}
      {/* kiwi slices in the middle */}
      <Cylinder position={[-0.01, top + 0.002, 0.005]} radius={0.014} height={0.004} segments={10} color="#7da83a" castShadow={false} />
      <Cylinder position={[0.012, top + 0.003, -0.008]} radius={0.014} height={0.004} segments={10} color="#8fb84a" castShadow={false} />
      {/* blueberries tucked in between */}
      {[
        [0.0, 0.02],
        [0.022, 0.012],
        [-0.022, -0.012],
        [0.005, -0.024],
        [-0.024, 0.016],
      ].map(([bx, bz], i) => (
        <mesh key={i} position={[bx, top + 0.005, bz]} castShadow>
          <sphereGeometry args={[0.0055, 6, 4]} />
          <meshStandardMaterial color="#2f3a6b" flatShading roughness={0.35} />
        </mesh>
      ))}
    </group>
  )
}

// a sheet of paper lying flat. rotationY spins it on the table
function Paper({ position: [x, y, z], rotationY, color = COLOR.label }: { position: Vec3; rotationY: number; color?: string }) {
  return (
    <mesh position={[x, y + 0.001, z]} rotation={[0, rotationY, 0]} receiveShadow>
      <boxGeometry args={[0.21, 0.002, 0.297]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

function Pen({ position: [x, y, z], rotationY, color }: { position: Vec3; rotationY: number; color: string }) {
  return <Cylinder position={[x, y + 0.005, z]} radius={0.005} height={0.14} segments={5} rotation={[0, rotationY, Math.PI / 2]} color={color} />
}

// papers by each occupied seat, a notebook and pens in the middle, a cup each
function StudyClutter() {
  const [tx, , tz] = STUDY_TABLE.position
  const y = TABLE_HEIGHT
  return (
    <group>
      {STUDY_SEATS.filter((seat) => seat.occupied).map(({ position: [sx, , sz] }, i) => {
        // toward the middle of the table from this seat
        const inward = sz < tz ? 1 : -1
        return (
          <group key={i}>
            <Paper position={[sx + 0.25, y, sz + inward * 0.42]} rotationY={0.3 + i * 0.5} />
            <Paper position={[sx + 0.27, y + 0.002, sz + inward * 0.46]} rotationY={-0.2 + i * 0.4} />
            <CoffeeCup position={[sx - 0.24, y, sz + inward * 0.38]} />
          </group>
        )
      })}
      {/* open notebook in the middle */}
      <Paper position={[tx - 0.1, y, tz]} rotationY={1.5} color="#f5f0e1" />
      <Paper position={[tx + 0.12, y, tz]} rotationY={1.6} color="#f5f0e1" />
      <mesh position={[tx + 0.01, y + 0.004, tz]} rotation={[0, 1.55, 0]}>
        <boxGeometry args={[0.012, 0.006, 0.3]} />
        <meshStandardMaterial color={COLOR.black} />
      </mesh>
      <Pen position={[tx + 0.3, y, tz + 0.12]} rotationY={0.7} color={COLOR.black} />
      <Pen position={[tx - 0.32, y, tz - 0.1]} rotationY={-0.4} color="#2f4f8f" />
      {/* closed notebook by the empty chair */}
      <mesh position={[tx + 0.3, y + 0.008, tz + 0.25]} rotation={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[0.18, 0.016, 0.25]} />
        <meshStandardMaterial color="#2f3f36" flatShading />
      </mesh>
    </group>
  )
}

// the sleeper's table: papers under his arms, and the coffee he knocked over.
// the mug lies on its side, the coffee runs west to the table edge and drips
// onto the floor (the camera's side, so you see the drips)
function SleeperClutter() {
  const [tx, , tz] = SLEEPER_TABLE.position
  const [sx, , sz] = SLEEPER_SEAT
  const y = TABLE_HEIGHT
  const edgeX = tx - SLEEPER_TABLE.size[0] / 2
  const spillZ = tz - 0.15
  const cupX = sx + 0.05
  return (
    <group>
      <Paper position={[sx + 0.05, y, sz - 0.55]} rotationY={0.4} />
      <Paper position={[sx - 0.12, y + 0.002, sz - 0.6]} rotationY={-0.5} />
      <Paper position={[tx + 0.15, y, tz - 0.2]} rotationY={1.2} />
      <Pen position={[tx + 0.3, y, tz + 0.05]} rotationY={0.9} color={COLOR.black} />

      <TippedMug position={[cupX, y, spillZ]} />
      {/* puddle: overlapping flat blobs running from the mug's mouth to the edge */}
      {[
        [cupX - 0.08, 0.06],
        [cupX - 0.16, 0.075],
        [cupX - 0.25, 0.065],
        [edgeX + 0.05, 0.05],
      ].map(([x, r], i) => (
        <Coffee key={i} position={[x, y + 0.0015 + i * 0.0002, spillZ + (i % 2 ? 0.02 : -0.015)]} radius={r} />
      ))}
      {/* a bead hanging off the edge, drops falling from it, puddle on the floor */}
      <mesh position={[edgeX - 0.004, y - 0.015, spillZ]}>
        <boxGeometry args={[0.008, 0.03, 0.02]} />
        <meshStandardMaterial color={COLOR.coffee} roughness={0.05} />
      </mesh>
      <Drips position={[edgeX - 0.006, y - 0.03, spillZ]} />
      <Coffee position={[edgeX - 0.04, 0.002, spillZ]} radius={0.07} />
      <Coffee position={[edgeX - 0.1, 0.0025, spillZ + 0.04]} radius={0.035} />
    </group>
  )
}

function Coffee({ position, radius }: { position: Vec3; radius: number }) {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[radius, 10]} />
      <meshStandardMaterial color={COLOR.coffee} roughness={0.05} />
    </mesh>
  )
}

// mug lying on its side, mouth pointing west toward the puddle
function TippedMug({ position: [x, y, z] }: { position: Vec3 }) {
  const cream = COLOR.ceramics[0]
  return (
    <group position={[x, y + 0.042, z]} rotation={[0, 0, Math.PI / 2]}>
      <Cylinder position={[0, 0, 0]} radius={[0.042, 0.035]} height={0.09} segments={10} color={cream} roughness={0.4} />
      {/* the last of the coffee running out over the bottom lip (local axes are turned with the mug) */}
      <mesh position={[-0.03, 0.05, 0]}>
        <boxGeometry args={[0.012, 0.03, 0.03]} />
        <meshStandardMaterial color={COLOR.coffee} roughness={0.05} />
      </mesh>
      <MugHandle position={[0, 0, 0]} color={cream} />
    </group>
  )
}

const DRIPS = 3
const DRIP_PERIOD = 1.4 // seconds between drops from the edge

// drops that fall from the table edge to the floor with gravity, one at a time
function Drips({ position }: { position: Vec3 }) {
  const drops = useRef<Mesh[]>([])
  const height = position[1]
  const fallTime = Math.sqrt((2 * height) / 9.8)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    drops.current.forEach((drop, i) => {
      const since = (t + (i * DRIP_PERIOD) / DRIPS) % DRIP_PERIOD
      const falling = since < fallTime
      drop.visible = falling
      if (falling) drop.position.y = -0.5 * 9.8 * since * since
    })
  })

  return (
    <group position={position}>
      {Array.from({ length: DRIPS }, (_, i) => (
        <mesh
          key={i}
          scale={[1, 1.6, 1]}
          ref={(mesh) => {
            if (mesh) drops.current[i] = mesh
          }}
        >
          <sphereGeometry args={[0.006, 6, 4]} />
          <meshStandardMaterial color={COLOR.coffee} roughness={0.05} />
        </mesh>
      ))}
    </group>
  )
}

// --- poker at the round table
// meters. ~1.6x a real card so the flop reads from across the room
const CARD = { width: 0.1, length: 0.14 }

type Suit = 'hearts' | 'diamonds' | 'spades' | 'clubs'
// \uFE0E asks for the plain text symbol, not an emoji
const SUIT_SYMBOL: Record<Suit, string> = { hearts: '♥\uFE0E', diamonds: '♦\uFE0E', spades: '♠\uFE0E', clubs: '♣\uFE0E' }

// face up in the middle, left to right as seen from the opening camera
const FLOP: { rank: string; suit: Suit }[] = [
  { rank: '4', suit: 'hearts' },
  { rank: 'A', suit: 'diamonds' },
  { rank: '6', suit: 'spades' },
]
const CHIP_COLORS = ['#b5262a', '#efe9dd', '#2f4f8f', '#3f6b35', '#1e1e20']

function PokerGame() {
  const [tx, , tz] = GROUP_TABLE.position
  const y = TABLE_HEIGHT
  // turn the flop so it reads left to right, right side up, from where the camera starts
  const [cx, , cz] = CAMERA_PATH.start
  const facing = Math.atan2(-(tx - cx), -(tz - cz))
  const backTexture = useMemo(() => cardBackTexture(), [])

  return (
    <group>
      {/* flop, deck and dealer button, lined up across the middle */}
      <group position={[tx, y, tz]} rotation={[0, facing, 0]}>
        {FLOP.map((card, i) => (
          <FaceUpCard key={i} position={[(i - 1) * 0.115, 0.001, 0]} rank={card.rank} suit={card.suit} />
        ))}
        {/* deck, face down, off to the side of the flop */}
        <mesh position={[0.26, 0.006, -0.02]} castShadow>
          <boxGeometry args={[CARD.width, 0.012, CARD.length]} />
          <meshStandardMaterial color={COLOR.label} />
        </mesh>
        <CardBack position={[0.26, 0.0125, -0.02]} texture={backTexture} />
        {/* dealer button, behind the flop so nothing sits between it and the camera */}
        <Cylinder position={[-0.24, 0.004, -0.12]} radius={0.018} height={0.008} segments={12} color={COLOR.label} />
      </group>

      {/* each player: two hole cards face down and their chips, near the table edge so the middle stays clear */}
      {GROUP_SEATS.map((seat, i) => {
        const [sx, , sz] = seat
        // turned to face this player, pushed out toward them from the middle
        const towardSeat = Math.atan2(sx - tx, sz - tz)
        return (
          <group key={i} position={[tx, y, tz]} rotation={[0, towardSeat, 0]}>
            <CardBack position={[-0.03, 0.001, 0.34]} rotationY={0.15} texture={backTexture} />
            <CardBack position={[0.03, 0.0015, 0.35]} rotationY={-0.1} texture={backTexture} />
            <ChipStack position={[0.15, 0, 0.33]} count={4 + Math.floor(seeded(i * 10) * 6)} seed={i * 10 + 1} />
            <ChipStack position={[0.2, 0, 0.3]} count={3 + Math.floor(seeded(i * 10 + 5) * 6)} seed={i * 10 + 2} />
            <ChipStack position={[-0.16, 0, 0.32]} count={2 + Math.floor(seeded(i * 10 + 7) * 5)} seed={i * 10 + 3} />
          </group>
        )
      })}
    </group>
  )
}

// lying flat, top of the card pointing away (-z), face drawn on a little canvas
function FaceUpCard({ position, rank, suit }: { position: Vec3; rank: string; suit: Suit }) {
  const texture = useMemo(() => cardFaceTexture(rank, suit), [rank, suit])
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[CARD.width, CARD.length]} />
      <meshStandardMaterial map={texture} roughness={0.6} />
    </mesh>
  )
}

function CardBack({ position, rotationY = 0, texture }: { position: Vec3; rotationY?: number; texture: CanvasTexture }) {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, rotationY]} receiveShadow>
      <planeGeometry args={[CARD.width, CARD.length]} />
      <meshStandardMaterial map={texture} roughness={0.6} />
    </mesh>
  )
}

// a short stack of chips, colors picked from CHIP_COLORS, same every load
function ChipStack({ position: [x, y, z], count, seed }: { position: Vec3; count: number; seed: number }) {
  return (
    <group position={[x, y, z]}>
      {Array.from({ length: count }, (_, i) => (
        <Cylinder
          key={i}
          position={[0, 0.002 + i * 0.0036, 0]}
          radius={0.02}
          height={0.0034}
          segments={10}
          color={CHIP_COLORS[Math.floor(seeded(seed * 31 + i) * CHIP_COLORS.length)]}
        />
      ))}
    </group>
  )
}

const CARD_PX = { width: 126, height: 176 }

function cardFaceTexture(rank: string, suit: Suit) {
  const { width, height } = CARD_PX
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#f7f3ea'
  ctx.fillRect(0, 0, width, height)
  ctx.strokeStyle = '#c9c2b2'
  ctx.lineWidth = 4
  ctx.strokeRect(2, 2, width - 4, height - 4)

  const red = suit === 'hearts' || suit === 'diamonds'
  ctx.fillStyle = red ? '#b5262a' : '#1e1e20'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const symbol = SUIT_SYMBOL[suit]
  // big rank and suit filling the middle so it reads from across the room,
  // plus small corner indexes like a real card
  // rank sits on a baseline at y 100 (no letters here dip below it), the suit starts
  // at y 112, so there's always a gap between them whatever the font
  ctx.textBaseline = 'alphabetic'
  ctx.font = 'bold 90px Georgia, serif'
  ctx.fillText(rank, width / 2, 100)
  ctx.textBaseline = 'top'
  ctx.font = '50px serif'
  ctx.fillText(symbol, width / 2, 112)
  ctx.textBaseline = 'middle'
  ctx.font = 'bold 22px Georgia, serif'
  ctx.fillText(rank, 16, 18)
  ctx.save()
  ctx.translate(width - 16, height - 18)
  ctx.rotate(Math.PI)
  ctx.fillText(rank, 0, 0)
  ctx.restore()

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

// simple original back: white border, red field, a light diamond lattice
function cardBackTexture() {
  const { width, height } = CARD_PX
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#f7f3ea'
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = '#9e2a2b'
  ctx.fillRect(10, 10, width - 20, height - 20)
  // keep the lattice inside the red field
  ctx.save()
  ctx.beginPath()
  ctx.rect(10, 10, width - 20, height - 20)
  ctx.clip()
  ctx.strokeStyle = 'rgba(247, 243, 234, 0.35)'
  ctx.lineWidth = 2
  for (let i = -height; i < width + height; i += 14) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i + height, height)
    ctx.moveTo(i, height)
    ctx.lineTo(i + height, 0)
    ctx.stroke()
  }
  ctx.restore()
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}
