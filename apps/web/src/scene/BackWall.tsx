import { useMemo } from 'react'
import { Instance, Instances, Text } from '@react-three/drei'
import { BAR, BOUNDS, ROOM, WAINSCOT_HEIGHT, type Vec3 } from './layout'
import { BRIGHTNESS } from './Lighting'
import { COLOR, GLOW } from './palette'
import { Box, Cylinder, GlassMaterial, seeded } from './primitives'

// everything on the north wall behind the bar: wood slats, back counter with
// the coffee gear, lit cup shelves, bottle shelf, menu board, trailing vines
const WALL = BOUNDS.minZ // plaster face
const PANEL = WALL + 0.02 // front of the wainscot
const COUNTER_FRONT = PANEL + BAR.backDepth
const COUNTER_Z = (PANEL + COUNTER_FRONT) / 2

// lit cup shelves cover this stretch of wall. boards = y of each shelf
const SHELF = { xFrom: 0.6, xTo: 4.2, boards: [1.22, 1.52, 1.82, 2.12], depth: 0.26 }
// bottles up top, a bit wider than the cup shelves
const BOTTLE_SHELF = { xFrom: 0.2, xTo: 4.6, y: 2.32, depth: 0.22 }
// left of the shelves, over the grinder and cup stacks
const MENU = { x: -0.6, y: 1.65, width: 1.5, height: 0.8 }
// potted vines on the bottle shelf, trailing down
const VINES = [
  { x: 0.3, length: 0.75 },
  { x: 2.4, length: 0.3 },
  { x: 4.45, length: 0.85 },
]
const SLAT_SPACING = 0.1
// slides all the coffee gear right so it's centered under the lit shelves
const GEAR_OFFSET = 0.55

export function BackWall() {
  return (
    <group>
      <SlatWall />
      <BackCounter />
      <CoffeeGear />
      <CupShelves />
      <BottleShelf />
      <MenuBoard />
      <Vines />
    </group>
  )
}

// vertical battens from the wainscot up to the ceiling, behind the whole bar
function SlatWall() {
  const height = ROOM.height - WAINSCOT_HEIGHT
  const y = WAINSCOT_HEIGHT + height / 2
  const width = BAR.xTo - BAR.xFrom
  const count = Math.floor(width / SLAT_SPACING)
  return (
    <group>
      {/* dark backing that shows between the slats */}
      <Box position={[(BAR.xFrom + BAR.xTo) / 2, y, WALL + 0.005]} size={[width, height, 0.01]} color={COLOR.floorBase} castShadow={false} />
      <Instances limit={count} receiveShadow>
        <boxGeometry args={[0.045, height, 0.03]} />
        <meshStandardMaterial flatShading />
        {Array.from({ length: count }, (_, i) => (
          <Instance
            key={i}
            position={[BAR.xFrom + SLAT_SPACING * (i + 0.5), y, WALL + 0.025]}
            color={seeded(i) > 0.5 ? COLOR.slat : COLOR.slatAlt}
          />
        ))}
      </Instances>
    </group>
  )
}

function BackCounter() {
  const width = BAR.xTo - BAR.xFrom
  const x = (BAR.xFrom + BAR.xTo) / 2
  const bodyHeight = BAR.backHeight - 0.04
  const doors = Math.floor(width / 0.6)
  return (
    <group>
      <Box position={[x, bodyHeight / 2, COUNTER_Z]} size={[width, bodyHeight, BAR.backDepth]} color={COLOR.barBody} />
      <Box position={[x, BAR.backHeight - 0.02, COUNTER_Z]} size={[width + 0.02, 0.04, BAR.backDepth + 0.02]} color={COLOR.bamboo} />
      {/* cabinet door seams, facing the barista */}
      {Array.from({ length: doors - 1 }, (_, i) => (
        <Box
          key={i}
          position={[BAR.xFrom + 0.6 * (i + 1), bodyHeight / 2, COUNTER_FRONT + 0.003]}
          size={[0.012, bodyHeight - 0.12, 0.006]}
          color={COLOR.floorBase}
          castShadow={false}
        />
      ))}
    </group>
  )
}

