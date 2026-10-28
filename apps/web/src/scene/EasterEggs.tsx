import { useEffect, useState } from 'react'
import { CanvasTexture, NearestFilter, SRGBColorSpace } from 'three'
import { LINKS } from '../links'
import type { Vec3 } from './layout'

export type StickerKind = 'swords' | 'music'

// clickable logo stickers on some laptop screens, they open links.ts.
// images live in public/stickers/ (transparent png works best), they get pixelated
// and drawn on a colored circle. if the file is missing the symbol is drawn instead.
// \uFE0E forces text rendering instead of emoji.
// pixels/levels: how chunky the pixelation is. fill: how much of the circle the logo takes
type Sticker = {
  link: string
  image: string
  background: string
  ink: string
  symbol: string
  pixels: number
  levels: number
  fill: number
}

const STICKERS: Record<StickerKind, Sticker> = {
  swords: {
    link: LINKS.league,
    image: '/stickers/league.png',
    background: '#1b2a44',
    ink: '#d4b26a',
    symbol: '\u2694\uFE0E',
    pixels: 20,
    levels: 5,
    fill: 0.7,
  },
  // thin lines, needs a finer grid than league
  music: {
    link: LINKS.music,
    image: '/stickers/spotify.png',
    background: '#1e1e20',
    ink: '#efe9dd',
    symbol: '\u266A\uFE0E',
    pixels: 32,
    levels: 8,
    fill: 0.88,
  },
}

// oversized so it's visible from a distance
const RADIUS = 0.055


type LaptopStickerProps = { kind: StickerKind; position: Vec3; rotationY?: number; onScreen?: boolean }

// onScreen: unlit so it matches the screen glow instead of picking up room light
export function LaptopSticker({ kind, position, rotationY = 0, onScreen = false }: LaptopStickerProps) {
  const sticker = STICKERS[kind]
  const { link, image } = sticker
  // symbol first, swap to the image once it loads
  const [texture, setTexture] = useState(() => stickerTexture(sticker))
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    if (!image) return
    const logo = new Image()
    logo.onload = () => setTexture(stickerTexture(sticker, logo))
    // keep the symbol if the image fails
    logo.src = image
  }, [image, sticker])
  const clickable = link !== ''

  // reset cursor if unmounted while hovered
  useEffect(() => () => void (document.body.style.cursor = ''), [])

  return (
    <mesh
      position={position}
      rotation={[0, rotationY, 0]}
      scale={hovered ? 1.15 : 1}
      onClick={(event) => {
        if (!clickable) return
        event.stopPropagation()
        window.open(link, '_blank', 'noopener,noreferrer')
      }}
      onPointerOver={(event) => {
        if (!clickable) return
        event.stopPropagation()
        setHovered(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = ''
      }}
    >
      <circleGeometry args={[RADIUS, 20]} />
      {onScreen ? <meshBasicMaterial map={texture} /> : <meshStandardMaterial map={texture} roughness={0.5} />}
    </mesh>
  )
}

function stickerTexture({ background, ink, symbol, ...grid }: Sticker, logo?: HTMLImageElement) {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = background
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
  ctx.fill()

  if (logo) {
    // clip logo to the circle
    ctx.save()
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(pixelate(logo, background, grid), 0, 0, size, size)
    ctx.restore()
  } else {
    ctx.fillStyle = ink
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '76px serif'
    ctx.fillText(symbol, size / 2, size / 2 + 4)
  }

  // white edge ring
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2)
  ctx.stroke()

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.magFilter = NearestFilter
  return texture
}

// downscale to `pixels` wide and posterize to `levels` per channel.
// gets upscaled with nearest filtering, so lower = chunkier
function pixelate(logo: HTMLImageElement, background: string, { pixels, levels, fill }: Pick<Sticker, 'pixels' | 'levels' | 'fill'>) {
  const small = document.createElement('canvas')
  small.width = pixels
  small.height = pixels
  const ctx = small.getContext('2d')!
  ctx.fillStyle = background
  ctx.fillRect(0, 0, pixels, pixels)
  // contain-fit, keep aspect ratio
  const fit = (pixels * fill) / Math.max(logo.width, logo.height)
  const w = logo.width * fit
  const h = logo.height * fit
  ctx.drawImage(logo, (pixels - w) / 2, (pixels - h) / 2, w, h)

  const image = ctx.getImageData(0, 0, pixels, pixels)
  const step = 255 / (levels - 1)
  for (let i = 0; i < image.data.length; i += 4) {
    image.data[i] = Math.round(image.data[i] / step) * step
    image.data[i + 1] = Math.round(image.data[i + 1] / step) * step
    image.data[i + 2] = Math.round(image.data[i + 2] / step) * step
  }
  ctx.putImageData(image, 0, 0)
  return small
}
