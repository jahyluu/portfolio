import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry, CanvasTexture, CatmullRomCurve3, Color, CylinderGeometry, DoubleSide, Float32BufferAttribute, Group, IcosahedronGeometry, LatheGeometry, MathUtils, Matrix4, Mesh, MeshStandardMaterial, RepeatWrapping, Shape, ShapeGeometry, SRGBColorSpace, TextureLoader, TubeGeometry, type Texture, Vector2, Vector3 } from 'three'
import { TABLE_HEIGHT, type Vec3 } from './layout'
import { COLOR } from './palette'
import { Blob, LIMB, Limb, makeHairShell, placeLimb, reach, type Hairline } from './body'
import { HAIR as MY_HAIR } from './Me'
import { Chair } from './primitives'
import { Loafer, Sandal, Sneaker, sneakerColors } from './Sneakers'
import { CHIP_STACKS, ChipStack, HeldCards, RAISE_CHIPS, RAISER, type Suit } from './Tabletop'

// seated customers. lighter than Me.tsx: same proportions, simpler clothes, one idle
// loop each. built facing +z (+x is their left), sitting on a chair at the origin

export type Action = 'typing' | 'gaming' | 'cards' | 'checkPoint' | 'raise' | 'reading' | 'chatting' | 'laughing' | 'phone' | 'notes'
// mine = same haircut as me (Me.tsx)
type HairStyle = 'short' | 'swept' | 'buzz' | 'bob' | 'long' | 'longStraight' | 'longBangs' | 'bun' | 'curlyTop' | 'mine'

export type Look = {
  skin: string
  hair: string
  style: HairStyle
  top: string
  sleeves: 'long' | 'short' | 'none'
  inner?: string // shirt showing under an open jacket
  pattern?: 'flannel' // textured top instead of a flat color
  cargo?: boolean // side pockets on the thighs
  graphic?: boolean // print on the front of the top
  maple?: boolean // a red maple leaf on the chest
  logo?: string // image in public/ printed on the chest (transparent png)
  large?: boolean // big and tall: about 6' and 250 lbs
  small?: boolean // petite: about 5'3" and 110 lbs
  cami?: boolean // top is a camisole: bare shoulders, thin straps, lace trim
  skirt?: boolean // mini skirt over bare legs (set pants to the skin color)
  cardigan?: boolean // cream cardigan hung over the chair back
  necklace?: boolean // thin gold chain with a small heart
  hand?: { rank: string; suit: Suit }[] // poker cards held up in her hands
  beard?: boolean
  stubble?: boolean
  polo?: boolean // collar + short button placket
  robe?: boolean // ao trang: ankle length, crossed collar, wide hanging sleeves (top = robe color)
  coat?: boolean // doctor's white coat (top) open over a collared shirt (inner)
  stethoscope?: boolean
  size?: { width: number; thick: number; tall: number } // overrides large/small
  shoe?: 'sneaker' | 'loafer' | 'sandal'
  pants: string
  shoes: string
}

// the cast, picked so no two at the same table look alike
export const CAST: Record<string, Look> = {
  // poker table, in the black cami
  maya: { skin: '#f3dccb', hair: '#0c0a0a', style: 'longBangs', top: '#141417', cami: true, sleeves: 'none', skirt: true, pants: '#f3dccb', shoes: '#f8f8f5', small: true, cardigan: true, necklace: true,
    // pocket aces
    hand: [
      { rank: 'A', suit: 'spades' },
      { rank: 'A', suit: 'hearts' },
    ],
  },
  dev: { skin: '#9a6a4a', hair: '#141110', style: 'buzz', top: '#3d5a4a', sleeves: 'short', pants: '#4a4a52', shoes: '#1d1d20', shoe: 'sandal' },
  sam: { skin: '#f0d0b4', hair: '#6b4a2e', style: 'swept', top: '#5a6b85', sleeves: 'long', inner: '#d9d4c7', pants: '#3a3f4a', shoes: '#3a2a1e', shoe: 'loafer' },
  lena: { skin: '#f3d6be', hair: '#b88a52', style: 'long', top: '#efe5d0', maple: true, sleeves: 'long', pants: '#2c2e33', shoes: '#1d1d20' },
  // window booth couple. she's in a gray ao trang, he's a doctor on a break
  thu: { skin: '#f6dfcd', hair: '#0b0909', style: 'longStraight', top: '#a3abc2', robe: true, sleeves: 'long', pants: '#a3abc2', shoes: '#4a3a2c', shoe: 'sandal' },
  bao: { skin: '#e6c09e', hair: '#0d0b0a', style: 'short', top: '#f1f1ec', coat: true, stethoscope: true, inner: '#bfd4ea', sleeves: 'long', pants: '#2b2e36', shoes: '#2a211b', shoe: 'loafer' },
  kai: { skin: '#d8ab86', hair: '#16120f', style: 'short', top: '#2f3542', sleeves: 'long', pants: '#55595f', shoes: '#e6e1d8' },
  nora: { skin: '#7a5038', hair: '#120e0c', style: 'bun', top: '#d8c25a', sleeves: 'long', pants: '#2b2d38', shoes: '#4a3526', shoe: 'sandal' },
  ivy: { skin: '#e2b896', hair: '#2a1b14', style: 'long', top: '#4f7a78', sleeves: 'long', pants: '#232429', shoes: '#e6e1d8' },
  omar: { skin: '#b07a55', hair: '#151110', style: 'swept', top: '#2a2c31', sleeves: 'long', inner: '#9c4a3a', pants: '#4a4a52', shoes: '#3a2a1e', shoe: 'loafer' },
  june: { skin: '#f1d2b8', hair: COLOR.hair, style: 'mine', top: '#a8b3c4', logo: '/stickers/t1.png', sleeves: 'long', pants: '#55595f', shoes: '#1d1d20' },
  ray: { skin: '#c99872', hair: '#1a1410', style: 'buzz', top: '#7a5a3a', sleeves: 'long', pants: '#2c2e33', shoes: '#1d1d20' },
  bea: { skin: '#e8c0a0', hair: '#7a3a22', style: 'bun', top: '#3b4a6b', sleeves: 'short', pants: '#2b2d38', shoes: '#e6e1d8', shoe: 'sandal' },
  // at the study table, playing League on the laptop with the sticker
  arjun: { skin: '#8a5a3c', hair: '#0e0b0a', style: 'curlyTop', top: '#34363d', graphic: true, sleeves: 'short', large: true, beard: true, pants: '#26324a', shoes: '#e9e5dc' },
  // poker table, back to the bar. 6'3", 260 lbs
  kemal: {
    skin: '#c9966c',
    hair: '#1c1510',
    style: 'short',
    stubble: true,
    top: '#2b3d5e',
    polo: true,
    sleeves: 'short',
    large: true,
    size: { width: 1.5, thick: 1.42, tall: 1.1 },
    pants: '#b9a27c',
    shoes: '#5a3a22',
    shoe: 'loafer',
    hand: [
      { rank: 'K', suit: 'clubs' },
      { rank: '7', suit: 'diamonds' },
    ],
  },
  // asleep at the table in front of mine
  milo: { skin: '#e6bf9e', hair: '#2a1d14', style: 'short', top: '#7a5a42', pattern: 'flannel', inner: '#ece8df', sleeves: 'long', pants: '#6c6e6b', cargo: true, shoes: '#1d1d20' },
}

// shared materials, one per color, so a dozen people don't make hundreds of them
const MATERIALS = new Map<string, MeshStandardMaterial>()
function mat(color: string) {
  let m = MATERIALS.get(color)
  if (!m) {
    m = new MeshStandardMaterial({ color, flatShading: true })
    MATERIALS.set(color, m)
  }
  return m
}
// smooth shaded, for clothes that should drape instead of looking faceted (the lab coat)
const SMOOTH = new Map<string, MeshStandardMaterial>()
function smoothMat(color: string) {
  let m = SMOOTH.get(color)
  if (!m) {
    m = new MeshStandardMaterial({ color, roughness: 0.85, side: DoubleSide })
    SMOOTH.set(color, m)
  }
  return m
}
const LIMB_SMOOTH = new CylinderGeometry(0.82, 1, 1, 16)
const JOINT_SMOOTH = new IcosahedronGeometry(1, 3)

