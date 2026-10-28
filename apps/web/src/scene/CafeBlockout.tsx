import {
  BANQUETTE,
  GROUP_SEATS,
  GROUP_TABLE,
  LAPTOP,
  MY_TABLE,
  SCREEN_SIZE,
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
import { Me } from './Me'
import { StringLights } from './StringLights'
import { Box, Chair } from './primitives'

// furniture and people. still mostly greybox, swap in real models later.
// room = Room.tsx, bar = Bar.tsx, back wall = BackWall.tsx

export function CafeBlockout() {
  return (
    <group>
      {/* my table */}
      <SquareTable position={MY_TABLE.position} size={MY_TABLE.size} />
      <Me />
      <Laptop position={LAPTOP.position} />
      <StringLights />

      {/* poker */}
      <RoundTable position={GROUP_TABLE.position} radius={GROUP_TABLE.radius} />
      {GROUP_SEATS.map((seat, i) => (
        <SeatedPerson key={i} position={seat} rotationY={faceToward(seat, GROUP_TABLE.position)} />
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
            <SeatedPerson position={position} rotationY={facing} empty={!occupied} />
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

type PersonProps = { position: Vec3; rotationY?: number; color?: string; empty?: boolean; noChair?: boolean }

// faces +z. empty = chair only, noChair = person only (for the bench)
function SeatedPerson({ position, rotationY = 0, color = COLOR.person, empty = false, noChair = false }: PersonProps) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {!noChair && <Chair />}
      {!empty && <SeatedBody color={color} />}
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
        <SeatedPerson key={seat.join()} position={seat} rotationY={faceToward(seat, [seat[0], 0, table[2]])} empty />
      ))}
      <group position={SLEEPER_SEAT} rotation={[0, faceToward(SLEEPER_SEAT, [SLEEPER_SEAT[0], 0, table[2]]), 0]}>
        <Chair />
        <SleepingBody color={COLOR.person} />
      </group>
      {/* pushed to the side, still open */}
      <Laptop position={[SLEEPER_SEAT[0] + 0.38, TABLE_HEIGHT, SLEEPER_SEAT[2] - 0.6]} rotationY={Math.PI - 0.35} />
    </group>
  )
}

// slumped over the table, faces +z
function SleepingBody({ color }: { color: string }) {
  const lean = 0.85 // radians
  return (
    <>
      {/* thighs */}
      <Box position={[0, 0.55, 0.18]} size={[0.32, 0.14, 0.36]} color={color} />
      {/* torso, pivots at the hips */}
      <group position={[0, 0.55, 0]} rotation={[lean, 0, 0]}>
        <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
          <capsuleGeometry args={[0.17, 0.3, 4, 8]} />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
      </group>
      {/* arms folded, head on them */}
      <Box position={[0, TABLE_HEIGHT + 0.035, 0.5]} size={[0.42, 0.07, 0.16]} color={color} />
      <mesh position={[0.02, TABLE_HEIGHT + 0.17, 0.5]} rotation={[0.2, 0, 0.5]} castShadow receiveShadow>
        <sphereGeometry args={[0.12, 12, 10]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
    </>
  )
}

// window bench + tables
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
      <Box position={[seatX, (seatHeight - 0.08) / 2, zMid]} size={[depth, seatHeight - 0.08, length]} color={COLOR.wainscot} />
      <Box position={[seatX, seatHeight - 0.04, zMid]} size={[depth, 0.08, length]} color={COLOR.banquette} />
      <Box position={[backX - 0.06, (seatHeight + backHeight) / 2, zMid]} size={[0.12, backHeight - seatHeight, length]} color={COLOR.banquette} />

      {WINDOW_TABLES.map(({ z, bench, chair, laptop }) => (
        <group key={z}>
          <SquareTable position={[x, 0, z]} size={[size, size]} />
          {bench && <SeatedPerson position={[benchX, 0, z]} rotationY={towardTables} noChair />}
          <SeatedPerson position={[chairX, 0, z]} rotationY={towardWindow} empty={!chair} />
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
            <SeatedPerson position={northSeat} rotationY={faceToward(northSeat, position)} empty={!north} />
            <SeatedPerson position={southSeat} rotationY={faceToward(southSeat, position)} empty={!south} />
          </group>
        )
      })}
    </group>
  )
}

function SeatedBody({ color }: { color: string }) {
  return (
    <>
      {/* thighs */}
      <Box position={[0, 0.55, 0.18]} size={[0.32, 0.14, 0.36]} color={color} />
      {/* torso */}
      <mesh position={[0, 0.82, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[0.17, 0.3, 4, 8]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      {/* head */}
      <mesh position={[0, 1.25, 0.02]} castShadow receiveShadow>
        <sphereGeometry args={[0.12, 12, 10]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
    </>
  )
}

// faces +z
type LaptopProps = { position: Vec3; rotationY?: number; sticker?: StickerKind }

// screen faces -z, hinged at the back
function Laptop({ position, rotationY = 0, sticker }: LaptopProps) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <Box position={[0, 0.0075, 0]} size={[0.32, 0.015, 0.22]} color={COLOR.laptop} />
      <group position={[0, 0.015, 0.11]} rotation={[LAPTOP.tilt, 0, 0]}>
        <Box position={[0, 0.105, 0]} size={[0.32, 0.21, 0.008]} color={COLOR.laptop} />
        {/* kept under the bloom threshold so the full-screen shot stays sharp */}
        <mesh position={[0, 0.105, -0.0045]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[SCREEN_SIZE.width, SCREEN_SIZE.height]} />
          <meshBasicMaterial color={COLOR.screen} />
        </mesh>
        {sticker && <LaptopSticker kind={sticker} position={[0, 0.105, -0.0055]} rotationY={Math.PI} onScreen />}
      </group>
    </group>
  )
}