function CoffeeGear() {
  const top = BAR.backHeight
  const z = COUNTER_Z
  const front = COUNTER_FRONT
  return (
    <group position={[GEAR_OFFSET, 0, 0]}>
      {/* espresso machine: body, top tray, drip tray, two group heads + handles, cups warming on top */}
      <Box position={[1.6, top + 0.21, z]} size={[0.7, 0.42, 0.48]} color={COLOR.steel} />
      <Box position={[1.6, top + 0.435, z]} size={[0.7, 0.03, 0.48]} color={COLOR.black} />
      <Box position={[1.6, top + 0.015, front - 0.07]} size={[0.6, 0.03, 0.12]} color={COLOR.black} />
      <Cylinder position={[1.45, top + 0.13, front - 0.1]} radius={0.035} height={0.06} color={COLOR.black} />
      <Cylinder position={[1.75, top + 0.13, front - 0.1]} radius={0.035} height={0.06} color={COLOR.black} />
      <Box position={[1.45, top + 0.11, front - 0.02]} size={[0.025, 0.025, 0.12]} color={COLOR.black} />
      <Box position={[1.75, top + 0.11, front - 0.02]} size={[0.025, 0.025, 0.12]} color={COLOR.black} />
      {[1.42, 1.6, 1.78].map((x) => (
        <Cylinder key={x} position={[x, top + 0.485, z]} radius={[0.035, 0.03]} height={0.07} color={COLOR.ceramics[0]} />
      ))}

      {/* milk pitchers */}
      <Cylinder position={[2.05, top + 0.05, front - 0.12]} radius={[0.035, 0.042]} height={0.1} color={COLOR.steel} />
      <Cylinder position={[2.16, top + 0.05, front - 0.22]} radius={[0.035, 0.042]} height={0.1} color={COLOR.steel} />

      {/* grinder: base, bean hopper, lid */}
      <Box position={[0.85, top + 0.15, z]} size={[0.18, 0.3, 0.22]} color={COLOR.black} />
      <Cylinder position={[0.85, top + 0.4, z]} radius={[0.085, 0.045]} height={0.2} color={COLOR.beans} />
      <Cylinder position={[0.85, top + 0.51, z]} radius={0.088} height={0.02} color={COLOR.black} />

      {/* drip brewer + carafe */}
      <Box position={[2.55, top + 0.21, z - 0.04]} size={[0.26, 0.42, 0.3]} color={COLOR.black} />
      <Cylinder position={[2.55, top + 0.07, front - 0.12]} radius={0.07} height={0.14} color={COLOR.coffee} />

      {/* blender: base, glass jar, lid */}
      <Box position={[3.05, top + 0.06, z]} size={[0.18, 0.12, 0.18]} color={COLOR.black} />
      <mesh position={[3.05, top + 0.26, z]}>
        <cylinderGeometry args={[0.085, 0.06, 0.28, 8]} />
        <GlassMaterial />
      </mesh>
      <Cylinder position={[3.05, top + 0.41, z]} radius={0.088} height={0.02} color={COLOR.black} />

      {/* gooseneck kettle */}
      <Cylinder position={[3.45, top + 0.07, z + 0.05]} radius={[0.06, 0.08]} height={0.14} color={COLOR.steel} />
      <Cylinder position={[3.54, top + 0.12, z + 0.05]} radius={0.008} height={0.18} rotation={[0, 0, -0.9]} color={COLOR.steel} />

      {/* stacks of clean cups */}
      {[0.25, 0.37, 0.49].flatMap((x) =>
        Array.from({ length: 5 }, (_, i) => (
          <Cylinder key={`${x}-${i}`} position={[x, top + 0.025 + i * 0.045, z]} radius={[0.04, 0.03]} height={0.05} color={COLOR.ceramics[0]} />
        )),
      )}
    </group>
  )
}

// what sits on each lit shelf, bottom to top. x = item center along the wall.
// kept sparse on purpose, a real back bar has breathing room
type ShelfItem =
  | { kind: 'syrup'; x: number; color: number }
  | { kind: 'liquor'; x: number; shape: 'round' | 'square' | 'tall'; color: number }
  | { kind: 'jar' | 'utensils' | 'cups' | 'saucers'; x: number }