// brown shadow-plaid flannel: cream base, soft wide brown bands both ways (darker
// where they cross), thin rust and cream lines along the band edges
function flannelTexture(repeatU: number, repeatV: number) {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#d9c8a6'
  ctx.fillRect(0, 0, size, size)
  const band = (horizontal: boolean, at: number, width: number, color: string, alpha: number) => {
    const g = horizontal ? ctx.createLinearGradient(0, at - width / 2, 0, at + width / 2) : ctx.createLinearGradient(at - width / 2, 0, at + width / 2, 0)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(0.5, color)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.globalAlpha = alpha
    ctx.fillStyle = g
    if (horizontal) ctx.fillRect(0, at - width / 2, size, width)
    else ctx.fillRect(at - width / 2, 0, width, size)
  }
  for (const horizontal of [false, true]) {
    band(horizontal, 40, 70, '#6a4630', 0.85)
    band(horizontal, 40, 30, '#4e3222', 0.5)
    band(horizontal, 104, 26, '#8a6a4c', 0.5)
  }
  ctx.globalAlpha = 0.55
  ctx.fillStyle = '#a8553a'
  for (const at of [8, 72, 92]) {
    ctx.fillRect(at, 0, 2, size)
    ctx.fillRect(0, at, size, 2)
  }
  ctx.globalAlpha = 0.35
  ctx.fillStyle = '#f2ead8'
  for (const at of [117, 122]) {
    ctx.fillRect(at, 0, 1, size)
    ctx.fillRect(0, at, size, 1)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.repeat.set(repeatU, repeatV)
  return texture
}

// patterned tops: one material for the body and one for the sleeves, made on first use
const PATTERNS = new Map<string, MeshStandardMaterial>()
function topMaterial(look: Look, part: 'torso' | 'sleeve') {
  if (!look.pattern) return mat(look.top)
  const key = `${look.pattern}-${part}`
  let m = PATTERNS.get(key)
  if (!m) {
    // the body wraps around ~1m, sleeves are short and thin, so they repeat differently
    m = new MeshStandardMaterial({ map: part === 'torso' ? flannelTexture(4, 2.2) : flannelTexture(1.5, 2.5), flatShading: true })
    PATTERNS.set(key, m)
  }
  return m
}

// shirt collar over the neckline: two flaps folded down, opening at the front
function Collar({ look, width = 1, tall = 1 }: { look: Look; width?: number; tall?: number }) {
  return (
    <group position={[0, 0.5 * tall, 0.0]} scale={[width, 1, width]}>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.05, 0.02, 0.05]} rotation={[-0.5, side * 0.5, side * 0.35]} material={topMaterial(look, 'torso')}>
          <boxGeometry args={[0.07, 0.012, 0.06]} />
        </mesh>
      ))}
      <mesh position={[0, 0.035, -0.03]} rotation={[0.3, 0, 0]} material={topMaterial(look, 'torso')}>
        <boxGeometry args={[0.12, 0.04, 0.012]} />
      </mesh>
    </group>
  )
}

// maple leaf, ~1 unit tall. only the right half, mirrored below
const LEAF_HALF: [number, number][] = [
  [0, 1], [0.1, 0.72], [0.26, 0.8], [0.2, 0.42], [0.46, 0.56], [0.52, 0.42], [0.78, 0.5], [0.66, 0.28],
  [0.76, 0.2], [0.42, -0.02], [0.47, -0.14], [0.05, -0.06], [0.04, -0.42],
]
const MAPLE_LEAF = (() => {
  const shape = new Shape()
  const points = [...LEAF_HALF, ...LEAF_HALF.slice(1).reverse().map(([x, y]) => [-x, y] as [number, number])]
  shape.moveTo(...points[0])
  points.slice(1).forEach((point) => shape.lineTo(...point))
  shape.closePath()
  return new ShapeGeometry(shape)
})()

// graphic tee print: sun over two ridges
let GRAPHIC: MeshStandardMaterial | undefined
function graphicMaterial() {
  if (GRAPHIC) return GRAPHIC
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#e8dcc4'
  ctx.beginPath()
  ctx.arc(32, 26, 15, 0, Math.PI * 2)
  ctx.lineWidth = 3
  ctx.strokeStyle = '#e8dcc4'
  ctx.stroke()
  ctx.fillStyle = '#e07a3c'
  ctx.beginPath()
  ctx.arc(32, 26, 10, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#e8dcc4'
  ctx.beginPath()
  ctx.moveTo(6, 54)
  ctx.lineTo(24, 34)
  ctx.lineTo(34, 44)
  ctx.lineTo(44, 30)
  ctx.lineTo(58, 54)
  ctx.closePath()
  ctx.fill()
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  GRAPHIC = new MeshStandardMaterial({ map: texture, transparent: true, alphaTest: 0.5 })
  return GRAPHIC
}

const mix = (a: string, b: string, t: number) => '#' + new Color(a).lerp(new Color(b), t).getHexString()
const shade = (hex: string, k: number) => '#' + new Color(hex).multiplyScalar(k).getHexString()

// --- body, all relative to the chair (seat top at ~0.475)
const HIP_Y = 0.53
const LEAN = 0.12
const ARM = { upper: 0.29, fore: 0.29 }
const SHOULDER = { x: 0.165, up: 0.46 }
const HEAD_UP = 0.56

// size multipliers. large = about 6' and 250 lbs next to the default ~5'8" build:
// a bit taller, a lot wider, much thicker arms and legs
function build(look: Look) {
  if (look.size) return look.size
  if (look.large) return { width: 1.45, thick: 1.38, tall: 1.06 }
  if (look.small) return { width: 0.88, thick: 0.82, tall: 0.93 }
  return { width: 1, thick: 1, tall: 1 }
}

// same outline as my hoodie, trimmed down: [radius, height above the hips]
const TORSO_OUTLINE: [number, number][] = [
  [0, -0.04],
  [0.13, -0.04],
  [0.162, -0.02],
  [0.155, 0.08],
  [0.155, 0.2],
  [0.165, 0.32],
  [0.17, 0.41],
  [0.162, 0.46],
  [0.135, 0.495],
  [0.09, 0.52],
  [0.055, 0.54],
  [0, 0.54],
]
const TORSO = new LatheGeometry(
  TORSO_OUTLINE.map(([r, y]) => new Vector2(r, y)),
  14,
)
const TORSO_DEPTH = 0.6
// a point on the torso's front surface at (x, up), torso space, for a body of this width.
// lifted `out` meters off the surface
function onChest(x: number, up: number, width: number, out = 0.003): Vec3 {
  let r = 0
  for (let i = 1; i < TORSO_OUTLINE.length; i++) {
    const [r1, y1] = TORSO_OUTLINE[i]
    const [r0, y0] = TORSO_OUTLINE[i - 1]
    if (up <= y1 && y1 > y0) {
      r = MathUtils.lerp(r0, r1, (up - y0) / (y1 - y0))
      break
    }
  }
  const rx = r * width
  const rz = r * TORSO_DEPTH * width
  return [x, up, rz * Math.sqrt(Math.max(1 - (x / rx) ** 2, 0)) + out]
}
// the inside of an open jacket: a narrow strip down the front
const JACKET_GAP = new LatheGeometry(
  [
    [0.157, 0.0],
    [0.158, 0.2],
    [0.168, 0.33],
    [0.17, 0.44],
  ].map(([r, y]) => new Vector2(r + 0.004, y)),
  4,
  -0.22,
  0.44,
)

// --- hair, one shell per style, shared by everyone who has it
const SKULL = { center: new Vector3(0, 0.12, 0), radii: new Vector3(0.1, 0.115, 0.106) }
const s = MathUtils.smoothstep
const HAIRLINES: Record<Exclude<HairStyle, 'mine'>, Hairline> = {
  short: [[0, 0.5], [0.6, 0.4], [1.1, 0.18], [1.4, 0.22], [1.65, 0.3], [1.9, -0.1], [2.4, -0.45], [Math.PI, -0.65]],
  swept: [[0, 0.45], [0.5, 0.35], [1.1, 0.18], [1.4, 0.2], [1.65, 0.3], [1.9, -0.1], [2.4, -0.45], [Math.PI, -0.65]],
  buzz: [[0, 0.58], [1.1, 0.3], [1.5, 0.35], [1.9, 0.0], [Math.PI, -0.6]],
  bob: [[0, 0.5], [0.5, 0.38], [0.9, 0.0], [1.3, -0.45], [Math.PI, -0.7]],
  long: [[0, 0.5], [0.5, 0.38], [0.9, 0.0], [1.3, -0.5], [Math.PI, -0.85]],
  longStraight: [[0, 0.5], [0.5, 0.38], [0.9, 0.0], [1.3, -0.5], [Math.PI, -0.85]],
  // long and straight with curtain bangs parted in the middle
  longBangs: [[0, 0.4], [0.3, 0.28], [0.55, 0.22], [0.9, 0.0], [1.3, -0.5], [Math.PI, -0.85]],
  bun: [[0, 0.52], [0.6, 0.42], [1.05, 0.25], [1.35, 0.2], [1.6, 0.3], [1.85, 0.05], [2.3, -0.4], [Math.PI, -0.6]],
  // curly hair on top of the head only, sides and back bare
  curlyTop: [[0, 0.52], [0.8, 0.46], [1.6, 0.5], [2.4, 0.44], [Math.PI, 0.38]],
}
const HAIR = Object.fromEntries(
  (Object.keys(HAIRLINES) as Exclude<HairStyle, 'mine'>[]).map((style) => [
    style,
    makeHairShell({
      skull: SKULL,
      hairline: HAIRLINES[style],
      detail: style === 'curlyTop' ? 4 : 3,
      thickness: (d, angle) => {
        if (style === 'buzz') return 0.035
        // short and tight: a little volume on top, lumpy all over
        // tight curls, a bit higher in the middle
        if (style === 'curlyTop') return 0.06 + 0.04 * s(d.y, 0.5, 0.9) + 0.03 * Math.abs(Math.sin(Math.atan2(d.x, d.z) * 9) * Math.sin(d.y * 13))
        let t = 0.06 + 0.13 * s(d.y, 0, 0.9)
        // swept: a side part, more volume falling to one side
        if (style === 'swept') t += 0.05 * s(d.x, -0.2, 0.5) * s(d.y, 0.2, 0.8)
        // bob and long: fuller at the sides, flaring a little at the ends
        if (style === 'bob' || style === 'long' || style === 'longStraight' || style === 'longBangs') t += 0.08 * s(angle, 0.6, 1.4) * (1 - s(d.y, 0.1, 0.7))
        if (style === 'longBangs') {
          // bangs sweep out to the sides, with a soft middle part
          t += 0.05 * Math.exp(-(((angle - 0.35) / 0.3) ** 2)) * s(d.y, 0.1, 0.4)
          t -= 0.06 * Math.exp(-((d.x / 0.09) ** 2)) * s(d.z, -0.2, 0.5) * s(d.y, 0.3, 0.7)
        }
        if (style === 'bun') t *= 0.8
        return t
      },
    }),
  ]),
) as Record<HairStyle, ReturnType<typeof makeHairShell>>

// short full beard: covers the jaw and chin, running up into the sideburns
// out = how far it sits off the skin. lip = also cover the upper lip (stubble)
function makeBeard(out: number, lip: boolean) {
  const geometry = new IcosahedronGeometry(1, 3)
  const position = geometry.attributes.position
  const d = new Vector3()
  for (let i = 0; i < position.count; i++) {
    d.fromBufferAttribute(position, i).normalize()
    const angle = Math.abs(Math.atan2(d.x, d.z))
    // jaw and chin below the cheekbones, from the front round to just under the ears
    const jaw = (1 - s(d.y, -0.34, -0.22)) * (1 - s(angle, 1.45, 1.7))
    // sideburns up in front of the ears
    const sideburn = (1 - s(d.y, 0.02, 0.12)) * s(angle, 1.25, 1.38) * (1 - s(angle, 1.5, 1.6))
    const upperLip = lip ? (1 - s(d.y, -0.12, -0.05)) * (1 - s(angle, 0.35, 0.5)) : 0
    const covered = Math.max(jaw, sideburn, upperLip) * s(d.y, -0.95, -0.75)
    const scale = MathUtils.lerp(0.8, out, covered)
    position.setXYZ(i, SKULL.center.x + d.x * SKULL.radii.x * scale, SKULL.center.y + d.y * SKULL.radii.y * scale, SKULL.center.z + d.z * SKULL.radii.z * scale)
  }
  geometry.computeVertexNormals()
  return geometry
}
const BEARD = makeBeard(1.06, false)
// a few days of growth: hugs the skin, covers the lip too, drawn as a hair/skin mix
const STUBBLE = makeBeard(1.018, true)

type Props = {
  look: Look
  action: Action
  position: Vec3
  rotationY?: number
  reach?: number // how far forward the hands work (to the laptop, cards, the table edge)
  phase?: number // seconds, so people sharing an action don't move in sync
  seatY?: number // seat height, lower on the window bench
  noChair?: boolean
  table?: number // seat to table center, used for reaching chips
}

export function Customer({ look, action, position, rotationY = 0, reach: forward = 0.36, phase = 0, seatY = 0.475, noChair = false, table = 0.8 }: Props) {
  const drop = 0.475 - seatY
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {!noChair && <Chair />}
      {look.cardigan && !noChair && <HungCardigan />}
      <group position={[0, -drop, 0]}>
        <SeatedBody look={look} action={action} forward={forward} phase={phase} drop={drop} table={table} />
      </group>
    </group>
  )
}

