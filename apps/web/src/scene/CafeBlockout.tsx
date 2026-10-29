import {
  BANQUETTE,
  GROUP_SEATS,
  GROUP_TABLE,
  LAPTOP,
  MY_TABLE,
  SCREEN_SIZE,
  LID,
  SLEEPER_EMPTY_SEATS,
  SLEEPER_SEAT,
  SLEEPER_TABLE,
  STUDY_SEATS,
  STUDY_TABLE,
  WEST_TABLES,
  WINDOW_TABLE,
  WINDOW_TABLES,
  TABLE_HEIGHT,
  faceToward,
  type Vec3,
} from './layout'
import { LaptopSticker, type StickerKind } from './EasterEggs'
import { COLOR } from './palette'
import { Barista } from './Barista'
import { CAST, Customer, Sleeper, type Action, type Look } from './Customer'
import { Me } from './Me'
import { StringLights } from './StringLights'
import { Box, Chair } from './primitives'
import { DesktopScreen } from './DesktopScreen'
import { BoxGeometry, Color, MeshStandardMaterial } from 'three'
import { RoundedBox } from '@react-three/drei'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// who sits where
const POKER: { look: Look; action: Action }[] = [
  { look: CAST.kemal, action: 'checkPoint' }, // back to the bar
  { look: CAST.maya, action: 'cards' },
  { look: CAST.omar, action: 'raise' }, // nervous, about to raise
]
const STUDY: { look: Look; action: Action }[] = [
  { look: CAST.arjun, action: 'gaming' }, // League sticker laptop
  { look: CAST.ivy, action: 'typing' },
  { look: CAST.dev, action: 'notes' },
  { look: CAST.dev, action: 'notes' }, // empty seat
]
// per window table, bench and chair (only used where someone's sitting)
const BOOTH: { bench: { look: Look; action: Action }; chair: { look: Look; action: Action } }[] = [
  { bench: { look: CAST.lena, action: 'laughing' }, chair: { look: CAST.sam, action: 'chatting' } },
  { bench: { look: CAST.june, action: 'typing' }, chair: { look: CAST.sam, action: 'chatting' } },
  { bench: { look: CAST.lena, action: 'chatting' }, chair: { look: CAST.sam, action: 'chatting' } },
  { bench: { look: CAST.bea, action: 'phone' }, chair: { look: CAST.ray, action: 'typing' } },
]

// furniture and people. still mostly greybox, swap in real models later.
// room = Room.tsx, bar = Bar.tsx, back wall = BackWall.tsx

export function CafeBlockout() {
  return (
    <group>
      {/* my table */}
      <SquareTable position={MY_TABLE.position} size={MY_TABLE.size} />
      <Me />
      <Laptop position={LAPTOP.position} mine />
      <StringLights />

      {/* poker */}
      <RoundTable position={GROUP_TABLE.position} radius={GROUP_TABLE.radius} />
      {GROUP_SEATS.map((seat, i) => (
        <Customer key={i} look={POKER[i].look} action={POKER[i].action} position={seat} rotationY={faceToward(seat, GROUP_TABLE.position)} reach={0.4} phase={i * 3.7} table={Math.hypot(seat[0] - GROUP_TABLE.position[0], seat[2] - GROUP_TABLE.position[2])} />
      ))}

      {/* study group, desk clutter is in Tabletop.tsx */}
      <SquareTable position={STUDY_TABLE.position} size={STUDY_TABLE.size} />
      {STUDY_SEATS.map(({ position, occupied, sticker }, i) => {
        const [sx, , sz] = position
        const tz = STUDY_TABLE.position[2]
        // face across the table
        const facing = faceToward(position, [sx, 0, tz])
        const inward = sz < tz ? 1 : -1
        // flip for the south side. north pair angles inward (/ \ from the camera)
        const side = i % 2 === 0 ? 1 : -1
        const tilt = (inward > 0 ? -side : side) * 0.2
        return (
          <group key={i}>
            {occupied ? (
              <Customer look={STUDY[i].look} action={STUDY[i].action} position={position} rotationY={facing} reach={0.36} phase={i * 2.3} />
            ) : (
              <EmptyChair position={position} rotationY={facing} table={STUDY_TABLE.position} edge={STUDY_TABLE.size[1] / 2} />
            )}
            {occupied && (
              <Laptop position={[sx, TABLE_HEIGHT, sz + inward * 0.45]} rotationY={(inward > 0 ? 0 : Math.PI) + tilt} sticker={sticker} />
            )}
          </group>
        )
      })}

      <SleeperTable />
      <WindowBooth />
      <WestTables />
      <Barista />
    </group>
  )
}

