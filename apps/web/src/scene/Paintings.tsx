import { useMemo } from 'react'
import { DataTexture, NearestFilter, RGBAFormat, SRGBColorSpace } from 'three'
import { BOUNDS, type Vec3 } from './layout'
import { COLOR } from './palette'
import { Box } from './primitives'

// framed art on the walls

export function Paintings() {
  return (
    <group>
      {/* east wall, between the north wall and the window, above the end of the bar.
          centered so the gap to the wall matches the gap to the window */}
      <PixelPainting pixels={MOUNTAIN} colors={INK_WASH} position={[BOUNDS.maxX - 0.03, 1.85, -3.575]} rotationY={-Math.PI / 2} />
    </group>
  )
}

// original ink-wash scene in pixels, 42 x 24: blossom branch sweeping in from the left,
// red sun, snowy peak with brush streaks, fainter ridges behind, mist, still water.
// one character per pixel, top row first. letters map to INK_WASH
const MOUNTAIN = [
  ',.,......p..........p..p...,..............',
  'kkk.....pPp...p....pPppPp,.p.....,.RRR.,..',
  'kkkpkk...p...pPp..,.pkkpk.pPp...,,RrrrR...',
  '..pPpkkkkkkkkkpkk.kkk...pkkp...,,RrrrrrR..',
  '..,p..kkkkkkkkkkkkk....pPp.......RrrrrrR..',
  '......k.....pkkkkkp.....p.,......RrrrrrR..',
  '.......p...pPp...pPp.,....,.......RrrrR...',
  '......pPp...p....,pk..........w....RRR....',
  '.......p.....................www..........',
  '.....................,,....Kwwwwwm........',
  '......,.................,.llllmmmKm,......',
  '..,......,...............lllllKmmmmm......',
  '..,...............w....llllKllmmmmmmKm.,..',
  '....w...,...,,..llfff.llKlllllmmmKmmmmm...',
  '..fffff...,....lllfffKllllllllKmmmmmmmmK..',
  'lffffffff....lllllmllllllllKllmmmmmmKmmmmm',
  'ffffffffffflflffflflfllffflfffmfffmmmfmfmm',
  'ffffffffffflfffffffffKfllfflfffffmffffffmf',
  'f..ff.f.....f.ff...,.ff.ff..f...f..f.f.f.f',
  '.......,.......,ggggggggggggg....,........',
  '.ggggggg..........,.....gggggggggggggg....',
  '.,..,.,....,.ggggggggg..........,....,....',
  '..gggggggg................,.gggggggg.,....',
  '...............,...ggggggg.....,.......,..',
]

const INK_WASH: Record<string, string> = {
  '.': '#e8e0cc', // paper
  ',': '#ddd4be', // paper grain
  k: '#2b2a2e', // branch ink
  p: '#d9667a', // blossoms
  P: '#b33a52',
  r: '#c23a2b', // sun
  R: '#a52e22',
  w: '#f3efe6', // snow
  l: '#a9a8a9', // mountain, lit side
  m: '#7d7c80', // mountain, shaded side
  K: '#4a4a4f', // brush streaks
  f: '#cfc8b8', // mist, distant hills
  g: '#bdb7aa', // ink strokes on the water
}

// meters per pixel
const PIXEL_SIZE = 0.035

type PixelPaintingProps = { pixels: string[]; colors: Record<string, string>; position: Vec3; rotationY: number }

// the pixel grid becomes one small image, drawn with no smoothing so every pixel
// stays a crisp square. drawn facing +z, then turned to face into the room
function PixelPainting({ pixels, colors, position, rotationY }: PixelPaintingProps) {
  const texture = useMemo(() => pixelTexture(pixels, colors), [pixels, colors])
  const width = pixels[0].length * PIXEL_SIZE
  const height = pixels.length * PIXEL_SIZE
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* frame */}
      <Box position={[0, 0, -0.01]} size={[width + 0.08, height + 0.08, 0.03]} color={COLOR.beam} castShadow={false} />
      <mesh position={[0, 0, 0.006]} receiveShadow>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial map={texture} roughness={0.9} />
      </mesh>
    </group>
  )
}

function pixelTexture(pixels: string[], colors: Record<string, string>) {
  const width = pixels[0].length
  const height = pixels.length
  const data = new Uint8Array(width * height * 4)
  pixels.forEach((row, r) => {
    ;[...row].forEach((key, c) => {
      const hex = parseInt((colors[key] ?? '#ff00ff').slice(1), 16)
      // texture rows start at the bottom, the grid starts at the top
      const i = ((height - 1 - r) * width + c) * 4
      data[i] = (hex >> 16) & 255
      data[i + 1] = (hex >> 8) & 255
      data[i + 2] = hex & 255
      data[i + 3] = 255
    })
  })
  const texture = new DataTexture(data, width, height, RGBAFormat)
  texture.colorSpace = SRGBColorSpace
  texture.magFilter = NearestFilter
  texture.minFilter = NearestFilter
  texture.needsUpdate = true
  return texture
}