// moved every frame, ScenePrep leaves these alone (the legs, shoes and chair get merged)
const MOVES = { dynamic: true }
// moves as one piece, so ScenePrep can merge what's inside it
const MOVES_RIGID = { dynamic: true, rigid: true }

function SeatedBody({ look, action, forward, phase, drop, table }: { look: Look; action: Action; forward: number; phase: number; drop: number; table: number }) {
  const head = useRef<Group>(null!)
  const torso = useRef<Group>(null!)
  const cards = useRef<Group>(null!)
  const chips = useRef<Group>(null!)
  const neck = useRef<Mesh>(null!)
  const parts = useRef<Record<string, Mesh>>({})
  const set = (key: string) => (object: Mesh | null) => {
    if (object) parts.current[key] = object
  }
  const state = useMemo(() => ({ right: new Vector3(-0.1, TABLE_HEIGHT, 0.3), left: new Vector3(0.1, TABLE_HEIGHT, 0.3), pitch: 0.3, yaw: 0, lean: LEAN, cardSide: 0, chipsAt: new Vector3(), handDir: [new Vector3(0, 0, 1), new Vector3(0, 0, 1)] }), [])
  // bigger build: wider body and shoulders, thicker limbs
  const { width, thick, tall } = build(look)
  // the table is at a fixed height, so lift hand targets back up when the seat is lower
  const tableY = TABLE_HEIGHT + drop
  // his chip stack in seat space (table +x is his right = -x here)
  const [stackX, , stackZ] = CHIP_STACKS[0].position
  const stack = new Vector3(-stackX, tableY, table - stackZ)
  const stackCount = CHIP_STACKS[0].count(RAISER)
  const raiseU = useRef(0)
  const pot = new Vector3(-0.04, tableY, table - 0.2)

  useFrame(({ clock }, delta) => {
    const p = parts.current
    if (!head.current || !torso.current || !['upper0', 'upper1', 'fore0', 'fore1', 'hand0', 'hand1', 'elbow0', 'elbow1', 'shoulder0', 'shoulder1'].every((k) => p[k])) return
    const t = clock.elapsedTime + phase
    const dt = Math.min(delta, 0.1)
    const right = new Vector3()
    const left = new Vector3()
    let pitch = 0.3
    let yaw = 0
    let lean = LEAN
    // which hand has the cards: 1 = left, -1 = right, 0 = both
    let cardSide = 0
    // elbow pole overrides, for when a hand goes up to the face
    let rightPole: Vector3 | null = null
    let leftPole: Vector3 | null = null
    // added after damping, otherwise it gets smoothed away
    let bounce = 0

    if (action === 'checkPoint') {
      // 14s loop: check (two taps), point left, point right, back to cards.
      // cards move to whichever hand is free
      const u = t % 14
      const tapping = s(u, 3, 3.4) * (1 - s(u, 5, 5.4))
      const pointL = s(u, 5.2, 5.7) * (1 - s(u, 7.4, 7.9))
      const pointR = s(u, 7.7, 8.2) * (1 - s(u, 9.9, 10.4))
      const busy = Math.max(tapping, pointL, pointR)
      // both hands on the cards
      left.set(0.05, tableY + 0.13, forward - 0.1)
      right.set(-0.05, tableY + 0.13, forward - 0.1)
      // left hand holds them lower while the right is busy
      left.lerp(new Vector3(0.1, tableY + 0.1, forward - 0.12), tapping + pointR)
      right.lerp(new Vector3(-0.1, tableY + 0.1, forward - 0.12), pointL)
      // two taps on the felt
      const tap = Math.abs(Math.sin((u - 3.4) * Math.PI * 1.25)) * 0.05
      const tapAt = new Vector3(-0.06, tableY + 0.025 + tap * (u > 3.4 && u < 5 ? 1 : 0), forward + 0.08)
      // straight arm toward a player, ~chest height
      const toward = (side: number, x: number, z: number) => {
        const shoulder = onTorso(side * SHOULDER.x * width, SHOULDER.up * tall, 0)
        return shoulder.add(new Vector3(x, tableY + 0.3 - shoulder.y, z).normalize().multiplyScalar(ARM.upper + ARM.fore - 0.04))
      }
      const atLeft = toward(1, 0.55, 0.85)
      const atRight = toward(-1, -0.55, 0.85)
      right.multiplyScalar(1 - tapping - pointR).addScaledVector(tapAt, tapping).addScaledVector(atRight, pointR)
      left.multiplyScalar(1 - pointL).addScaledVector(atLeft, pointL)
      cardSide = pointL > 0.5 ? -1 : tapping + pointR > 0.5 ? 1 : 0
      lean = 0.12 + 0.1 * tapping
      pitch = 0.42 * (1 - busy) + 0.3 * tapping + 0.02 * (pointL + pointR)
      yaw = 0.55 * pointL - 0.55 * pointR
    } else if (action === 'raise') {
      // 16s loop: drum fingers, rub forehead, peek at cards, raise, sit back
      const u = t % 16
      raiseU.current = u
      const brow = s(u, 2.6, 3.2) * (1 - s(u, 5.4, 6))
      const peek = s(u, 6, 6.5) * (1 - s(u, 7.3, 7.8))
      const grab = s(u, 8, 8.6)
      const carry = s(u, 8.9, 9.4)
      const push = s(u, 9.4, 10.3)
      const back = s(u, 10.5, 11.1) * (1 - s(u, 15.4, 16))
      // resting + drumming
      const drum = Math.max(0, Math.sin(t * 9)) ** 4 * 0.012 * (1 - back)
      right.set(-0.1, tableY + 0.03 + drum, forward - 0.02)
      left.set(0.1, tableY + 0.03, forward - 0.02)
      const browHand = onTorso(0, HEAD_UP * tall, 0.01, state.lean).add(
        new Vector3(-0.02 + Math.sin(t * 5) * 0.012, 0.2, 0.15).applyEuler(head.current.rotation),
      )
      right.lerp(browHand, brow)
      if (brow > 0.01) rightPole = new Vector3(-0.5, -0.8, 0.5)
      // lift a card corner
      left.lerp(new Vector3(0.02, tableY + 0.03 + 0.02 * Math.max(0, Math.sin((u - 6.5) * 4)), table - 0.42), peek)
      // raise: over the stack -> lift -> slide into the pot
      const over = stack.clone().add(new Vector3(0, 0.04 + RAISE_CHIPS * 0.0036, -0.045))
      const lifted = new Vector3(-0.08, tableY + 0.07, table - 0.36)
      const potHand = pot.clone().add(new Vector3(0, 0.035, -0.04))
      const raise = new Vector3().lerpVectors(over, lifted, carry).lerp(potHand, push)
      right.lerp(raise, grab * (1 - back))
      right.lerp(new Vector3(-0.09, tableY + 0.04, forward - 0.1), back)
      left.lerp(new Vector3(0.09, tableY + 0.04, forward - 0.1), back)
      lean = 0.16 + 0.12 * brow + 0.1 * (peek + grab * (1 - back)) - 0.14 * back
      // keeps looking around unless his hands are busy
      const dart = Math.sin(t * 0.9) + 0.4 * Math.sin(t * 2.3)
      pitch = 0.3 + 0.25 * brow + 0.35 * peek + 0.2 * grab * (1 - back) - 0.15 * back
      yaw = dart * 0.3 * (1 - brow) * (1 - peek) * (1 - grab * (1 - back))
    } else if (action === 'gaming') {
      // mouse + keyboard. every 25s he loses a fight and throws his hands up
      const u = t % 25
      const rage = s(u, 20, 20.4) * (1 - s(u, 22.6, 23.2))
      const flick = new Vector3(Math.sin(t * 3.1) * 0.02 + Math.sin(t * 7.3) * 0.008, Math.max(0, Math.sin(t * 14)) ** 6 * 0.006, Math.cos(t * 2.3) * 0.015)
      right.set(-0.215, tableY + 0.035, forward - 0.02).add(flick)
      left.set(0.06 + Math.sin(t * 5) * 0.015, tableY + 0.035 + Math.max(0, Math.sin(t * 17)) ** 6 * 0.012, forward)
      right.lerp(new Vector3(-0.2, tableY + 0.42, forward - 0.2), rage)
      left.lerp(new Vector3(0.2, tableY + 0.42, forward - 0.2), rage)
      lean = MathUtils.lerp(0.24, -0.08, rage)
      pitch = MathUtils.lerp(0.3, -0.25, rage)
      yaw = Math.sin(t * 0.5) * 0.04
    } else if (action === 'typing') {
      const tap = (k: number) => Math.max(0, Math.sin(t * 11 + k * 2.3)) ** 8 * 0.012
      right.set(-0.09, tableY + 0.03 + tap(0), forward)
      left.set(0.09, tableY + 0.03 + tap(1), forward)
      // glance up from the screen now and then
      pitch = 0.35 - 0.3 * s(Math.sin(t * 0.15), 0.85, 0.95)
      yaw = Math.sin(t * 0.3) * 0.05
    } else if (action === 'cards') {
      // holding cards up close, and every so often tossing a chip in
      // (someone holding their hand up keeps both hands on it)
      const toss = look.hand ? 0 : s(Math.sin(t * 0.21), 0.9, 0.99)
      right.set(-0.05, tableY + 0.12, forward - 0.08).lerp(new Vector3(-0.02, tableY + 0.03, forward + 0.22), toss)
      left.set(0.05, tableY + 0.12, forward - 0.08)
      pitch = 0.3 + 0.15 * toss
      yaw = Math.sin(t * 0.25) * 0.25 * (1 - toss)
    } else if (action === 'reading') {
      // hands on the book, turning a page every 12s or so
      const turn = s((t % 12) / 12, 0.85, 0.93) * (1 - s((t % 12) / 12, 0.93, 1))
      right.set(-0.13 + turn * 0.18, tableY + 0.03 + turn * 0.06, forward + 0.06)
      left.set(0.13, tableY + 0.03, forward + 0.06)
      pitch = 0.5
    } else if (action === 'chatting') {
      // one hand around a mug, the other moving a little as they talk
      const gesture = s(Math.sin(t * 0.4), 0.3, 0.9)
      right.set(-0.12, tableY + 0.05, forward)
      left.set(0.12 - gesture * 0.04, tableY + 0.03 + gesture * 0.1, forward - 0.05 * gesture)
      pitch = 0.05 + Math.sin(t * 1.7) * 0.04 * gesture
      yaw = Math.sin(t * 0.23) * 0.15
    } else if (action === 'laughing') {
      // chatting, plus a short laugh every ~11s with her hand over her mouth
      const u = t % 11
      const laugh = s(u, 6, 6.4) * (1 - s(u, 8.2, 8.8))
      const gesture = s(Math.sin(t * 0.4), 0.3, 0.9) * (1 - laugh)
      const bob = Math.abs(Math.sin(t * 9)) * laugh
      bounce = bob
      right.set(-0.12, tableY + 0.05, forward)
      left.set(0.12 - gesture * 0.04, tableY + 0.03 + gesture * 0.1, forward - 0.05 * gesture)
      // hand center is ~4cm past the wrist, so back the target off
      const mouth = head.current.position.clone().add(new Vector3(0, 0.06, 0.13).applyEuler(head.current.rotation))
      left.lerp(mouth.addScaledVector(state.handDir[1], -0.04), laugh)
      if (laugh > 0.01) leftPole = new Vector3(0.5, -0.8, 0.5)
      lean = LEAN + 0.06 * laugh
      // bob is applied after damping, see below
      pitch = 0.05 + Math.sin(t * 1.7) * 0.04 * gesture - 0.12 * laugh
      yaw = Math.sin(t * 0.23) * 0.15 * (1 - laugh) + 0.1 * laugh
    } else if (action === 'phone') {
      right.set(-0.03, tableY + 0.14, forward - 0.12)
      left.set(0.04, tableY + 0.13, forward - 0.12)
      pitch = 0.55
      yaw = -0.05
    } else {
      // notes: writing with the right hand, left hand holding the page
      right.set(-0.06 + Math.sin(t * 2.2) * 0.03, tableY + 0.02 + Math.max(0, Math.sin(t * 9)) * 0.006, forward + 0.04)
      left.set(0.12, tableY + 0.02, forward + 0.06)
      pitch = 0.45
    }

    state.right.lerp(right, 1 - Math.exp(-8 * dt))
    state.left.lerp(left, 1 - Math.exp(-8 * dt))
    state.pitch = MathUtils.damp(state.pitch, pitch, 4, dt)
    state.yaw = MathUtils.damp(state.yaw, yaw, 3, dt)
    state.lean = MathUtils.damp(state.lean, lean, 5, dt)
    // laugh bob
    const leanNow = state.lean + 0.018 * bounce
    torso.current.rotation.x = leanNow
    head.current.position.copy(onTorso(0, HEAD_UP * tall, 0.01, leanNow))
    head.current.rotation.set(state.pitch + 0.045 * bounce, state.yaw, 0, 'YXZ')
    // neck goes from inside the collar into the back of the skull
    const headScale = look.large ? 1.08 : look.small ? 0.96 : 1
    const nape = new Vector3(0, 0.07, -0.02).multiplyScalar(headScale).applyEuler(head.current.rotation).add(head.current.position)
    placeLimb(neck.current, onTorso(0, 0.5 * tall, 0.005, leanNow), nape, 0.05 * thick)
    if (cards.current) {
      // tipped back so they're peeking down at them. between both hands, or in the left
      // hand alone while the right is doing something else
      state.cardSide = MathUtils.damp(state.cardSide, cardSide, 6, dt)
      const between = state.right.clone().add(state.left).multiplyScalar(0.5)
      const holder = state.cardSide > 0 ? state.left : state.right
      cards.current.position.copy(between).lerp(holder, Math.abs(state.cardSide)).add(new Vector3(0, 0.025, 0.01))
      cards.current.rotation.set(1.05, 0, Math.sin(t * 0.4) * 0.05)
    }

    ;[-1, 1].forEach((side, k) => {
      const shoulder = onTorso(side * SHOULDER.x * width, SHOULDER.up * tall, 0, leanNow)
      const wrist = (side < 0 ? state.right : state.left).clone()
      const elbow = new Vector3()
      // elbows out and back, so they don't dip under the table when the hands are close in
      const pole = (side < 0 ? rightPole : leftPole) ?? new Vector3(side * 0.75, -0.45, -0.6)
      reach(shoulder, wrist, pole, elbow, ARM.upper * tall, ARM.fore * tall)
      // the robe's sleeves are loose, the forearm one widens toward the cuff
      placeLimb(p[`upper${k}`], shoulder, elbow, (look.robe ? 0.058 : 0.05) * thick)
      placeLimb(p[`fore${k}`], elbow, wrist, (look.robe ? 0.06 : 0.042) * thick)
      if (p[`drape${k}`]) hangSleeve(p[`drape${k}`], elbow, wrist)
      p[`elbow${k}`].position.copy(elbow)
      p[`shoulder${k}`].position.copy(shoulder)
      const dir = wrist.clone().sub(elbow)
      dir.y *= 0.3
      dir.normalize()
      p[`hand${k}`].position.copy(wrist).addScaledVector(dir, 0.04)
      p[`hand${k}`].quaternion.setFromUnitVectors(new Vector3(0, 0, 1), dir)
      state.handDir[k].copy(dir)
    })

    if (chips.current) {
      // raised chips: stack -> hand -> pot. they snap back when the loop restarts
      const u = raiseU.current
      const held = s(u, 8.5, 8.7) * (1 - s(u, 10.4, 10.6))
      const inHand = p.hand0.position.clone().add(new Vector3(0, -0.0125 - RAISE_CHIPS * 0.0036, 0))
      inHand.y = Math.max(inHand.y, tableY)
      if (u < 9) state.chipsAt.copy(stack).setY(tableY + (stackCount - RAISE_CHIPS) * 0.0036)
      else state.chipsAt.copy(pot).setY(tableY)
      // group origin is the bottom of the full stack
      chips.current.position.lerpVectors(state.chipsAt, inHand, held).y -= (stackCount - RAISE_CHIPS) * 0.0036
    }
  })

  const sleeve = look.sleeves === 'none' ? mat(look.skin) : look.coat ? smoothMat(look.top) : topMaterial(look, 'sleeve')
  const limb = look.coat ? LIMB_SMOOTH : LIMB
  const forearm = look.sleeves === 'long' ? sleeve : mat(look.skin)
  return (
    <group>
      <Legs look={look} />
      <group ref={torso} userData={MOVES_RIGID} position={[0, HIP_Y, 0]} rotation={[LEAN, 0, 0]}>
        <mesh geometry={TORSO} material={look.cami ? mat(look.skin) : look.coat ? smoothMat(look.top) : topMaterial(look, 'torso')} scale={[width, tall, TORSO_DEPTH * width * (look.large ? 1.1 : 1)]} castShadow receiveShadow />
        {look.cami && <Cami look={look} width={width} tall={tall} />}
        {look.necklace && <Necklace width={width} tall={tall} />}
        {/* belly */}
        {look.large && <Blob position={[0, 0.15, 0.09]} radii={[0.21, 0.17, 0.13]} color={look.top} />}
        {look.graphic && (
          <mesh position={[0, 0.33 * tall, 0.166 * TORSO_DEPTH * width * (look.large ? 1.1 : 1) + 0.006]} material={graphicMaterial()}>
            <planeGeometry args={[0.12, 0.12]} />
          </mesh>
        )}
        {look.logo && <ChestLogo src={look.logo} position={onChest(0, 0.42 * tall, width, 0.004)} />}
        {look.maple && <mesh geometry={MAPLE_LEAF} position={onChest(0, 0.34 * tall, width, 0.004)} scale={0.05} material={mat('#b3342b')} />}
        {look.inner && <mesh geometry={JACKET_GAP} material={mat(look.inner)} scale={[1, 1, TORSO_DEPTH + 0.02]} />}
        {look.pattern === 'flannel' && <Collar look={look} width={width} tall={tall} />}
        {look.robe && <RobeCollar look={look} width={width} tall={tall} />}
        {look.coat && <LabCoat look={look} width={width} tall={tall} />}
        {look.stethoscope && <Stethoscope width={width} tall={tall} />}
        {look.polo && (
          // collar band + placket
          <group>
            <mesh position={[0, 0.535 * tall, 0.01]} rotation={[Math.PI / 2, 0, 0]} material={mat(look.top)}>
              <torusGeometry args={[0.058 * thick, 0.014, 6, 16]} />
            </mesh>
            <mesh position={onChest(0, 0.475 * tall, width, 0.0015)} material={mat(shade(look.top, 0.8))}>
              <planeGeometry args={[0.026, 0.08]} />
            </mesh>
          </group>
        )}
      </group>
      {/* placed in useFrame */}
      <mesh ref={neck} userData={MOVES} geometry={LIMB} material={mat(look.skin)} />
      <group ref={head} userData={MOVES_RIGID} position={onTorso(0, HEAD_UP * tall, 0.01).toArray()}>
        <group scale={look.large ? 1.08 : look.small ? 0.96 : 1}>
          <Head look={look} />
        </group>
      </group>
      {[0, 1].map((k) => (
        <group key={k}>
          <mesh ref={set(`upper${k}`)} userData={MOVES} geometry={limb} material={sleeve} castShadow />
          {/* shoulder joint */}
          {look.coat ? (
            <mesh ref={set(`shoulder${k}`)} userData={MOVES} geometry={JOINT_SMOOTH} material={sleeve} scale={0.052 * thick} />
          ) : (
            <mesh ref={set(`shoulder${k}`)} userData={MOVES} material={sleeve} scale={thick}>
              <icosahedronGeometry args={[0.052, 1]} />
            </mesh>
          )}
          {look.coat ? (
            <mesh ref={set(`elbow${k}`)} userData={MOVES} geometry={JOINT_SMOOTH} material={sleeve} scale={0.046 * thick} />
          ) : (
            <mesh ref={set(`elbow${k}`)} userData={MOVES} material={look.sleeves === 'long' ? sleeve : mat(look.skin)} scale={thick}>
              <icosahedronGeometry args={[0.046, 1]} />
            </mesh>
          )}
          <mesh ref={set(`fore${k}`)} userData={MOVES} geometry={limb} material={forearm} castShadow />
          {look.robe && (
            <mesh ref={set(`drape${k}`)} userData={MOVES} material={sleeve} castShadow>
              <boxGeometry args={[0.014, 0.1, 1]} />
            </mesh>
          )}
          <mesh ref={set(`hand${k}`)} userData={MOVES} material={mat(look.skin)} castShadow scale={thick}>
            <boxGeometry args={[0.062, 0.025, 0.085]} />
          </mesh>
        </group>
      ))}
      {action === 'phone' && <Phone y={tableY + 0.16} />}
      {action === 'raise' && (
        <group ref={chips} userData={MOVES}>
          <ChipStack position={[0, 0, 0]} count={RAISE_CHIPS} from={stackCount - RAISE_CHIPS} seed={RAISER * 10 + 1} />
        </group>
      )}
      {action === 'gaming' && <Mouse position={[-0.215, tableY, forward + 0.02]} />}
      {(action === 'cards' || action === 'checkPoint') && look.hand && (
        <group ref={cards} userData={MOVES}>
          {/* faces toward her: the group's +z points back at her chest after the turn */}
          <group rotation={[0, Math.PI, 0]}>
            <HeldCards cards={look.hand} />
          </group>
        </group>
      )}
    </group>
  )
}

