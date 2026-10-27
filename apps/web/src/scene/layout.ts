// scene layout in meters
// origin = center of my table, on the floor
// +x east (shelves), -z north (counter), +y up
export type Vec3 = [x: number, y: number, z: number]

export const ROOM = { width: 12.4, depth: 9.4, height: 3.2, centerZ: -0.1 } as const

export const BOUNDS = {
  minX: -ROOM.width / 2,
  maxX: ROOM.width / 2,
  minZ: ROOM.centerZ - ROOM.depth / 2,
  maxZ: ROOM.centerZ + ROOM.depth / 2,
} as const

export const TABLE_HEIGHT = 0.75

// y-rotation so a +z-facing thing looks at `to`
export function faceToward(from: Vec3, to: Vec3): number {
  return Math.atan2(to[0] - from[0], to[2] - from[2])
}

// --- hero table
// size: [width (x), depth (z)]
export const MY_TABLE = { position: [0, 0, 0] as Vec3, size: [1.2, 0.8] as [number, number] }
// north side of the table, facing south (opening camera)
export const ME = { position: [0, 0, -0.83] as Vec3, rotationY: 0 }
// tilt: lid lean-back in radians (~15deg)
export const LAPTOP = { position: [0, TABLE_HEIGHT, -0.1] as Vec3, tilt: 0.26 }
// glowing part of the lid, meters
export const SCREEN_SIZE = { width: 0.3, height: 0.19 }

// my display in world space: center + the way it faces (toward me, tilted up).
// mirrors Laptop() in CafeBlockout: hinge 0.11 behind center, display 0.105 up the lid
export const MY_SCREEN = (() => {
  const [x, y, z] = LAPTOP.position
  const cos = Math.cos(LAPTOP.tilt)
  const sin = Math.sin(LAPTOP.tilt)
  const hinge: Vec3 = [x, y + 0.015, z + 0.11]
  const up = 0.105
  const front = -0.0045
  return {
    center: [hinge[0], hinge[1] + up * cos - front * sin, hinge[2] + up * sin + front * cos] as Vec3,
    normal: [0, sin, -cos] as Vec3,
  }
})()
export const PENDANT = { position: [0, 2.45, 0] as Vec3 }

// --- other tables
// floor plan: bar along the north wall, booth along the east window, the round
// table and study group in a column between my table and the booth, the sleeper's
// table in front of mine, two small tables on the west wall

// round table for three (the poker game), level with my table, toward the window booth
export const GROUP_TABLE = { position: [2.6, 0, 0] as Vec3, radius: 0.45 }
export const GROUP_SEATS: Vec3[] = [
  [2.6, 0, -0.8], // north side
  [3.3, 0, 0.4], // southeast
  [1.9, 0, 0.4], // southwest
]

// study group: 4-seat table in line with the round table and level with the
// sleeper's table, toward the south wall. three working, one empty chair
export const STUDY_TABLE = { position: [2.6, 0, 2.3] as Vec3, size: [1.2, 0.9] as [number, number] }
// sticker = easter egg on that laptop's lid (see EasterEggs.tsx, links in src/links.ts)
export const STUDY_SEATS: { position: Vec3; occupied: boolean; sticker?: 'swords' | 'music' }[] = [
  { position: [2.3, 0, 1.55], occupied: true, sticker: 'swords' }, // north side, facing the door
  { position: [2.9, 0, 1.55], occupied: true, sticker: 'music' },
  { position: [2.3, 0, 3.05], occupied: true }, // south side
  { position: [2.9, 0, 3.05], occupied: false },
]

// in front of my table: a 4-seat table with one guy asleep on his arms, laptop still
// open, coffee knocked over and dripping off the west edge (the camera's side)
export const SLEEPER_TABLE = { position: [0, 0, 2.3] as Vec3, size: [1.2, 0.9] as [number, number] }
// south side, west chair, facing north. the other three chairs are empty
export const SLEEPER_SEAT: Vec3 = [-0.3, 0, 3.05]
export const SLEEPER_EMPTY_SEATS: Vec3[] = [
  [0.3, 0, 3.05],
  [-0.3, 0, 1.55],
  [0.3, 0, 1.55],
]

// --- window booth
// upholstered banquette running along the window, a row of small square tables in
// front of it, chairs on the aisle side. bench / chair = is someone sitting there.
// laptop = which of them has one out
export const BANQUETTE = { zFrom: -2.0, zTo: 4.0, depth: 0.55, seatHeight: 0.45, backHeight: 0.95 }
export const WINDOW_TABLE = { x: 5.05, size: 0.7, benchX: 5.75, chairX: 4.45 }
export const WINDOW_TABLES: { z: number; bench: boolean; chair: boolean; laptop?: 'bench' | 'chair' }[] = [
  { z: -1.4, bench: true, chair: true }, // couple
  { z: 0.0, bench: true, chair: false, laptop: 'bench' }, // solo worker
  { z: 1.4, bench: false, chair: false }, // empty
  { z: 2.8, bench: true, chair: true, laptop: 'chair' }, // pair, one working
]

