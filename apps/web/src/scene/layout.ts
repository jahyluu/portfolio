// all positions in meters. origin = center of my table at floor level.
// +x east, -z north (bar), +y up
export type Vec3 = [x: number, y: number, z: number]

export const ROOM = { width: 12.4, depth: 9.4, height: 3.2, centerZ: -0.1 } as const

export const BOUNDS = {
  minX: -ROOM.width / 2,
  maxX: ROOM.width / 2,
  minZ: ROOM.centerZ - ROOM.depth / 2,
  maxZ: ROOM.centerZ + ROOM.depth / 2,
} as const

export const TABLE_HEIGHT = 0.75

// y rotation that turns a +z-facing object toward `to`
export function faceToward(from: Vec3, to: Vec3): number {
  return Math.atan2(to[0] - from[0], to[2] - from[2])
}

// --- hero table
// size: [width (x), depth (z)]
export const MY_TABLE = { position: [0, 0, 0] as Vec3, size: [1.2, 0.8] as [number, number] }
// north side of my table
export const ME = { position: [0, 0, -0.83] as Vec3, rotationY: 0 }
// tilt in radians (~15deg)
export const LAPTOP = { position: [0, TABLE_HEIGHT, -0.1] as Vec3, tilt: 0.26 }
// lit display area. 16:10, same as the desktop (see desktop/screen.ts)
export const SCREEN_SIZE = { width: 0.3, height: 0.1875 }
// the lid, with a 5mm bezel around the display
export const LID = { width: SCREEN_SIZE.width + 0.01, height: SCREEN_SIZE.height + 0.01 }

// my screen's center + normal in world space.
// keep in sync with Laptop() in CafeBlockout (hinge 0.11 back, display centered on the lid)
export const MY_SCREEN = (() => {
  const [x, y, z] = LAPTOP.position
  const cos = Math.cos(LAPTOP.tilt)
  const sin = Math.sin(LAPTOP.tilt)
  const hinge: Vec3 = [x, y + 0.015, z + 0.11]
  const up = LID.height / 2
  const front = -0.0045
  return {
    center: [hinge[0], hinge[1] + up * cos - front * sin, hinge[2] + up * sin + front * cos] as Vec3,
    normal: [0, sin, -cos] as Vec3,
  }
})()
export const PENDANT = { position: [0, 2.45, 0] as Vec3 }

// my phone, lying on the table past my coffee, top pointing away from me so I could read it
export const PHONE = {
  position: [-0.31, TABLE_HEIGHT, 0.07] as Vec3,
  yaw: -0.18,
  body: { width: 0.072, length: 0.152, thickness: 0.008 },
}
// 9:19.5, same as the phone UI (see desktop/screen.ts)
export const PHONE_SCREEN = { width: 0.066, height: 0.066 * (19.5 / 9) }

// phone screen center/normal/top, world space
export const MY_PHONE = (() => {
  const [x, y, z] = PHONE.position
  return {
    center: [x, y + PHONE.body.thickness + 0.0004, z] as Vec3,
    normal: [0, 1, 0] as Vec3,
    top: [Math.sin(PHONE.yaw), 0, Math.cos(PHONE.yaw)] as Vec3,
  }
})()

// --- other tables
// bar on the north wall, booth on the east window, poker + study tables between
// mine and the booth, sleeper's table south of mine, two small tables on the west wall

// poker table, 3 seats
export const GROUP_TABLE = { position: [2.6, 0, 0] as Vec3, radius: 0.45 }
export const GROUP_SEATS: Vec3[] = [
  [2.6, 0, -0.8], // N
  [3.3, 0, 0.4], // SE
  [1.9, 0, 0.4], // SW
]

// study group, 4 seats, one empty
export const STUDY_TABLE = { position: [2.6, 0, 2.3] as Vec3, size: [1.2, 0.9] as [number, number] }
// sticker: see EasterEggs.tsx
export const STUDY_SEATS: { position: Vec3; occupied: boolean; sticker?: 'swords' | 'music' }[] = [
  { position: [2.3, 0, 1.55], occupied: true, sticker: 'swords' },
  { position: [2.9, 0, 1.55], occupied: true, sticker: 'music' },
  { position: [2.3, 0, 3.05], occupied: true },
  { position: [2.9, 0, 3.05], occupied: false },
]

// guy asleep on his arms, coffee spilled off the west edge (faces the camera)
export const SLEEPER_TABLE = { position: [0, 0, 2.3] as Vec3, size: [1.2, 0.9] as [number, number] }
// SW chair, the rest are empty
export const SLEEPER_SEAT: Vec3 = [-0.3, 0, 3.05]
export const SLEEPER_EMPTY_SEATS: Vec3[] = [
  [0.3, 0, 3.05],
  [-0.3, 0, 1.55],
  [0.3, 0, 1.55],
]