// torso space (x, up, forward from the hips) -> chair space, with the lean
function onTorso(x: number, up: number, forward: number, lean = LEAN) {
  const c = Math.cos(lean)
  const si = Math.sin(lean)
  return new Vector3(x, HIP_Y + up * c - forward * si, up * si + forward * c)
}

// one smooth tube from hip to ankle, bending through the knee, tapering from a full
// thigh to a slimmer calf. no separate knee piece, so there's no bump at the joint
const legCache = new Map<string, TubeGeometry>()
function legGeometry(hip: Vec3, knee: Vec3, ankle: Vec3, thick: number) {
  const key = [...hip, ...knee, ...ankle, thick].join(',')
  let geometry = legCache.get(key)
  if (geometry) return geometry
  const [h, k, a] = [hip, knee, ankle].map((p) => new Vector3(...p))
  const curve = new CatmullRomCurve3([h, h.clone().lerp(k, 0.5), k, k.clone().lerp(a, 0.5), a], false, 'centripetal')
  const segments = 24
  const radial = 8
  geometry = new TubeGeometry(curve, segments, 1, radial, false)
  const position = geometry.attributes.position
  const offset = new Vector3()
  for (let i = 0; i <= segments; i++) {
    const along = i / segments
    // radius along the leg: thigh 0.075 -> knee 0.056 -> ankle 0.044
    const radius = thick * (along < 0.5 ? MathUtils.lerp(0.075, 0.056, s(along, 0, 0.5)) : MathUtils.lerp(0.056, 0.044, s(along, 0.5, 1)))
    const center = curve.getPointAt(along)
    for (let j = 0; j <= radial; j++) {
      const v = i * (radial + 1) + j
      offset.fromBufferAttribute(position, v).sub(center).multiplyScalar(radius)
      position.setXYZ(v, center.x + offset.x, center.y + offset.y, center.z + offset.z)
    }
  }
  geometry.computeVertexNormals()
  legCache.set(key, geometry)
  return geometry
}