type TableProps = { position: Vec3 }

function SquareTable({ position, size }: TableProps & { size: [number, number] }) {
  const [x, , z] = position
  const legHeight = TABLE_HEIGHT - 0.04
  return (
    <group>
      <Box position={[x, TABLE_HEIGHT - 0.02, z]} size={[size[0], 0.04, size[1]]} color={COLOR.tableTop} />
      <mesh position={[x, legHeight / 2, z]} castShadow receiveShadow>
        <cylinderGeometry args={[0.04, 0.04, legHeight, 8]} />
        <meshStandardMaterial color={COLOR.chair} flatShading />
      </mesh>
    </group>
  )
}

function RoundTable({ position, radius }: TableProps & { radius: number }) {
  const [x, , z] = position
  const legHeight = TABLE_HEIGHT - 0.04
  return (
    <group>
      <mesh position={[x, TABLE_HEIGHT - 0.02, z]} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, 0.04, 12]} />
        <meshStandardMaterial color={COLOR.tableTop} flatShading />
      </mesh>
      <mesh position={[x, legHeight / 2, z]} castShadow receiveShadow>
        <cylinderGeometry args={[0.04, 0.04, legHeight, 8]} />
        <meshStandardMaterial color={COLOR.chair} flatShading />
      </mesh>
    </group>
  )
}

// facing +z before rotationY
// pushed in so half the seat is under the table. edge = table center to its edge
function EmptyChair({ position, rotationY = 0, table, edge }: { position: Vec3; rotationY?: number; table: Vec3; edge: number }) {
  const ax = Math.sin(rotationY)
  const az = Math.cos(rotationY)
  const now = (table[0] - position[0]) * ax + (table[2] - position[2]) * az
  const want = edge
  const slide = now - want
  return (
    <group position={[position[0] + ax * slide, 0, position[2] + az * slide]} rotation={[0, rotationY, 0]}>
      <Chair />
    </group>
  )
}

// asleep on his arms. spilled coffee is in Tabletop.tsx
function SleeperTable() {
  const table = SLEEPER_TABLE.position
  return (
    <group>
      <SquareTable position={table} size={SLEEPER_TABLE.size} />
      {SLEEPER_EMPTY_SEATS.map((seat) => (
        <EmptyChair key={seat.join()} position={seat} rotationY={faceToward(seat, [seat[0], 0, table[2]])} table={table} edge={SLEEPER_TABLE.size[1] / 2} />
      ))}
      <Sleeper look={CAST.milo} position={SLEEPER_SEAT} rotationY={faceToward(SLEEPER_SEAT, [SLEEPER_SEAT[0], 0, table[2]])} />
      {/* pushed to the side, still open */}
      <Laptop position={[SLEEPER_SEAT[0] + 0.38, TABLE_HEIGHT, SLEEPER_SEAT[2] - 0.6]} rotationY={Math.PI - 0.35} />
    </group>
  )
}

// window bench + tables
const CUSHION = 0.1
// one cushion section per table
const BOOTH_SECTIONS = WINDOW_TABLES.map(({ z }, i) => {
  const prev = WINDOW_TABLES[i - 1]
  const next = WINDOW_TABLES[i + 1]
  return [prev ? (prev.z + z) / 2 : BANQUETTE.zFrom, next ? (next.z + z) / 2 : BANQUETTE.zTo] as const
})
const shadeHex = (color: string, amount: number) => `#${new Color(color).multiplyScalar(amount).getHexString()}`