const SHELF_ITEMS: ShelfItem[][] = [
  // bottom: syrups with pumps, bean jars, utensils
  [
    { kind: 'jar', x: 0.78 },
    { kind: 'jar', x: 0.95 },
    { kind: 'syrup', x: 1.25, color: 0 },
    { kind: 'syrup', x: 1.36, color: 1 },
    { kind: 'syrup', x: 1.47, color: 2 },
    { kind: 'syrup', x: 1.58, color: 3 },
    { kind: 'utensils', x: 1.95 },
    { kind: 'jar', x: 2.3 },
    { kind: 'syrup', x: 2.65, color: 4 },
    { kind: 'syrup', x: 2.76, color: 0 },
    { kind: 'syrup', x: 2.87, color: 2 },
    { kind: 'cups', x: 3.25 },
    { kind: 'jar', x: 3.65 },
    { kind: 'jar', x: 3.82 },
    { kind: 'utensils', x: 4.05 },
  ],
  // middle: liquor in a few bottle shapes
  [
    { kind: 'liquor', x: 0.8, shape: 'square', color: 0 },
    { kind: 'liquor', x: 0.97, shape: 'round', color: 1 },
    { kind: 'liquor', x: 1.12, shape: 'tall', color: 2 },
    { kind: 'liquor', x: 1.28, shape: 'round', color: 3 },
    { kind: 'liquor', x: 1.46, shape: 'square', color: 4 },
    { kind: 'saucers', x: 1.85 },
    { kind: 'liquor', x: 2.25, shape: 'tall', color: 5 },
    { kind: 'liquor', x: 2.41, shape: 'round', color: 0 },
    { kind: 'liquor', x: 2.58, shape: 'square', color: 3 },
    { kind: 'liquor', x: 2.74, shape: 'tall', color: 1 },
    { kind: 'liquor', x: 3.15, shape: 'round', color: 2 },
    { kind: 'liquor', x: 3.33, shape: 'square', color: 5 },
    { kind: 'liquor', x: 3.49, shape: 'tall', color: 4 },
    { kind: 'liquor', x: 3.68, shape: 'round', color: 3 },
    { kind: 'liquor', x: 3.88, shape: 'square', color: 0 },
    { kind: 'liquor', x: 4.05, shape: 'tall', color: 1 },
  ],
  // top: cups, teaware, utensils, a couple of bottles
  [
    { kind: 'cups', x: 0.85 },
    { kind: 'jar', x: 1.25 },
    { kind: 'cups', x: 1.65 },
    { kind: 'utensils', x: 2.05 },
    { kind: 'saucers', x: 2.4 },
    { kind: 'cups', x: 2.8 },
    { kind: 'liquor', x: 3.25, shape: 'tall', color: 2 },
    { kind: 'liquor', x: 3.42, shape: 'round', color: 0 },
    { kind: 'cups', x: 3.85 },
  ],
]

function CupShelves() {
  const { xFrom, xTo, boards, depth } = SHELF
  const width = xTo - xFrom
  const x = (xFrom + xTo) / 2
  const boardZ = WALL + 0.04 + depth / 2
  const bottom = boards[0] - 0.02
  const top = boards[boards.length - 1] + 0.02
  return (
    <group>
      {/* glowing back panel, what makes the shelves look lit from inside */}
      <mesh position={[x, (bottom + top) / 2, WALL + 0.045]}>
        <planeGeometry args={[width, top - bottom]} />
        <meshBasicMaterial color={GLOW.shelfPanel} />
      </mesh>
      {/* uprights and boards */}
      <Box position={[xFrom - 0.02, (bottom + top) / 2, boardZ]} size={[0.04, top - bottom, depth]} color={COLOR.tableTop} />
      <Box position={[xTo + 0.02, (bottom + top) / 2, boardZ]} size={[0.04, top - bottom, depth]} color={COLOR.tableTop} />
      {boards.map((y) => (
        <Box key={y} position={[x, y, boardZ]} size={[width, 0.025, depth]} color={COLOR.tableTop} />
      ))}
      {/* led strip under each board, lighting the shelf below it */}
      {boards.slice(1).map((y) => (
        <mesh key={y} position={[x, y - 0.016, boardZ + depth / 2 - 0.02]}>
          <boxGeometry args={[width, 0.006, 0.015]} />
          <meshBasicMaterial color={GLOW.ledStrip} />
        </mesh>
      ))}
      {SHELF_ITEMS.map((items, row) =>
        items.map((item) => (
          <ShelfThing key={`${row}-${item.x}`} item={item} position={[item.x, boards[row] + 0.0125, boardZ]} />
        )),
      )}
      {/* throws the shelf glow out onto the barista and the bar */}
      <pointLight position={[x, 1.65, COUNTER_FRONT + 0.1]} color={COLOR.warmLight} intensity={2.2 * BRIGHTNESS} distance={3.5} decay={2} />
    </group>
  )
}