// --- west wall
// two small tables for two along the wall, chairs on the north and south sides.
// mostly behind the camera, but a real cafe wouldn't leave this side empty
export const WEST_TABLES: { position: Vec3; seats: [north: boolean, south: boolean] }[] = [
  { position: [-5.2, 0, -1.2], seats: [true, false] }, // someone reading
  { position: [-5.2, 0, 0.9], seats: [false, false] },
]

// --- bar (north wall)
// long bar with stools on the south side, barista aisle behind it,
// back counter + shelves against the wall (see Bar.tsx, BackWall.tsx)
export const BAR = {
  xFrom: -1.6,
  xTo: 5.9,
  height: 1.05, // bar top
  frontZ: -2.7, // customer-side edge
  depth: 0.6,
  backHeight: 0.9, // back counter against the wall
  backDepth: 0.6,
}
// none at the ordering end (self-serve, register, pastries) or the far east end
export const BAR_STOOLS = { z: -2.42, x: [1.36, 2.18, 3.0, 3.82, 4.64] }
// row of small dome lamps over the bar. y = shade height, on short cords so they
// stay above the shelves instead of hanging in front of them. kept off the beams
export const BAR_PENDANTS = { y: 2.575, x: [-0.4, 1.4, 3.2, 5.0] }
// self-serve station (straws, sugar, napkins) on the bar's west end, under the menu
export const SELF_SERVE_X = -1.15
// in the aisle by the espresso machine, facing the bar
export const BARISTA: Vec3 = [2.0, 0, -3.75]

// --- fixtures
// floor-to-ceiling storefront window on the east wall, from just past the bar
// to near the south corner. in view for most of the scroll.
// tops out under the ceiling beams
export const WINDOW = { zFrom: -2.3, zTo: 4.2, yFrom: 0, yTo: 2.98 }
// south wall
// between the sleeper's table and the study group
export const DOOR = { xFrom: 0.8, xTo: 1.8, height: 2.2 }

// --- room finish
// dark wood paneling on every wall. window sits right on top of it
export const WAINSCOT_HEIGHT = 0.9

// grid of dark beams hanging below the ceiling, the gaps are the recessed panels.
// beamsX run north-south at these x, beamsZ run east-west at these z.
// kept clear of my pendant at (0, 0)
export const CEILING = {
  beamDepth: 0.22,
  beamWidth: 0.18,
  beamsX: [-3.6, -1.2, 1.2, 3.6],
  beamsZ: [-1.6, 1.6],
}

// --- downlights
// recessed ceiling lights, each throws a warm pool straight down.
// kept off the beams. shadows are expensive so only the table ones cast them
export type Downlight = { position: Vec3; intensity: number; shadows?: boolean }

const LIGHT_Y = ROOM.height - 0.02

export const DOWNLIGHTS: Downlight[] = [
  { position: [2.6, LIGHT_Y, 0], intensity: 7, shadows: true }, // round table (poker)
  { position: [2.6, LIGHT_Y, 2.3], intensity: 6, shadows: true }, // study group
  { position: [0, LIGHT_Y, 2.3], intensity: 4 }, // the sleeper
  // back counter. the bar top gets its light from the pendants (BAR_PENDANTS)
  { position: [2.15, LIGHT_Y, -4.2], intensity: 6 }, // espresso machine
  { position: [3.45, LIGHT_Y, -4.2], intensity: 6 }, // brewer, blender, kettle
  { position: [5.6, LIGHT_Y, -3.4], intensity: 3 }, // pixel painting by the window
  // window booth, one light per pair of tables
  { position: [5.1, LIGHT_Y, -0.7], intensity: 5 },
  { position: [5.1, LIGHT_Y, 2.1], intensity: 5 },
  { position: [-4.9, LIGHT_Y, -0.2], intensity: 3 }, // west tables
  { position: [1.35, LIGHT_Y, 3.9], intensity: 3 }, // entrance (x 1.35 keeps it off the beam)
]

// --- camera path
// one continuous spiral from the corner down into my laptop screen. no keyframes,
// so there are no joints for the path to turn at. angle, distance and height all
// ease toward the screen together and slow down as they land.
// turnEase / dropEase: how early the camera gets around behind me / down to
// shoulder height. higher = earlier, but too high grazes my head.
// 2.0 / 2.2 clears my head by ~18cm and my shoulder by ~16cm
export const CAMERA_PATH = {
  // high in the southwest corner, 3/4 view of the back of my laptop.
  // closer = I'm bigger in frame
  start: [-3.86, 2.75, 2.54] as Vec3,
  // centered on my laptop (where the zoom ends up), aimed a bit above it
  // so the frame isn't half floor
  startTarget: [0, 1.07, 0.03] as Vec3,
  // aims the opening shot this many meters to the right of my table, which slides
  // the north wall out the left edge. 0 = table centered. eases back as you scroll
  startPan: 0,
  turnEase: 2.0,
  dropEase: 2.2,
}
