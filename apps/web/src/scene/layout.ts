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
export const ME = { position: [0, 0, -0.75] as Vec3, rotationY: 0 }
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
export const GROUP_TABLE = { position: [3.2, 0, -2.0] as Vec3, radius: 0.45 }
export const GROUP_SEATS: Vec3[] = [
  [3.2, 0, -2.8], // north side
  [3.9, 0, -1.6], // southeast
  [2.5, 0, -1.6], // southwest
]

export const SOLO_TABLE = { position: [3.6, 0, 1.95] as Vec3, size: [0.8, 0.6] as [number, number] }
export const SOLO_SEAT: Vec3 = [3.6, 0, 2.6]

// --- fixtures
// size: [w, h, d]
export const COUNTER = { position: [3.5, 0, -3.75] as Vec3, size: [4.6, 1.05, 0.7] as Vec3 }
export const BARISTA: Vec3 = [3.5, 0, -4.4]
export const SHELVES = { position: [5.9, 0, 0.6] as Vec3, size: [0.5, 2.2, 5.0] as Vec3 }
// west wall
export const WINDOW = { zFrom: -3.65, zTo: 3.6, yFrom: 0.9, yTo: 2.6 }
// south wall
export const DOOR = { xFrom: 2.2, xTo: 3.7, height: 2.2 }

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
  { position: [3.2, LIGHT_Y, -2.0], intensity: 7, shadows: true }, // group table
  { position: [3.35, LIGHT_Y, 1.95], intensity: 6, shadows: true }, // solo worker
  { position: [1.8, LIGHT_Y, -3.9], intensity: 6 }, // bar
  { position: [3.0, LIGHT_Y, -3.9], intensity: 6 }, // bar
  { position: [4.3, LIGHT_Y, -3.9], intensity: 6 }, // bar
  { position: [5.4, LIGHT_Y, -3.9], intensity: 6 }, // bar
  { position: [-4.9, LIGHT_Y, 1.0], intensity: 4 }, // window bench
  { position: [5.5, LIGHT_Y, 0.2], intensity: 4 }, // paintings wall
  { position: [2.95, LIGHT_Y, 3.9], intensity: 3 }, // entrance
]

// --- camera path
// one continuous spiral from the corner down into my laptop screen. no keyframes,
// so there are no joints for the path to turn at. angle, distance and height all
// ease toward the screen together and slow down as they land.
// turnEase / dropEase: how early the camera gets around behind me / down to
// shoulder height. higher = earlier, but too high grazes my head.
// 2.0 / 2.2 clears my head by ~14cm and my shoulder by ~10cm
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
