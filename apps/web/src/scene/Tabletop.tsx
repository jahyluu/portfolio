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

// tabletop props (cups, pastries, papers, cards). furniture + laptops are in CafeBlockout

export function Tabletops() {
  const [mx, , mz] = MY_TABLE.position
  const wx = WINDOW_TABLE.x
  return (
    <group>
      {/* my coffee lives in Me.tsx since it gets picked up */}
      <PastryPlate position={[mx + 0.36, TABLE_HEIGHT, mz - 0.12]} pastry="tart" />

      {/* window booth */}
      {WINDOW_TABLES.flatMap(({ z, bench, chair }) => [
        // the solo laptop seat's handle points out toward the edge of the table
        bench && <CoffeeCup key={`b${z}`} position={[wx + 0.2, TABLE_HEIGHT, z + 0.2]} rotationY={z === 0 ? -Math.PI / 2 : Math.PI / 2} />,
        chair && <CoffeeCup key={`c${z}`} position={[wx - 0.2, TABLE_HEIGHT, z - 0.2]} rotationY={-Math.PI / 2} />,
      ])}
      <PastryPlate position={[wx, TABLE_HEIGHT, WINDOW_TABLES[0].z]} rotationY={0.8} />

      {/* west wall reader */}
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

// mug + saucer
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

// partial torus on the +x side. wraps a little past half so the ends sink into the
// cup wall. wrap = extra angle past 180deg
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

// looping steam puffs, staggered
function Steam({ position }: { position: Vec3 }) {
  const puffs = useRef<Mesh[]>([])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    puffs.current.forEach((puff, i) => {
      const life = (t * 0.35 + i / PUFFS) % 1 // ~3s cycle
      const drift = 0.012 * (1 + life * 2)
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

// fruit tart
function FruitTart({ position }: { position: Vec3 }) {
  const crustTop = 0.022
  const top = crustTop + 0.004 // custard surface
  const strawberries = 6
  return (
    <group position={position}>
      <Cylinder position={[0, crustTop / 2, 0]} radius={[0.058, 0.052]} height={crustTop} segments={14} color={COLOR.pastry} />
      <Cylinder position={[0, crustTop + 0.002, 0]} radius={0.05} height={0.004} segments={14} color="#f1dfb0" castShadow={false} />
      {/* strawberries */}
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
      {/* kiwi */}
      <Cylinder position={[-0.01, top + 0.002, 0.005]} radius={0.014} height={0.004} segments={10} color="#7da83a" castShadow={false} />
      <Cylinder position={[0.012, top + 0.003, -0.008]} radius={0.014} height={0.004} segments={10} color="#8fb84a" castShadow={false} />
      {/* blueberries */}
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

// flat sheet of paper
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

// study table clutter
function StudyClutter() {
  const [tx, , tz] = STUDY_TABLE.position
  const y = TABLE_HEIGHT
  return (
    <group>
      {STUDY_SEATS.filter((seat) => seat.occupied).map(({ position: [sx, , sz] }, i) => {
        // toward the table center
        const inward = sz < tz ? 1 : -1
        return (
          <group key={i}>
            <Paper position={[sx + 0.25, y, sz + inward * 0.42]} rotationY={0.3 + i * 0.5} />
            <Paper position={[sx + 0.27, y + 0.002, sz + inward * 0.46]} rotationY={-0.2 + i * 0.4} />
            {/* seat 0 has a mouse there, so his cup sits further in past it */}
            <CoffeeCup position={i === 0 ? [sx - 0.22, y, sz + inward * 0.67] : [sx - 0.24, y, sz + inward * 0.38]} />
          </group>
        )
      })}
      {/* open notebook */}
      <Paper position={[tx - 0.1, y, tz]} rotationY={1.5} color="#f5f0e1" />
      <Paper position={[tx + 0.12, y, tz]} rotationY={1.6} color="#f5f0e1" />
      <mesh position={[tx + 0.01, y + 0.004, tz]} rotation={[0, 1.55, 0]}>
        <boxGeometry args={[0.012, 0.006, 0.3]} />
        <meshStandardMaterial color={COLOR.black} />
      </mesh>
      <Pen position={[tx + 0.3, y, tz + 0.12]} rotationY={0.7} color={COLOR.black} />
      <Pen position={[tx - 0.32, y, tz - 0.1]} rotationY={-0.4} color="#2f4f8f" />
      {/* closed one by the empty seat */}
      <mesh position={[tx + 0.3, y + 0.008, tz + 0.25]} rotation={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[0.18, 0.016, 0.25]} />
        <meshStandardMaterial color="#2f3f36" flatShading />
      </mesh>
    </group>
  )
}

// sleeper's table. spill runs west (toward the camera) and drips off the edge
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
      {/* puddle, overlapping blobs from the mug to the edge */}
      {[
        [cupX - 0.08, 0.06],
        [cupX - 0.16, 0.075],
        [cupX - 0.25, 0.065],
        [edgeX + 0.05, 0.05],
      ].map(([x, r], i) => (
        <Coffee key={i} position={[x, y + 0.0015 + i * 0.0002, spillZ + (i % 2 ? 0.02 : -0.015)]} radius={r} />
      ))}
      {/* drip + floor puddle */}
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

// tipped over mug, mouth facing west
function TippedMug({ position: [x, y, z] }: { position: Vec3 }) {
  const cream = COLOR.ceramics[0]
  return (
    <group position={[x, y + 0.042, z]} rotation={[0, 0, Math.PI / 2]}>
      <Cylinder position={[0, 0, 0]} radius={[0.042, 0.035]} height={0.09} segments={10} color={cream} roughness={0.4} />
      {/* coffee spilling over the lip (axes rotate with the mug) */}
      <mesh position={[-0.03, 0.05, 0]}>
        <boxGeometry args={[0.012, 0.03, 0.03]} />
        <meshStandardMaterial color={COLOR.coffee} roughness={0.05} />
      </mesh>
      <MugHandle position={[0, 0, 0]} color={cream} />
    </group>
  )
}

const DRIPS = 3
const DRIP_PERIOD = 1.4 // seconds

// one drop at a time, falls with gravity
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

// --- poker
// ~1.6x real size so the flop is readable from the camera
const CARD = { width: 0.1, length: 0.14 }

export type Suit = 'hearts' | 'diamonds' | 'spades' | 'clubs'
// \uFE0E = text glyph, not emoji
const SUIT_SYMBOL: Record<Suit, string> = { hearts: '♥\uFE0E', diamonds: '♦\uFE0E', spades: '♠\uFE0E', clubs: '♣\uFE0E' }

// left to right from the opening camera
const FLOP: { rank: string; suit: Suit }[] = [
  { rank: '4', suit: 'hearts' },
  { rank: 'A', suit: 'diamonds' },
  { rank: '6', suit: 'spades' },
]
const CHIP_COLORS = ['#b5262a', '#efe9dd', '#2f4f8f', '#3f6b35', '#1e1e20']
// seats that hold their cards up instead of leaving them on the table (the cards are
// drawn by Customer.tsx, see HeldCards)
const HOLDING = new Set([0, 1])

// each player's chips, in that player's table space (+z toward them, +x to their right)
export const CHIP_STACKS = [
  { position: [0.15, 0, 0.33] as Vec3, count: (seat: number) => 4 + Math.floor(seeded(seat * 10) * 6) },
  { position: [0.2, 0, 0.3] as Vec3, count: (seat: number) => 3 + Math.floor(seeded(seat * 10 + 5) * 6) },
  { position: [-0.16, 0, 0.32] as Vec3, count: (seat: number) => 2 + Math.floor(seeded(seat * 10 + 7) * 5) },
]
// the raiser's top chips are drawn by Customer.tsx
export const RAISER = 2
export const RAISE_CHIPS = 4

function PokerGame() {
  const [tx, , tz] = GROUP_TABLE.position
  const y = TABLE_HEIGHT
  // rotate the flop to face the starting camera
  const [cx, , cz] = CAMERA_PATH.start
  const facing = Math.atan2(-(tx - cx), -(tz - cz))
  const backTexture = useMemo(() => cardBackTexture(), [])

  return (
    <group>
      {/* flop, deck, dealer button */}
      <group position={[tx, y, tz]} rotation={[0, facing, 0]}>
        {FLOP.map((card, i) => (
          <FaceUpCard key={i} position={[(i - 1) * 0.115, 0.001, 0]} rank={card.rank} suit={card.suit} />
        ))}
        {/* deck */}
        <mesh position={[0.26, 0.006, -0.02]} castShadow>
          <boxGeometry args={[CARD.width, 0.012, CARD.length]} />
          <meshStandardMaterial color={COLOR.label} />
        </mesh>
        <CardBack position={[0.26, 0.0125, -0.02]} texture={backTexture} />
        {/* dealer button, behind the flop so the camera can see it */}
        <Cylinder position={[-0.24, 0.004, -0.12]} radius={0.018} height={0.008} segments={12} color={COLOR.label} />
      </group>

      {/* hole cards + chips per player */}
      {GROUP_SEATS.map((seat, i) => {
        const [sx, , sz] = seat
        // face the player, offset toward them
        const towardSeat = Math.atan2(sx - tx, sz - tz)
        return (
          <group key={i} position={[tx, y, tz]} rotation={[0, towardSeat, 0]}>
            {!HOLDING.has(i) && (
              <>
                <CardBack position={[-0.03, 0.001, 0.34]} rotationY={0.15} texture={backTexture} />
                <CardBack position={[0.03, 0.0015, 0.35]} rotationY={-0.1} texture={backTexture} />
              </>
            )}
            {CHIP_STACKS.map((stack, k) => (
              <ChipStack key={k} position={stack.position} count={stack.count(i) - (i === RAISER && k === 0 ? RAISE_CHIPS : 0)} seed={i * 10 + k + 1} />
            ))}
          </group>
        )
      })}
    </group>
  )
}

// two cards held up in a small fan, faces toward +z. same oversized cards as the table
// so they read from a distance
export function HeldCards({ cards }: { cards: { rank: string; suit: Suit }[] }) {
  const textures = useMemo(() => cards.map(({ rank, suit }) => cardFaceTexture(rank, suit)), [cards])
  const backTexture = useMemo(() => cardBackTexture(), [])
  return (
    <group>
      {textures.map((texture, i) => (
        <group key={i} position={[(i - 0.5) * 0.045, 0, i * 0.002]} rotation={[0, 0, (0.5 - i) * 0.3]}>
          <mesh position={[0, 0.05, 0]}>
            <planeGeometry args={[CARD.width, CARD.length]} />
            <meshStandardMaterial map={texture} roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.05, -0.0005]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[CARD.width, CARD.length]} />
            <meshStandardMaterial map={backTexture} roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// flat card, top toward -z, face drawn to a canvas
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

// chip stack, seeded colors. `from` starts partway up a stack (for chips lifted off the top)
export function ChipStack({ position: [x, y, z], count, seed, from = 0 }: { position: Vec3; count: number; seed: number; from?: number }) {
  return (
    <group position={[x, y, z]}>
      {Array.from({ length: count }, (_, j) => from + j).map((i) => (
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
  // big center rank/suit for readability + small corner index.
  // rank baseline is y=100 and suit starts at 112 so they never overlap
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

// card back: border, red field, diamond lattice
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
  // clip to the red field
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