// position = where the item's base sits on the shelf
function ShelfThing({ item, position }: { item: ShelfItem; position: Vec3 }) {
  switch (item.kind) {
    case 'syrup':
      return <SyrupBottle position={position} color={COLOR.syrups[item.color]} />
    case 'liquor':
      return <LiquorBottle position={position} shape={item.shape} color={COLOR.bottles[item.color]} />
    case 'jar':
      return <BeanJar position={position} />
    case 'utensils':
      return <UtensilCup position={position} />
    case 'cups':
      return <CupGroup position={position} />
    case 'saucers':
      return <SaucerStack position={position} />
  }
}

// syrup in a bottle with a label band and a pump on top
function SyrupBottle({ position, color }: { position: Vec3; color: string }) {
  return (
    <group position={position}>
      <Cylinder position={[0, 0.085, 0]} radius={0.028} height={0.17} color={color} roughness={0.25} />
      <Cylinder position={[0, 0.08, 0]} radius={0.0295} height={0.05} color={COLOR.label} castShadow={false} />
      <Cylinder position={[0, 0.18, 0]} radius={[0.012, 0.016]} height={0.02} color={COLOR.black} />
      <Cylinder position={[0, 0.2, 0]} radius={0.016} height={0.02} color={COLOR.black} />
      <Box position={[0, 0.205, 0.022]} size={[0.008, 0.008, 0.03]} color={COLOR.black} />
    </group>
  )
}

function LiquorBottle({ position, shape, color }: { position: Vec3; shape: 'round' | 'square' | 'tall'; color: string }) {
  const glass = 0.25
  return (
    <group position={position}>
      {shape === 'square' && (
        <>
          <Box position={[0, 0.075, 0]} size={[0.07, 0.15, 0.07]} color={color} roughness={glass} />
          <Box position={[0, 0.08, 0.036]} size={[0.05, 0.05, 0.002]} color={COLOR.label} castShadow={false} />
          <Cylinder position={[0, 0.18, 0]} radius={[0.012, 0.016]} height={0.06} color={color} roughness={glass} />
          <Cylinder position={[0, 0.22, 0]} radius={0.014} height={0.02} color={COLOR.black} />
        </>
      )}
      {shape === 'round' && (
        <>
          <Cylinder position={[0, 0.065, 0]} radius={0.042} height={0.13} color={color} roughness={glass} />
          <Cylinder position={[0, 0.145, 0]} radius={[0.016, 0.042]} height={0.03} color={color} roughness={glass} />
          <Cylinder position={[0, 0.185, 0]} radius={0.012} height={0.05} color={color} roughness={glass} />
          <Cylinder position={[0, 0.215, 0]} radius={0.014} height={0.015} color={COLOR.black} />
        </>
      )}
      {shape === 'tall' && (
        <>
          <Cylinder position={[0, 0.085, 0]} radius={0.03} height={0.17} color={color} roughness={glass} />
          <Cylinder position={[0, 0.2, 0]} radius={[0.011, 0.03]} height={0.06} color={color} roughness={glass} />
          <Cylinder position={[0, 0.235, 0]} radius={0.012} height={0.012} color={COLOR.black} />
        </>
      )}
    </group>
  )
}