function Legs({ look }: { look: Look }) {
  return (
    <group>
      {[-1, 1].map((side) => {
        const { thick, tall } = build(look)
        const x = side * (look.large ? 0.12 : look.small ? 0.08 : 0.09)
        // longer legs: knees further forward and a little higher
        const knee: Vec3 = [x + side * 0.01, 0.56 + (tall - 1) * 0.4, 0.42 * tall]
        const ankle: Vec3 = [x + side * 0.01, 0.1, 0.47 * tall]
        return (
          <group key={side}>
            <mesh geometry={legGeometry([x, HIP_Y, 0], knee, ankle, thick * (look.large ? 1.08 : 1))} material={mat(look.pants)} castShadow receiveShadow />
            {look.cargo && (
              // cargo pocket on the outside of the thigh, with a flap
              <group position={[x + side * 0.068, HIP_Y + 0.005, 0.24]}>
                <mesh material={mat(shade(look.pants, 0.92))}>
                  <boxGeometry args={[0.02, 0.09, 0.12]} />
                </mesh>
                <mesh position={[side * 0.004, 0.045, 0]} material={mat(shade(look.pants, 0.85))}>
                  <boxGeometry args={[0.024, 0.02, 0.125]} />
                </mesh>
              </group>
            )}
            <Shoe look={look} position={[ankle[0], 0, ankle[2] + 0.06]} />
          </group>
        )
      })}
      <Blob position={[0, HIP_Y + 0.03, 0.01]} radii={look.large ? [0.22, 0.08, 0.14] : [0.145, 0.06, 0.095]} color={look.pants} />
      {look.robe && (
        // the robe over her lap, then falling from the knees to just above the ankles
        <group>
          <mesh position={[0, HIP_Y + 0.07, 0.22]} rotation={[-0.06, 0, 0]} material={mat(look.top)} castShadow receiveShadow>
            <boxGeometry args={[0.3, 0.03, 0.44]} />
          </mesh>
          <mesh position={[0, 0.36, 0.475]} rotation={[0.06, 0, 0]} material={mat(look.top)} castShadow receiveShadow>
            <boxGeometry args={[0.32, 0.5, 0.03]} />
          </mesh>
        </group>
      )}
      {look.coat && [-1, 1].map((side) => <CoatTail key={side} look={look} side={side} />)}
      {look.skirt && (
        // mini skirt: around the hips and flaring out over the top of the thighs
        <group>
          <Blob position={[0, HIP_Y + 0.035, 0.03]} radii={[0.165, 0.075, 0.13]} color={look.top} />
          <mesh position={[0, HIP_Y + 0.05, 0.15]} rotation={[0.12, 0, 0]} material={mat(look.top)} castShadow>
            <boxGeometry args={[0.31, 0.05, 0.17]} />
          </mesh>
        </group>
      )}
    </group>
  )
}

