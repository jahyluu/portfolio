import { DoubleSide } from 'three'
import {
  BANQUETTE,
  BARISTA,
  GROUP_SEATS,
  GROUP_TABLE,
  LAPTOP,
  ME,
  MY_TABLE,
  PENDANT,
  ROOM,
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
import { COLOR, GLOW } from './palette'
import { Box } from './primitives'

// greybox stand-in. swap for real models later, keep the same positions.
// the room shell is in Room.tsx, the bar in Bar.tsx, the wall behind it in BackWall.tsx

export function CafeBlockout() {
  return (
    <group>
      {/* hero table */}
      <SquareTable position={MY_TABLE.position} size={MY_TABLE.size} />
      <SeatedPerson position={ME.position} rotationY={ME.rotationY} color={COLOR.hoodie} />
      <Laptop position={LAPTOP.position} />
      <Pendant position={PENDANT.position} />

      {/* group table */}
      <RoundTable position={GROUP_TABLE.position} radius={GROUP_TABLE.radius} />
      {GROUP_SEATS.map((seat, i) => (
        <SeatedPerson key={i} position={seat} rotationY={faceToward(seat, GROUP_TABLE.position)} />
      ))}

      {/* study group: three working, one empty chair. papers etc. are in Tabletop.tsx */}
      <SquareTable position={STUDY_TABLE.position} size={STUDY_TABLE.size} />
      {STUDY_SEATS.map(({ position, occupied, sticker }, i) => {
        const [sx, , sz] = position
        const tz = STUDY_TABLE.position[2]
        // face straight across the table
        const facing = faceToward(position, [sx, 0, tz])
        const inward = sz < tz ? 1 : -1
        // laptops face whoever's on the -z side by default, so flip for the south side.
        // kept close to each person and angled a little so facing ones never touch
        const tilt = (i % 2 === 0 ? 1 : -1) * 0.2
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

      {/* barista. the bar itself is in Bar.tsx */}
      <StandingPerson position={BARISTA} />
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

// faces +z, chair back at -z. empty = just the chair, noChair = just the person (banquette)
function SeatedPerson({ position, rotationY = 0, color = COLOR.person, empty = false, noChair = false }: PersonProps) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {!noChair && <Chair />}
      {!empty && <SeatedBody color={color} />}
    </group>
  )
}

// the guy who fell asleep: slumped over his folded arms, laptop pushed aside.
// the spilled coffee is in Tabletop.tsx
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
      {/* pushed off to his right, still open. faces him (he's on the +z side), angled */}
      <Laptop position={[SLEEPER_SEAT[0] + 0.38, TABLE_HEIGHT, SLEEPER_SEAT[2] - 0.6]} rotationY={Math.PI - 0.35} />
    </group>
  )
}

// slumped forward from the hips, head down on folded forearms resting on the table.
// faces +z like SeatedBody
function SleepingBody({ color }: { color: string }) {
  const lean = 0.85 // radians forward from upright
  return (
    <>
      {/* thighs */}
      <Box position={[0, 0.55, 0.18]} size={[0.32, 0.14, 0.36]} color={color} />
      {/* torso, pivoting at the hips */}
      <group position={[0, 0.55, 0]} rotation={[lean, 0, 0]}>
        <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
          <capsuleGeometry args={[0.17, 0.3, 4, 8]} />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
      </group>
      {/* folded forearms on the table, head resting on them, turned a little to the side */}
      <Box position={[0, TABLE_HEIGHT + 0.035, 0.5]} size={[0.42, 0.07, 0.16]} color={color} />
      <mesh position={[0.02, TABLE_HEIGHT + 0.17, 0.5]} rotation={[0.2, 0, 0.5]} castShadow receiveShadow>
        <sphereGeometry args={[0.12, 12, 10]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
    </>
  )
}

function Chair() {
  return (
    <>
      <Box position={[0, 0.45, 0]} size={[0.45, 0.05, 0.45]} color={COLOR.chair} />
      <Box position={[0, 0.72, -0.21]} size={[0.45, 0.5, 0.05]} color={COLOR.chair} />
    </>
  )
}

// banquette along the window + a row of small tables, chairs on the aisle side
function WindowBooth() {
  const { zFrom, zTo, depth, seatHeight, backHeight } = BANQUETTE
  const { x, size, benchX, chairX } = WINDOW_TABLE
  const length = zTo - zFrom
  const zMid = (zFrom + zTo) / 2
  // back of the bench sits against the window's base panel
  const backX = 6.07
  const seatX = backX - depth / 2
  // seat side faces west (-x), toward the tables
  const towardTables = -Math.PI / 2
  const towardWindow = Math.PI / 2
  return (
    <group>
      {/* bench base, seat cushion, back cushion */}
      <Box position={[seatX, (seatHeight - 0.08) / 2, zMid]} size={[depth, seatHeight - 0.08, length]} color={COLOR.wainscot} />
      <Box position={[seatX, seatHeight - 0.04, zMid]} size={[depth, 0.08, length]} color={COLOR.banquette} />
      <Box position={[backX - 0.06, (seatHeight + backHeight) / 2, zMid]} size={[0.12, backHeight - seatHeight, length]} color={COLOR.banquette} />

      {WINDOW_TABLES.map(({ z, bench, chair, laptop }) => (
        <group key={z}>
          <SquareTable position={[x, 0, z]} size={[size, size]} />
          {bench && <SeatedPerson position={[benchX, 0, z]} rotationY={towardTables} noChair />}
          <SeatedPerson position={[chairX, 0, z]} rotationY={towardWindow} empty={!chair} />
          {/* laptops face -z by default: turn toward whoever is using it */}
          {laptop === 'bench' && <Laptop position={[x + 0.12, TABLE_HEIGHT, z]} rotationY={-Math.PI / 2} />}
          {laptop === 'chair' && <Laptop position={[x - 0.12, TABLE_HEIGHT, z]} rotationY={Math.PI / 2} />}
        </group>
      ))}
    </group>
  )
}

// small tables for two on the west wall, chairs on the north and south sides
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
function StandingPerson({ position, rotationY = 0, color = COLOR.person }: PersonProps) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <Box position={[0, 0.42, 0]} size={[0.3, 0.84, 0.2]} color={color} />
      <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[0.18, 0.4, 4, 8]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      <mesh position={[0, 1.68, 0.02]} castShadow receiveShadow>
        <sphereGeometry args={[0.12, 12, 10]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
    </group>
  )
}

type LaptopProps = { position: Vec3; rotationY?: number; sticker?: StickerKind }

// screen faces -z, hinged at the far edge and tilted ~15deg. sticker = logo shown on the screen
function Laptop({ position, rotationY = 0, sticker }: LaptopProps) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <Box position={[0, 0.0075, 0]} size={[0.32, 0.015, 0.22]} color={COLOR.laptop} />
      <group position={[0, 0.015, 0.11]} rotation={[LAPTOP.tilt, 0, 0]}>
        <Box position={[0, 0.105, 0]} size={[0.32, 0.21, 0.008]} color={COLOR.laptop} />
        {/* display, user-facing side. kept under bloom threshold so the full-screen frame stays crisp */}
        <mesh position={[0, 0.105, -0.0045]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[SCREEN_SIZE.width, SCREEN_SIZE.height]} />
          <meshBasicMaterial color={COLOR.screen} />
        </mesh>
        {sticker && <LaptopSticker kind={sticker} position={[0, 0.105, -0.0055]} rotationY={Math.PI} onScreen />}
      </group>
    </group>
  )
}

// cord + shade + bulb
function Pendant({ position }: { position: Vec3 }) {
  const [x, y, z] = position
  const cord = ROOM.height - y
  return (
    <group>
      <mesh position={[x, y + cord / 2, z]}>
        <cylinderGeometry args={[0.006, 0.006, cord, 4]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[x, y, z]}>
        <coneGeometry args={[0.22, 0.25, 8, 1, true]} />
        <meshStandardMaterial color={COLOR.shade} side={DoubleSide} flatShading />
      </mesh>
      <mesh position={[x, y - 0.08, z]}>
        <sphereGeometry args={[0.05, 8, 6]} />
        <meshBasicMaterial color={GLOW.bulb} />
      </mesh>
    </group>
  )
}