// glass jar of coffee beans with a bamboo lid
function BeanJar({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <Cylinder position={[0, 0.05, 0]} radius={0.04} height={0.1} color={COLOR.beans} />
      <mesh position={[0, 0.07, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.14, 8]} />
        <GlassMaterial />
      </mesh>
      <Cylinder position={[0, 0.15, 0]} radius={0.047} height={0.02} color={COLOR.bamboo} />
    </group>
  )
}

// steel cup of spoons and a whisk
function UtensilCup({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <Cylinder position={[0, 0.045, 0]} radius={[0.035, 0.03]} height={0.09} color={COLOR.steel} roughness={0.35} />
      <Cylinder position={[-0.012, 0.12, 0]} radius={0.005} height={0.18} rotation={[0, 0, 0.12]} color={COLOR.steel} />
      <Cylinder position={[0.002, 0.13, 0.01]} radius={0.005} height={0.18} color={COLOR.steel} />
      <Cylinder position={[0.014, 0.12, -0.008]} radius={0.005} height={0.18} rotation={[0, 0, -0.12]} color={COLOR.bamboo} />
      {/* whisk head */}
      <mesh position={[0.003, 0.235, 0.01]} scale={[1, 1.6, 1]} castShadow>
        <sphereGeometry args={[0.02, 6, 4]} />
        <meshStandardMaterial color={COLOR.steel} flatShading wireframe />
      </mesh>
    </group>
  )
}

function CupGroup({ position }: { position: Vec3 }) {
  const colors = [COLOR.ceramics[0], COLOR.ceramics[1], COLOR.ceramics[5]]
  return (
    <group position={position}>
      {[-0.08, 0, 0.08].map((dx, i) => (
        <Cylinder key={dx} position={[dx, 0.0375, 0]} radius={[0.036, 0.03]} height={0.075} color={colors[i]} roughness={0.4} />
      ))}
    </group>
  )
}

function SaucerStack({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      {Array.from({ length: 5 }, (_, i) => (
        <Cylinder key={i} position={[0, 0.006 + i * 0.013, 0]} radius={[0.06, 0.045]} height={0.012} segments={10} color={COLOR.ceramics[0]} roughness={0.4} />
      ))}
    </group>
  )
}

function BottleShelf() {
  const { xFrom, xTo, y, depth } = BOTTLE_SHELF
  const z = WALL + 0.04 + depth / 2
  const bottles = useMemo(() => layOutBottles(), [])
  return (
    <group>
      <Box position={[(xFrom + xTo) / 2, y, z]} size={[xTo - xFrom, 0.03, depth]} color={COLOR.tableTop} />
      {/* brackets */}
      {[xFrom + 0.15, (xFrom + xTo) / 2, xTo - 0.15].map((x) => (
        <Box key={x} position={[x, y - 0.08, WALL + 0.06]} size={[0.03, 0.14, 0.04]} color={COLOR.black} />
      ))}
      {/* bodies: one unit-tall cylinder, stretched per bottle */}
      <Instances limit={bottles.length} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 1, 8]} />
        <meshStandardMaterial flatShading roughness={0.25} />
        {bottles.map((b, i) => (
          <Instance key={i} position={[b.x, y + 0.015 + b.height / 2, z]} scale={[1, b.height, 1]} color={b.color} />
        ))}
      </Instances>
      {/* necks */}
      <Instances limit={bottles.length}>
        <cylinderGeometry args={[0.012, 0.016, 0.08, 6]} />
        <meshStandardMaterial flatShading roughness={0.25} />
        {bottles.map((b, i) => (
          <Instance key={i} position={[b.x, y + 0.015 + b.height + 0.04, z]} color={b.color} />
        ))}
      </Instances>
    </group>
  )
}

function layOutBottles() {
  const { xFrom, xTo } = BOTTLE_SHELF
  const bottles: { x: number; height: number; color: string }[] = []
  for (let x = xFrom + 0.12, i = 0; x < xTo - 0.1; x += 0.16, i++) {
    // leave room for the vine pots
    if (VINES.some((vine) => Math.abs(vine.x - x) < 0.11)) continue
    bottles.push({
      x,
      height: 0.2 + seeded(i + 300) * 0.07,
      color: COLOR.bottles[Math.floor(seeded(i + 400) * COLOR.bottles.length)],
    })
  }
  return bottles
}