function Head({ look }: { look: Look }) {
  return (
    <group>
      <mesh position={[0, 0.12, 0]} scale={[0.93, 1.07, 0.98]} material={mat(look.skin)} castShadow>
        <icosahedronGeometry args={[0.107, 1]} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.099, 0.115, -0.005]} scale={[0.5, 1, 0.8]} material={mat(look.skin)}>
            <icosahedronGeometry args={[0.027, 0]} />
          </mesh>
          <mesh position={[side * 0.035, 0.125, 0.1]}>
            <boxGeometry args={[0.02, 0.01, 0.006]} />
            <meshBasicMaterial color={COLOR.eyes} />
          </mesh>
          <mesh position={[side * 0.036, 0.147, 0.098]} rotation={[0, 0, side * -0.06]}>
            <boxGeometry args={[0.028, 0.006, 0.006]} />
            <meshBasicMaterial color={look.hair} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.1, 0.106]} rotation={[Math.PI / 2, 0, 0]} material={mat(shade(look.skin, 0.9))}>
        <coneGeometry args={[0.012, 0.03, 4]} />
      </mesh>
      <mesh geometry={look.style === 'mine' ? MY_HAIR : HAIR[look.style]} material={mat(look.hair)} castShadow />
      {look.stubble && <mesh geometry={STUBBLE} material={mat(mix('#0b0908', look.skin, 0.15))} />}
      {look.beard && (
        <>
          <mesh geometry={BEARD} material={mat(look.hair)} />
          {/* mustache */}
          <mesh position={[0, 0.082, 0.103]} rotation={[0.2, 0, 0]} material={mat(look.hair)}>
            <boxGeometry args={[0.048, 0.012, 0.012]} />
          </mesh>
        </>
      )}
      {look.style === 'bun' && <Blob position={[0, 0.2, -0.1]} radii={[0.05, 0.045, 0.045]} color={look.hair} />}
      {look.style === 'long' && <Blob position={[0, 0.02, -0.075]} radii={[0.1, 0.14, 0.045]} rotation={[0.15, 0, 0]} color={look.hair} />}
      {/* straight down her back, past the shoulder blades */}
      {look.style === 'longStraight' && <Blob position={[0, -0.07, -0.08]} radii={[0.1, 0.23, 0.04]} rotation={[0.18, 0, 0]} color={look.hair} />}
      {look.style === 'longBangs' && (
        // down the back past the shoulders, and a strand falling in front of each shoulder
        <>
          <Blob position={[0, -0.04, -0.08]} radii={[0.105, 0.2, 0.045]} rotation={[0.2, 0, 0]} color={look.hair} />
          {[-1, 1].map((side) => (
            <Blob key={side} position={[side * 0.092, -0.02, 0.0]} radii={[0.028, 0.13, 0.05]} rotation={[0.12, 0, side * 0.08]} color={look.hair} />
          ))}
        </>
      )}
    </group>
  )
}

// how wide chest logos are, in meters. the height follows the image so it never stretches
const CHEST_LOGO_WIDTH = 0.15

// a printed logo on the chest. hidden until the image loads, so a missing file just means
// a plain shirt
function ChestLogo({ src, position }: { src: string; position: Vec3 }) {
  const [texture, setTexture] = useState<Texture | null>(null)
  useEffect(() => {
    let loaded: Texture | null = null
    new TextureLoader().load(src, (t) => {
      t.colorSpace = SRGBColorSpace
      t.anisotropy = 4
      loaded = t
      setTexture(t)
    })
    return () => loaded?.dispose()
  }, [src])
  if (!texture) return null
  const { width, height } = texture.image as { width: number; height: number }
  return (
    <mesh position={position}>
      <planeGeometry args={[CHEST_LOGO_WIDTH, (CHEST_LOGO_WIDTH * height) / width]} />
      <meshStandardMaterial map={texture} transparent alphaTest={0.5} flatShading />
    </mesh>
  )
}

// wide sleeve hanging under the forearm, flat side facing out
const DOWN = new Vector3(0, -1, 0)
const basis = new Matrix4()
function hangSleeve(mesh: Mesh, elbow: Vector3, wrist: Vector3) {
  const along = wrist.clone().sub(elbow)
  const length = along.length()
  along.normalize()
  const side = new Vector3().crossVectors(DOWN, along)
  if (side.lengthSq() < 1e-6) side.set(1, 0, 0)
  side.normalize()
  const hang = new Vector3().crossVectors(along, side)
  basis.makeBasis(side, hang, along)
  mesh.quaternion.setFromRotationMatrix(basis)
  // fuller near the cuff, hanging below the arm
  mesh.position.copy(elbow).addScaledVector(along, length * 0.6).addScaledVector(hang, 0.06)
  mesh.scale.set(1, 1, length * 0.75)
}

// a strip lying on the chest along a path of [x, up] points (torso space), `width` wide off
// to one side of the path (side: which way in x the strip extends). for collars and lapels
function chestStrip(path: [number, number][], widths: number[], side: number, bodyWidth: number, out: number) {
  const positions: number[] = []
  const index: number[] = []
  path.forEach(([x, up], i) => {
    const [px, pu] = path[Math.max(i - 1, 0)]
    const [nx, nu] = path[Math.min(i + 1, path.length - 1)]
    // perpendicular to the path in the (x, up) plane, pointing toward `side`
    let ox = -(nu - pu)
    let ou = nx - px
    const length = Math.hypot(ox, ou) || 1
    ox /= length
    ou /= length
    if (ox * side < 0) {
      ox = -ox
      ou = -ou
    }
    const w = widths[i]
    positions.push(...onChest(x * bodyWidth, up, bodyWidth, out), ...onChest((x + ox * w) * bodyWidth, up + ou * w, bodyWidth, out))
    if (i) index.push(2 * i - 2, 2 * i - 1, 2 * i, 2 * i - 1, 2 * i + 1, 2 * i)
  })
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(index)
  geometry.computeVertexNormals()
  return geometry
}

// ao trang: wrap front. her left panel folds over the right one, so there's a v at the
// neck and the top panel's edge keeps going down across to her right side. the collar band
// runs along both edges and around the back of the neck
function RobeCollar({ look, width, tall }: { look: Look; width: number; tall: number }) {
  const band = smoothMat(shade(look.top, 1.08))
  const fold = smoothMat(shade(look.top, 0.5))
  const { under, over, inside } = useMemo(() => {
    const up = (v: number) => v * tall
    // her right panel (-x), from the neck down into the v
    const under = chestStrip(
      [[-0.065, up(0.525)], [-0.045, up(0.46)], [-0.022, up(0.39)], [-0.004, up(0.335)]],
      [0.036, 0.036, 0.034, 0.028],
      -1,
      width,
      0.004,
    )
    // her left panel on top, from the neck across to under her right arm
    const over = chestStrip(
      [[0.065, up(0.525)], [0.045, up(0.46)], [0.016, up(0.39)], [-0.03, up(0.32)], [-0.085, up(0.27)], [-0.14, up(0.22)]],
      [0.038, 0.038, 0.038, 0.036, 0.034, 0.03],
      1,
      width,
      0.007,
    )
    // shadow inside the v where the panels fold under
    const inside = new BufferGeometry()
    inside.setAttribute('position', new Float32BufferAttribute([...onChest(-0.065 * width, up(0.525), width, 0.002), ...onChest(0.065 * width, up(0.525), width, 0.002), ...onChest(-0.004 * width, up(0.335), width, 0.002)], 3))
    inside.computeVertexNormals()
    return { under, over, inside }
  }, [width, tall])
  return (
    <group>
      <mesh geometry={inside} material={fold} />
      <mesh geometry={under} material={band} />
      <mesh geometry={over} material={band} castShadow />
      {/* band around the back of the neck */}
      <mesh position={[0, 0.525 * tall, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[width, 1, 1]} material={band}>
        <torusGeometry args={[0.068, 0.014, 6, 16, Math.PI]} />
      </mesh>
    </group>
  )
}

// shirt collar points, flat on the chest inside the lapels
const shirtPointCache = new Map<string, BufferGeometry>()
const SHIRT_POINTS = [-1, 1].map((side) => (width: number, tall: number) => {
  const key = `${side},${width},${tall}`
  let geometry = shirtPointCache.get(key)
  if (!geometry) {
    geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute([...onChest(side * 0.012 * width, 0.53 * tall, width, 0.008), ...onChest(side * 0.05 * width, 0.515 * tall, width, 0.008), ...onChest(side * 0.024 * width, 0.465 * tall, width, 0.009)], 3))
    geometry.computeVertexNormals()
    shirtPointCache.set(key, geometry)
  }
  return geometry
})

