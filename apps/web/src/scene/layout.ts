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
export const LAPTOP = { position: [0, TABLE_HEIGHT, -0.1] as Vec3 }
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

// --- camera beats
// beat 1 is the opening shot. 2-5 are rough, tune when we do the scroll path
export type CameraBeat = { name: string; position: Vec3; target: Vec3 }

export const CAMERA_BEATS: CameraBeat[] = [
  { name: 'High corner', position: [-5.4, 2.9, 3.4], target: [0, 0.8, -0.3] },
  { name: 'Spiral down', position: [-4.6, 2.2, -0.1], target: [0, 0.8, -0.3] },
  { name: 'Over the shoulder', position: [-0.55, 1.5, -1.6], target: [0, 0.86, 0.03] },
  { name: 'Push in', position: [-0.2, 1.05, -0.95], target: [0, 0.86, 0.03] },
  { name: 'Handoff', position: [0, 0.88, -0.32], target: [0, 0.86, 0.03] },
]
