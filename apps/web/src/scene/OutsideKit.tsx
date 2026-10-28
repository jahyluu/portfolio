import { CanvasTexture, Color, SRGBColorSpace, type ColorRepresentation } from 'three'
import { BOUNDS, type Vec3 } from './layout'

// shared stuff for Outside.tsx and Park.tsx.
// nothing outside is lit by the scene lights (they're warm and would wash it out).
// flat surfaces are unlit colors, everything else uses a night matcap so facets
// still show. fog is off out here too

export const LEVEL = { walk: -0.03, road: -0.15 }

// east side, what you see through the window
export const EAST = {
  walk: { from: BOUNDS.maxX + 0.1, to: 7.8 },
  road: { from: 7.95, to: 12.95 },
  park: 13.1, // grass edge
  zFrom: -20,
  zTo: 12,
}

// park's south edge
export const PARK_SOUTH = 5.0

// street past the front door, runs along the park and meets the east street.
// shops on the far side
export const SOUTH = {
  walk: { from: BOUNDS.maxZ + 0.1, to: 6.2 },
  road: { from: 6.35, to: 10.35 },
  farWalk: { from: 10.5, to: 12 },
  facade: 12,
  xFrom: -8,
  xTo: 32,
}

export const NIGHT = {
  // street
  walk: '#2b3242',
  joint: '#1b202c',
  curb: '#3a4254',
  road: '#121722',
  roadLine: '#5d6070',
  pole: '#181c25',
  wire: '#0b0d12',
  warmLight: '#ffcf8f',
  rain: '#7d89a3',
  // buildings
  building: ['#0f1320', '#131a29', '#0c101b'],
  frame: '#0a0d15',
  windowDark: '#171e2d',
  windowWarm: '#8c6236',
  windowCool: '#55698d',
  shopWarm: '#c78f4f',
  shopBright: new Color('#dcebf5').multiplyScalar(1.3), // > 1 for a bit of bloom
  shutter: '#2a2f3a',
  shutterRib: '#1c2029',
  // park
  grass: '#18241d',
  hedge: '#22382a',
  water: '#1a2a44',
  riverBed: '#0c1220',
  trail: '#8a7650',
  // browns, tans, greys
  gravel: ['#cdbb92', '#a8875e', '#7a5f42', '#4a3624', '#3a2a1c', '#e0d4b4', '#b3b0aa', '#8a8780', '#5e5c58', '#3f3e3c', '#9c8a6a'],
  ripple: '#9fb2d6',
  rocks: ['#6a7182', '#7a7468', '#5c6270'],
  bark: '#3a2a27',
  // picked at random per blossom cluster
  blossom: ['#f587aa', '#ed6e98', '#f9a4be', '#fcc0d2', '#ffe2eb'],
  petal: '#f384a6',
  wood: '#8a6a50',
  bridgeRail: '#b5452f', // vermilion
  busRoof: '#4f6f6a',
  busSign: '#b8432f',
  busIcon: '#141414',
  label: '#e8e2d6',
  metal: '#2a2e36',
  skin: '#e0b892',
  boot: '#262a33',
}

// --- falling rain
// rain volumes (kept outside the building). streaks wrap back to the top.
// count controls how heavy it looks
export const RAIN_ZONES = [
  { x: [EAST.walk.from + 0.1, SOUTH.xTo], z: [EAST.zFrom, SOUTH.facade - 0.1], count: 1100 }, // streets + park
  { x: [SOUTH.xFrom + 0.5, BOUNDS.maxX + 0.1], z: [BOUNDS.maxZ + 0.2, SOUTH.facade - 0.1], count: 175 }, // by the door
]
// m/s
export const RAIN = { top: 6, bottom: LEVEL.road, speed: [2.5, 3.5] }

// drops per m^2 per second, derived from the street zone's count, height and speed.
// the river ripples use this so they stay in sync with the rain
export function rainHitsPerSquareMeter() {
  const zone = RAIN_ZONES[0]
  const area = (zone.x[1] - zone.x[0]) * (zone.z[1] - zone.z[0])
  const height = RAIN.top - RAIN.bottom
  const speed = (RAIN.speed[0] + RAIN.speed[1]) / 2
  return (zone.count / (area * height)) * speed
}

type FlatProps = { position: Vec3; size: Vec3; color: ColorRepresentation; rotation?: Vec3 }

// unlit box, centered
export function Flat({ position, size, color, rotation }: FlatProps) {
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={size} />
      <meshBasicMaterial color={color} fog={false} />
    </mesh>
  )
}

// matcap material for anything with shape (trees, ducks, bench...)
export function NightMaterial({ color }: { color: ColorRepresentation }) {
  return <meshMatcapMaterial matcap={nightMatcap()} color={color} flatShading fog={false} />
}

let matcap: CanvasTexture | null = null

// generated matcap: lit from upper left, dark underneath
function nightMatcap() {
  if (matcap) return matcap
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#141824'
  ctx.fillRect(0, 0, size, size)
  const gradient = ctx.createRadialGradient(size * 0.36, size * 0.3, size * 0.04, size * 0.5, size * 0.5, size * 0.55)
  gradient.addColorStop(0, '#e2e8f5')
  gradient.addColorStop(0.5, '#8b96ae')
  gradient.addColorStop(1, '#202637')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
  ctx.fill()
  matcap = new CanvasTexture(canvas)
  matcap.colorSpace = SRGBColorSpace
  return matcap
}

// radial falloff texture for light pools / reflections
export function glowTexture() {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
  gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.45)')
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}