// --- window booth
// bench along the window, small tables, chairs on the aisle side.
// bench/chair = occupied, laptop = who has one out
export const BANQUETTE = { zFrom: -2.0, zTo: 4.0, depth: 0.55, seatHeight: 0.45, backHeight: 0.95 }
export const WINDOW_TABLE = { x: 5.05, size: 0.7, benchX: 5.75, chairX: 4.45 }
export const WINDOW_TABLES: { z: number; bench: boolean; chair: boolean; laptop?: 'bench' | 'chair' }[] = [
  { z: -1.4, bench: true, chair: true }, // couple
  { z: 0.0, bench: true, chair: false, laptop: 'bench' }, // solo
  { z: 1.4, bench: false, chair: false }, // empty
  { z: 2.8, bench: true, chair: true, laptop: 'chair' },
]

// --- west wall
// mostly off camera but the room looked empty without them
export const WEST_TABLES: { position: Vec3; seats: [north: boolean, south: boolean] }[] = [
  { position: [-5.2, 0, -1.2], seats: [true, false] }, // reader
  { position: [-5.2, 0, 0.9], seats: [false, false] },
]

// --- bar (north wall)
// see Bar.tsx and BackWall.tsx
export const BAR = {
  xFrom: -1.6,
  xTo: 5.9,
  height: 1.05, // bar top
  frontZ: -2.7, // customer side
  depth: 0.6,
  backHeight: 0.9, // back counter
  backDepth: 0.6,
}
// no stools at the ordering end or the far east end
export const BAR_STOOLS = { z: -2.42, x: [1.36, 2.18, 3.0, 3.82, 4.64] }
// y = shade height. short cords so they don't hang in front of the shelves
export const BAR_PENDANTS = { y: 2.575, x: [-0.4, 1.4, 3.2, 5.0] }
// self-serve tray, west end under the menu
export const SELF_SERVE_X = -1.15

// --- fixtures
// east wall storefront window, top stops under the beams
export const WINDOW = { zFrom: -2.3, zTo: 4.2, yFrom: 0, yTo: 2.98 }
// south wall
// between the sleeper and the study table
export const DOOR = { xFrom: 0.8, xTo: 1.8, height: 2.2 }

// --- room finish
// wainscot, the window sill sits on top
export const WAINSCOT_HEIGHT = 0.9

// beamsX run N-S at these x, beamsZ run E-W at these z
export const CEILING = {
  beamDepth: 0.22,
  beamWidth: 0.18,
  beamsX: [-3.6, -1.2, 1.2, 3.6],
  beamsZ: [-1.6, 1.6],
}
// along the E-W beams, tied off at each crossing. spacing = m between bulbs
export const STRING_LIGHTS = {
  hangFrom: ROOM.height - CEILING.beamDepth, // beam bottom
  sag: 0.22,
  spacing: 0.24,
  // walls + beam crossings
  ties: [BOUNDS.minX + 0.1, ...CEILING.beamsX, BOUNDS.maxX - 0.1],
  z: CEILING.beamsZ,
}

// --- downlights
// recessed, pointing straight down. only the table ones cast shadows (perf)
type Downlight = { position: Vec3; intensity: number; shadows?: boolean }

const LIGHT_Y = ROOM.height - 0.02

export const DOWNLIGHTS: Downlight[] = [
  { position: [2.6, LIGHT_Y, 0], intensity: 7, shadows: true }, // poker
  { position: [2.6, LIGHT_Y, 2.3], intensity: 6, shadows: true }, // study group
  { position: [0, LIGHT_Y, 2.3], intensity: 4 }, // sleeper
  // back counter (bar top is lit by BAR_PENDANTS)
  { position: [2.15, LIGHT_Y, -4.2], intensity: 6 }, // espresso machine
  { position: [3.45, LIGHT_Y, -4.2], intensity: 6 }, // brewer / blender / kettle
  { position: [5.6, LIGHT_Y, -3.4], intensity: 3 }, // painting
  // booth, one per two tables
  { position: [5.1, LIGHT_Y, -0.7], intensity: 5 },
  { position: [5.1, LIGHT_Y, 2.1], intensity: 5 },
  { position: [-4.9, LIGHT_Y, -0.2], intensity: 3 }, // west tables
  { position: [1.35, LIGHT_Y, 3.9], intensity: 3 }, // door, x offset to miss the beam
]

// --- camera path
// single spiral from the corner into my screen (no keyframes, so no kinks).
// turnEase/dropEase: how early it swings behind me / drops to shoulder height.
// higher = earlier, but too high and it clips my head. 2.0/2.2 leaves ~16-18cm
export const CAMERA_PATH = {
  // SW corner, up high
  start: [-3.86, 2.75, 2.54] as Vec3,
  // a bit above the laptop so the frame isn't mostly floor
  startTarget: [0, 1.07, 0.03] as Vec3,
  // shifts the opening shot right (m). 0 = table centered
  startPan: 0,
  turnEase: 2.0,
  dropEase: 2.2,
}