function WindowBooth() {
  const { zFrom, zTo, depth, seatHeight, backHeight } = BANQUETTE
  const { x, size, benchX, chairX } = WINDOW_TABLE
  const length = zTo - zFrom
  const zMid = (zFrom + zTo) / 2
  // against the window's knee panel
  const backX = 6.07
  const seatX = backX - depth / 2
  // seat faces west
  const towardTables = -Math.PI / 2
  const towardWindow = Math.PI / 2
  return (
    <group>
      {/* frame */}
      <Box position={[seatX, (seatHeight - CUSHION) / 2, zMid]} size={[depth, seatHeight - CUSHION, length]} color={COLOR.chair} />
      <Box position={[seatX - depth / 2 + 0.01, 0.04, zMid]} size={[0.025, 0.08, length]} color={shadeHex(COLOR.chair, 0.75)} />
      <Box position={[backX - 0.03, backHeight / 2, zMid]} size={[0.06, backHeight, length]} color={COLOR.chair} />
      <Box position={[backX - 0.05, backHeight + 0.015, zMid]} size={[0.11, 0.03, length]} color={COLOR.chair} />
      {/* cushions */}
      {BOOTH_SECTIONS.map(([from, to]) => {
        const z = (from + to) / 2
        const long = to - from - 0.02
        return (
          <group key={from}>
            <RoundedBox args={[depth - 0.07, CUSHION, long]} radius={0.03} smoothness={2} position={[seatX - 0.03, seatHeight - CUSHION / 2, z]} castShadow receiveShadow>
              <meshStandardMaterial color={COLOR.banquette} flatShading roughness={0.7} />
            </RoundedBox>
            <RoundedBox args={[0.09, backHeight - seatHeight - 0.09, long]} radius={0.035} smoothness={2} position={[backX - 0.1, (seatHeight + backHeight - 0.06) / 2 + 0.01, z]} rotation={[0, 0, 0.08]} castShadow receiveShadow>
              <meshStandardMaterial color={COLOR.banquette} flatShading roughness={0.7} />
            </RoundedBox>
          </group>
        )
      })}

      {WINDOW_TABLES.map(({ z, bench, chair, laptop }, i) => (
        <group key={z}>
          <SquareTable position={[x, 0, z]} size={[size, size]} />
          {bench && (
            <Customer
              look={BOOTH[i].bench.look}
              action={BOOTH[i].bench.action}
              position={[benchX, 0, z]}
              rotationY={towardTables}
              reach={laptop === 'bench' ? 0.47 : 0.42}
              seatY={BANQUETTE.seatHeight}
              phase={i * 5.1}
              noChair
            />
          )}
          {chair ? (
            <Customer look={BOOTH[i].chair.look} action={BOOTH[i].chair.action} position={[chairX, 0, z]} rotationY={towardWindow} reach={laptop === 'chair' ? 0.38 : 0.33} phase={i * 3.3 + 1} />
          ) : (
            <EmptyChair position={[chairX, 0, z]} rotationY={towardWindow} table={[x, 0, z]} edge={size / 2} />
          )}
          {/* turn toward whoever's using it */}
          {laptop === 'bench' && <Laptop position={[x + 0.12, TABLE_HEIGHT, z]} rotationY={-Math.PI / 2} />}
          {laptop === 'chair' && <Laptop position={[x - 0.12, TABLE_HEIGHT, z]} rotationY={Math.PI / 2} />}
        </group>
      ))}
    </group>
  )
}

// west wall tables
function WestTables() {
  return (
    <group>
      {WEST_TABLES.map(({ position, seats: [north, south] }) => {
        const [x, , z] = position
        const northSeat: Vec3 = [x, 0, z - 0.55]
        const southSeat: Vec3 = [x, 0, z + 0.55]
        return (
          <group key={z}>
            <SquareTable position={position} size={[0.7, 0.6]} />
            {north ? (
              <Customer look={CAST.nora} action="reading" position={northSeat} rotationY={faceToward(northSeat, position)} reach={0.32} />
            ) : (
              <EmptyChair position={northSeat} rotationY={faceToward(northSeat, position)} table={position} edge={0.3} />
            )}
            {south ? (
              <Customer look={CAST.kai} action="reading" position={southSeat} rotationY={faceToward(southSeat, position)} reach={0.32} />
            ) : (
              <EmptyChair position={southSeat} rotationY={faceToward(southSeat, position)} table={position} edge={0.3} />
            )}
          </group>
        )
      })}
    </group>
  )
}