function MenuBoard() {
  const { x, y, width, height } = MENU
  const lines = useMemo(() => layOutMenuLines(), [])
  return (
    <group>
      <Box position={[x, y, WALL + 0.05]} size={[width + 0.08, height + 0.08, 0.04]} color={COLOR.beam} />
      <Box position={[x, y, WALL + 0.072]} size={[width, height, 0.006]} color={COLOR.menuBoard} castShadow={false} />
      <Text
        position={[x, y + height / 2 - 0.1, WALL + 0.077]}
        fontSize={0.09}
        letterSpacing={0.25}
        color={COLOR.chalk}
        anchorX="center"
        anchorY="middle"
      >
        MENU
      </Text>
      {/* chalk "writing" under the title: one unit-long line, stretched per line */}
      <Instances limit={lines.length}>
        <boxGeometry args={[1, 0.014, 0.002]} />
        <meshStandardMaterial color={COLOR.chalk} roughness={1} />
        {lines.map((line, i) => (
          <Instance key={i} position={[line.x, line.y, WALL + 0.076]} scale={[line.length, 1, 1]} />
        ))}
      </Instances>
    </group>
  )
}

// unreadable on purpose: two columns of item lines under the MENU title
function layOutMenuLines() {
  const { x, y, width, height } = MENU
  const top = y + height / 2 - 0.1
  const lines: { x: number; y: number; length: number }[] = []
  const columns = [x - width / 2 + 0.08, x + 0.05]
  columns.forEach((left, c) => {
    for (let row = 0; row < 7; row++) {
      const length = Math.min(0.22 + seeded(c * 10 + row) * 0.38, width / 2 - 0.13)
      lines.push({ x: left + length / 2, y: top - 0.12 - row * 0.085, length })
    }
  })
  return lines
}

function Vines() {
  const { y, depth } = BOTTLE_SHELF
  const potZ = WALL + 0.04 + depth / 2
  const leaves = useMemo(() => layOutLeaves(), [])
  return (
    <group>
      {VINES.map((vine) => (
        <Cylinder key={vine.x} position={[vine.x, y + 0.075, potZ]} radius={[0.07, 0.055]} height={0.12} color={COLOR.ceramics[2]} />
      ))}
      {/* low-poly leaves: little stretched diamonds */}
      <Instances limit={leaves.length} castShadow>
        <octahedronGeometry args={[0.035, 0]} />
        <meshStandardMaterial flatShading />
        {leaves.map((leaf, i) => (
          <Instance key={i} position={leaf.position} rotation={leaf.rotation} scale={leaf.scale} color={leaf.color} />
        ))}
      </Instances>
    </group>
  )
}

function layOutLeaves() {
  const { y, depth } = BOTTLE_SHELF
  const potZ = WALL + 0.04 + depth / 2
  const edgeZ = WALL + 0.04 + depth + 0.02 // just past the shelf's front edge
  const leaves: { position: Vec3; rotation: Vec3; scale: Vec3; color: string }[] = []
  const leaf = (position: Vec3, n: number) => {
    const r = seeded(n)
    const size = 0.8 + r * 0.4
    leaves.push({
      position,
      rotation: [r * 3, r * 5, r * 2],
      scale: [size, size * 0.55, size * 1.4],
      color: COLOR.leaves[Math.floor(seeded(n + 0.5) * COLOR.leaves.length)],
    })
  }
  VINES.forEach((vine, v) => {
    // bushy top in the pot
    for (let k = 0; k < 7; k++) {
      const angle = (k / 7) * Math.PI * 2
      leaf([vine.x + Math.cos(angle) * 0.05, y + 0.16 + seeded(v * 50 + k) * 0.05, potZ + Math.sin(angle) * 0.05], v * 50 + k)
    }
    // then trailing down over the front edge, swaying a little side to side
    const count = Math.round(vine.length / 0.045)
    for (let k = 0; k < count; k++) {
      leaf([vine.x + Math.sin(k * 0.9 + v) * 0.035, y - k * 0.045, edgeZ + Math.cos(k * 1.3) * 0.015], v * 100 + k + 7)
    }
  })
  return leaves
}