// lab coat collar: stands up at the back of the neck and folds down over itself, open at the
// front where it turns into the lapels. lathe from the inner edge up and back down the outside
const COAT_COLLAR = new LatheGeometry(
  [
    [0.096, 0.49],
    [0.084, 0.53],
    [0.077, 0.565],
    [0.088, 0.568],
    [0.108, 0.54],
    [0.12, 0.505],
  ].map(([r, y]) => new Vector2(r, y)),
  24,
  0.55,
  Math.PI * 2 - 1.1,
)

// open white coat: collar and lapels, a breast pocket with a pen, shirt collar underneath
// (the shirt strip down the front is JACKET_GAP)
function LabCoat({ look, width, tall }: { look: Look; width: number; tall: number }) {
  const coat = smoothMat(look.top)
  const shirt = smoothMat(look.inner ?? '#ffffff')
  const lapels = useMemo(
    () =>
      [-1, 1].map((side) =>
        chestStrip(
          [[side * 0.05, 0.505 * tall], [side * 0.045, 0.45 * tall], [side * 0.04, 0.38 * tall], [side * 0.036, 0.3 * tall]],
          [0.05, 0.045, 0.028, 0.006],
          side,
          width,
          0.006,
        ),
      ),
    [width, tall],
  )
  return (
    <group>
      <mesh geometry={COAT_COLLAR} material={coat} scale={[width, tall, 0.78 * width]} castShadow />
      {lapels.map((geometry, i) => (
        <mesh key={i} geometry={geometry} material={coat} castShadow />
      ))}
      {/* shirt collar points */}
      {[-1, 1].map((side) => (
        <mesh key={side} geometry={SHIRT_POINTS[side > 0 ? 1 : 0](width, tall)} material={shirt} />
      ))}
      {/* breast pocket on his left, with a pen clipped in */}
      <mesh position={onChest(0.1 * width, 0.33 * tall, width, 0.005)} material={smoothMat(shade(look.top, 0.92))}>
        <planeGeometry args={[0.06, 0.06]} />
      </mesh>
      <mesh position={onChest(0.115 * width, 0.375 * tall, width, 0.009)} material={mat('#1f3f8a')}>
        <cylinderGeometry args={[0.005, 0.005, 0.05, 6]} />
      </mesh>
    </group>
  )
}

// coat front lying over one thigh and wrapping down its outside, a curved sheet following
// the thigh from the hip to just short of the knee
function CoatTail({ look, side }: { look: Look; side: number }) {
  const geometry = useMemo(() => {
    const { thick, tall } = build(look)
    const x = side * 0.09
    const hip = new Vector3(x, HIP_Y, -0.02)
    const knee = new Vector3(x + side * 0.01, 0.56 + (tall - 1) * 0.4, 0.42 * tall)
    const along = knee.clone().sub(hip)
    const up = new Vector3(0, 1, 0).addScaledVector(along.clone().normalize(), -along.clone().normalize().y).normalize()
    const out = new Vector3(side, 0, 0)
    const rings = 10
    const arc = 14
    // from a little past the top toward the middle, over the top, down the outside
    const from = -0.35
    const to = 2.1
    const positions: number[] = []
    const index: number[] = []
    for (let i = 0; i <= rings; i++) {
      const u = i / rings
      const center = hip.clone().addScaledVector(along, u * 0.85)
      // a bit looser at the hip, the coat hangs over the seat there
      const radius = thick * MathUtils.lerp(0.092, 0.07, u)
      for (let j = 0; j <= arc; j++) {
        const a = from + ((to - from) * j) / arc
        const p = center.clone().addScaledVector(up, Math.cos(a) * radius).addScaledVector(out, Math.sin(a) * radius)
        // the outside edge hangs a little lower
        if (a > Math.PI / 2) p.y -= (a - Math.PI / 2) * 0.03
        positions.push(p.x, p.y, p.z)
        if (i && j) {
          const k = i * (arc + 1) + j
          index.push(k - arc - 2, k - 1, k - arc - 1, k - 1, k, k - arc - 1)
        }
      }
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(positions, 3))
    g.setIndex(index)
    g.computeVertexNormals()
    return g
  }, [look, side])
  return <mesh geometry={geometry} material={smoothMat(look.top)} castShadow receiveShadow />
}

// worn around the coat collar: one tube from the chest piece on his left, around the back of
// the neck, down his right side to the y. from there two short rubber tubes, then the metal
// ear tubes curving out and back in like a heart, black tips at the bottom
function Stethoscope({ width, tall }: { width: number; tall: number }) {
  const tubing = smoothMat('#1d1f22')
  const metal = smoothMat('#a7adb4')
  const parts = useMemo(() => {
    const front = (x: number, up: number, out = 0.018) => new Vector3(...onChest(x * width, up * tall, width, out))
    const ring = (x: number, up: number, z: number) => new Vector3(x * width, up * tall, z * width)
    const tube = (points: Vector3[], radius: number) => new TubeGeometry(new CatmullRomCurve3(points), points.length * 8, radius, 8, false)
    const chest = front(0.07, 0.25)
    const y = front(-0.075, 0.385)
    const main = [
      chest,
      front(0.078, 0.32),
      front(0.084, 0.4),
      ring(0.1, 0.5, 0.045),
      ring(0.112, 0.54, 0.0),
      ring(0.08, 0.548, -0.062),
      ring(0, 0.55, -0.086),
      ring(-0.08, 0.548, -0.062),
      ring(-0.112, 0.54, 0.0),
      ring(-0.1, 0.5, 0.045),
      front(-0.082, 0.44),
      y,
    ]
    const branches = [-1, 1].map((k) => {
      const at = (dx: number, dup: number) => front(-0.075 + k * dx, 0.385 + dup, 0.02)
      const rubber = [y, at(0.008, -0.02), at(0.016, -0.045)]
      const rods = [at(0.016, -0.045), at(0.03, -0.08), at(0.036, -0.115), at(0.026, -0.148), at(0.01, -0.162)]
      return { rubber: tube(rubber, 0.0055), rods: tube(rods, 0.0035), tip: rods[rods.length - 1] }
    })
    return { main: tube(main, 0.0065), branches, chest }
  }, [width, tall])
  return (
    <group>
      <mesh geometry={parts.main} material={tubing} castShadow />
      {parts.branches.map(({ rubber, rods, tip }, i) => (
        <group key={i}>
          <mesh geometry={rubber} material={tubing} />
          <mesh geometry={rods} material={metal} />
          <mesh position={tip} geometry={JOINT_SMOOTH} material={tubing} scale={0.008} />
        </group>
      ))}
      {/* chest piece, just a round silver head */}
      <mesh position={[parts.chest.x, parts.chest.y - 0.018, parts.chest.z + 0.004]} rotation={[Math.PI / 2 - 0.12, 0, 0]} material={metal}>
        <cylinderGeometry args={[0.022, 0.022, 0.012, 20]} />
      </mesh>
    </group>
  )
}

// camisole: black body up to the chest, a cream lace edge, a tiny bow, thin straps
// over the shoulders. drawn over a skin-colored torso
const CAMI = new LatheGeometry(
  [
    [0, -0.045],
    [0.135, -0.045],
    [0.165, -0.022],
    [0.158, 0.08],
    [0.158, 0.2],
    [0.168, 0.32],
    [0.172, 0.39],
  ].map(([r, y]) => new Vector2(r + 0.003, y)),
  14,
)
// strap path along the torso surface: front of the neckline, over the shoulder, back down
const strapCache = new Map<string, TubeGeometry>()
function strap(side: number) {
  return (width: number, tall: number) => {
    const key = `${side},${width},${tall}`
    let geometry = strapCache.get(key)
    if (!geometry) {
      const x = side * 0.085 * width
      const front = [0.39, 0.45, 0.5].map((up) => new Vector3(...onChest(x, up * tall, width, 0.004)))
      const top = new Vector3(x, 0.528 * tall, 0)
      const back = [...front].reverse().map((p) => new Vector3(p.x, p.y, -p.z))
      geometry = new TubeGeometry(new CatmullRomCurve3([...front, top, ...back]), 20, 0.005, 4, false)
      strapCache.set(key, geometry)
    }
    return geometry
  }
}
const STRAPS = [strap(-1), strap(1)]