// faces +z
// mine: shows the desktop (DesktopScreen)
type LaptopProps = { position: Vec3; rotationY?: number; sticker?: StickerKind; mine?: boolean }

// key widths in u, 15u per row. rows go from the hinge (+z) toward the user
const KEY_ROWS: number[][] = [
  // esc, F1-F12, power (a short row)
  Array(14).fill(15 / 14),
  // ` 1-0 - =, delete
  [...Array(13).fill(1), 2],
  // tab, q-p [ ], \
  [1.5, ...Array(12).fill(1), 1.5],
  // caps, a-l ; ', return
  [1.75, ...Array(11).fill(1), 2.25],
  // shift, z-/, shift
  [2.25, ...Array(10).fill(1), 2.75],
  // fn ctrl opt cmd, space, cmd opt, then the arrows (up/down share the middle slot)
  [1, 1, 1, 1.25, 5.5, 1.25, 1, 1, 1, 1],
]
const KEYBOARD = (() => {
  const unit = 0.018
  const gap = 0.0028
  const keys: BoxGeometry[] = []
  const add = (x: number, z: number, width: number, depth: number) => {
    const geometry = new BoxGeometry(width, 0.003, depth)
    geometry.translate(x, 0.0015, z)
    keys.push(geometry)
  }
  let z = 0.094
  KEY_ROWS.forEach((row, r) => {
    const depth = r === 0 ? unit * 0.55 : unit
    z -= depth / 2
    let x = (-15 * unit) / 2
    row.forEach((width, i) => {
      const center = x + (width * unit) / 2
      const w = width * unit - gap
      const d = depth - gap
      if (r === KEY_ROWS.length - 1 && i === row.length - 2) {
        // up/down arrows
        add(center, z + d / 4 + gap / 4, w, d / 2 - gap / 2)
        add(center, z - d / 4 - gap / 4, w, d / 2 - gap / 2)
      } else if (r === KEY_ROWS.length - 1 && (i === row.length - 1 || i === row.length - 3)) {
        // left/right arrows
        add(center, z - d / 4 - gap / 4, w, d / 2 - gap / 2)
      } else {
        add(center, z, w, d)
      }
      x += width * unit
    })
    z -= depth / 2
  })
  return mergeGeometries(keys)
})()
const KEY_MATERIAL = new MeshStandardMaterial({ color: '#2a2c31', roughness: 0.8, flatShading: true })

// screen faces -z, hinged at the back
function Laptop({ position, rotationY = 0, sticker, mine = false }: LaptopProps) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <Box position={[0, 0.0075, 0]} size={[LID.width, 0.015, 0.22]} color={COLOR.laptop} />
      {/* keyboard + trackpad */}
      <mesh geometry={KEYBOARD} material={KEY_MATERIAL} position={[0, 0.015, 0]} receiveShadow />
      <Box position={[0, 0.0152, -0.068]} size={[0.11, 0.0006, 0.065]} color="#959aa3" />
      <group position={[0, 0.015, 0.11]} rotation={[LAPTOP.tilt, 0, 0]}>
        <Box position={[0, LID.height / 2, 0]} size={[LID.width, LID.height, 0.008]} color={COLOR.laptop} />
        {/* kept under the bloom threshold so the full-screen shot stays sharp */}
        <mesh position={[0, LID.height / 2, -0.0045]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[SCREEN_SIZE.width, SCREEN_SIZE.height]} />
          <meshBasicMaterial color={mine ? '#0b0a10' : COLOR.screen} />
        </mesh>
        {/* draws itself over the black screen in its own pass */}
        {mine && <DesktopScreen />}
        {sticker && <LaptopSticker kind={sticker} position={[0, LID.height / 2, -0.0055]} rotationY={Math.PI} onScreen />}
      </group>
    </group>
  )
}