function Cami({ look, width, tall }: { look: Look; width: number; tall: number }) {
  const depth = TORSO_DEPTH * width
  const lace = mat('#e8dfcf')
  return (
    <group>
      <mesh geometry={CAMI} material={mat(look.top)} scale={[width, tall, depth]} castShadow />
      {/* lace edge along the neckline */}
      <mesh position={[0, 0.39 * tall, 0]} scale={[width, 1, depth]} material={lace}>
        <cylinderGeometry args={[0.183, 0.182, 0.012, 14, 1, true]} />
      </mesh>
      {/* bow at the center front */}
      <mesh position={[0, 0.385 * tall, 0.18 * depth + 0.004]} material={lace}>
        <boxGeometry args={[0.018, 0.008, 0.004]} />
      </mesh>
      {/* straps: up from the neckline, over the top of each shoulder, down the back */}
      {[-1, 1].map((side) => (
        <mesh key={side} geometry={STRAPS[side > 0 ? 1 : 0](width, tall)} material={mat(look.top)} />
      ))}
    </group>
  )
}

// thin gold chain around the neck with a small red heart pendant
function heartShape() {
  const shape = new Shape()
  shape.moveTo(0, -1)
  shape.bezierCurveTo(-0.2, -0.75, -1, -0.3, -1, 0.25)
  shape.bezierCurveTo(-1, 0.8, -0.35, 1, 0, 0.55)
  shape.bezierCurveTo(0.35, 1, 1, 0.8, 1, 0.25)
  shape.bezierCurveTo(1, -0.3, 0.2, -0.75, 0, -1)
  return new ShapeGeometry(shape, 6)
}
const HEART = heartShape()
const GOLD = new MeshStandardMaterial({ color: '#d4aa4f', metalness: 0.9, roughness: 0.3, side: DoubleSide })
const RED = new MeshStandardMaterial({ color: '#e3192c', roughness: 0.35, side: DoubleSide })
function Necklace({ width, tall }: { width: number; tall: number }) {
  // one closed loop: around the back of the neck just above the shoulders, then down
  // both sides onto the chest to the pendant
  const geometry = useMemo(() => {
    const neck = 0.046 // a hair wider than the neck
    const ringY = 0.545 * tall
    const around = [-1, -0.6, 0, 0.6, 1].map((k) => {
      const angle = Math.PI / 2 + (k * Math.PI) / 2 // left side, round the back, right side
      return new Vector3(Math.cos(angle) * neck * -1, ringY, 0.01 - Math.abs(Math.sin(angle)) * neck)
    })
    const down = (side: number) =>
      (
        [
          [0.044, 0.53],
          [0.036, 0.51],
          [0.018, 0.495],
        ] as const
      ).map(([x, up]) => new Vector3(...onChest(side * x * width, up * tall, width, 0.004)))
    const bottom = new Vector3(...onChest(0, 0.488 * tall, width, 0.004))
    const points = [bottom, ...down(-1).reverse(), ...around, ...down(1)]
    return new TubeGeometry(new CatmullRomCurve3(points, true), 40, 0.0016, 3, true)
  }, [width, tall])
  const pendant = onChest(0, 0.476 * tall, width, 0.006)
  return (
    <group>
      <mesh geometry={geometry} material={GOLD} />
      <mesh position={pendant} rotation={[-0.1, 0, 0]} scale={0.009} geometry={HEART} material={RED} />
    </group>
  )
}

// cream cardigan folded over the top of the chair back, sleeves hanging behind
function HungCardigan() {
  const knit = mat('#e7dcc6')
  return (
    <group position={[0, 0, -0.21]}>
      {/* rolled over the top edge */}
      <mesh position={[0, 0.975, 0]} rotation={[0, 0, Math.PI / 2]} material={knit} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 0.4, 8]} />
      </mesh>
      {/* front and back panels hanging down */}
      <mesh position={[0, 0.85, 0.035]} rotation={[0.08, 0, 0]} material={knit} castShadow>
        <boxGeometry args={[0.36, 0.25, 0.015]} />
      </mesh>
      <mesh position={[0, 0.8, -0.04]} rotation={[-0.1, 0, 0]} material={knit} castShadow>
        <boxGeometry args={[0.38, 0.34, 0.015]} />
      </mesh>
      {/* sleeves */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.15, 0.72, -0.06]} rotation={[-0.1, 0, side * 0.12]} material={knit} castShadow>
          <cylinderGeometry args={[0.028, 0.03, 0.42, 6]} />
        </mesh>
      ))}
    </group>
  )
}

// sneakers unless the look says otherwise. bare legs get a short sock
function Shoe({ look, position }: { look: Look; position: Vec3 }) {
  const scale = look.large ? 1.1 : look.small ? 0.9 : 1
  if (look.shoe === 'loafer') return <Loafer position={position} color={look.shoes} scale={scale} />
  if (look.shoe === 'sandal') return <Sandal position={position} skin={look.skin} color={look.shoes} scale={scale} />
  return (
    <group>
      <Sneaker position={position} colors={sneakerColors(look.shoes)} scale={scale} />
      {look.skirt && (
        <mesh position={[position[0], 0.115 * scale, position[2] - 0.06 * scale]} material={mat('#f4f2ee')}>
          <cylinderGeometry args={[0.036, 0.04, 0.05, 8]} />
        </mesh>
      )}
    </group>
  )
}

// mouse on a small dark pad, for the gamer
function Mouse({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.002, 0]} material={mat('#1d1e22')}>
        <boxGeometry args={[0.15, 0.004, 0.15]} />
      </mesh>
      <mesh position={[0, 0.016, 0]} scale={[0.032, 0.014, 0.055]} material={mat('#2b2d33')}>
        <sphereGeometry args={[1, 8, 6]} />
      </mesh>
    </group>
  )
}

// a phone held in both hands, screen lit
function Phone({ y }: { y: number }) {
  return (
    <group position={[0.005, y, 0.25]} rotation={[-0.9, 0, 0]}>
      <mesh material={mat('#1b1c20')}>
        <boxGeometry args={[0.07, 0.14, 0.008]} />
      </mesh>
      <mesh position={[0, 0, 0.0045]}>
        <planeGeometry args={[0.062, 0.128]} />
        <meshBasicMaterial color={COLOR.screen} side={DoubleSide} />
      </mesh>
    </group>
  )
}

// --- the sleeper: slumped forward over the table, head on folded arms, breathing slowly
export function Sleeper({ look, position, rotationY = 0 }: { look: Look; position: Vec3; rotationY?: number }) {
  const torso = useRef<Group>(null!)
  useFrame(({ clock }) => {
    if (!torso.current) return
    // a slow breath every ~4.5s, the back rising and falling
    const breath = (Math.sin(clock.elapsedTime * 1.4) + 1) / 2
    torso.current.scale.set(1 + breath * 0.02, 1, 1 + breath * 0.04)
  })
  const lean = 0.95
  const c = Math.cos(lean)
  const si = Math.sin(lean)
  const at = (x: number, up: number): Vec3 => [x, HIP_Y + up * c, up * si]
  const shoulderL = at(0.165, 0.44)
  const shoulderR = at(-0.165, 0.44)
  const armY = TABLE_HEIGHT + 0.045
  return (
    <group position={position} rotation={[0, rotationY, 0]} userData={{ dynamic: true }}>
      <Chair />
      <Legs look={look} />
      <group position={[0, HIP_Y, 0]} rotation={[lean, 0, 0]}>
        <group ref={torso}>
          <mesh geometry={TORSO} material={topMaterial(look, 'torso')} scale={[1, 1, TORSO_DEPTH]} castShadow receiveShadow />
          {look.inner && <mesh geometry={JACKET_GAP} material={mat(look.inner)} scale={[1, 1, TORSO_DEPTH + 0.02]} />}
          {look.pattern === 'flannel' && <Collar look={look} />}
        </group>
      </group>
      {/* arms folded on the table: upper arms down to the elbows, forearms crossed under the head */}
      {[shoulderL, shoulderR].map((at, i) => (
        <mesh key={i} position={at} material={topMaterial(look, 'sleeve')}>
          <icosahedronGeometry args={[0.052, 1]} />
        </mesh>
      ))}
      <Limb from={shoulderR} to={[-0.2, armY, 0.42]} radius={0.05} color={look.top} material={topMaterial(look, 'sleeve')} />
      <Limb from={shoulderL} to={[0.2, armY, 0.42]} radius={0.05} color={look.top} material={topMaterial(look, 'sleeve')} />
      <Limb from={[-0.2, armY, 0.42]} to={[0.12, armY, 0.5]} radius={0.045} color={look.top} material={look.sleeves === 'long' ? topMaterial(look, 'sleeve') : mat(look.skin)} />
      <Limb from={[0.2, armY, 0.42]} to={[-0.12, armY + 0.02, 0.52]} radius={0.045} color={look.top} material={look.sleeves === 'long' ? topMaterial(look, 'sleeve') : mat(look.skin)} />
      {/* head down on the arms, turned to the side */}
      <group position={[0.02, armY + 0.05, 0.47]} rotation={[1.25, 0, 0.55]}>
        <group position={[0, -0.12, 0]}>
          <Head look={look} />
        </group>
      </group>
    </group>
  )
}
