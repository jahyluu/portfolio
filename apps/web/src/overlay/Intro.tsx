import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { markIntroDone, useSceneReady } from '../loading'
import { createPainter, type Message, type Setup, type View } from './introPaint'
import { SIGNATURE } from './signature'
import './intro.css'

// loading screen. signature gets written while the cafe loads, then opens up outward once it's
// ready. drawn in a worker (introPaint.ts) so loading can't make the pen stutter

const SETUP = {
  ink: 5,
  // ms. extras are timed by length
  write: { stroke: 3200, gap: 80, extraSpeed: 0.9, hold: 300 },
  open: 1300,
}
// max share of the screen the signature takes up
const FILL = { landscape: 0.55, portrait: 0.86, height: 0.72 }

type Painter = { resize(view: View): void; open(): void; stop(): void }

export function Intro() {
  const ready = useSceneReady()
  const [opening, setOpening] = useState(false)
  const [done, setDone] = useState(false)
  const holder = useRef<HTMLDivElement>(null)
  const painter = useRef<Painter | null>(null)

  // swap out the white cover from index.html
  useLayoutEffect(() => {
    document.getElementById('cover')?.remove()
  }, [])
  // no scrolling until it's gone
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('intro-active', !done)
    if (done) markIntroDone()
    return () => document.documentElement.classList.remove('intro-active')
  }, [done])

  useLayoutEffect(() => {
    // canvases can only be transferred once, new one per run (strict mode runs this twice)
    const canvas = document.createElement('canvas')
    holder.current!.append(canvas)
    const strokes = [SIGNATURE.stroke, ...SIGNATURE.extras]
    const setup: Setup = {
      ...SETUP,
      strokes,
      lengths: strokes.map(measure),
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    }
    const onMessage = ({ type }: Message) => {
      if (type === 'opening') setOpening(true)
      if (type === 'done') setDone(true)
    }

    let worker: Worker | null = null
    if ('transferControlToOffscreen' in canvas && typeof Worker !== 'undefined') {
      try {
        const offscreen = canvas.transferControlToOffscreen()
        worker = new Worker(new URL('./introWorker.ts', import.meta.url), { type: 'module' })
        worker.onmessage = (event: MessageEvent<Message>) => onMessage(event.data)
        worker.postMessage({ type: 'init', canvas: offscreen, setup, view: view() }, [offscreen])
        const thread = worker
        painter.current = {
          resize: (next) => thread.postMessage({ type: 'resize', view: next }),
          open: () => thread.postMessage({ type: 'open' }),
          stop: () => thread.terminate(),
        }
      } catch {
        worker = null
      }
    }
    // no OffscreenCanvas, draw on the main thread
    if (!worker) painter.current = createPainter(canvas, setup, view(), onMessage, (callback) => requestAnimationFrame(callback))

    const onResize = () => painter.current?.resize(view())
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      painter.current?.stop()
      painter.current = null
      canvas.remove()
    }
  }, [])

  // opens once it's done writing
  useEffect(() => {
    if (ready) painter.current?.open()
  }, [ready])

  if (done) return null
  return <div ref={holder} className={`intro${opening ? ' opening' : ''}`} aria-hidden="true" />
}

function view(): View {
  const width = window.innerWidth
  const height = window.innerHeight
  return { width, height, dpr: Math.min(window.devicePixelRatio || 1, 2), viewBox: frame(width / height) }
}

// signature-space area that fills the screen, signature centered and as big as FILL allows
function frame(aspect: number): [number, number, number, number] {
  const { box } = SIGNATURE
  const width = Math.max(box.width / (aspect < 1 ? FILL.portrait : FILL.landscape), (box.height / FILL.height) * aspect)
  const height = width / aspect
  return [box.x + box.width / 2 - width / 2, box.y + box.height / 2 - height / 2, width, height]
}

// Path2D can't measure length, an svg path can (needs to be in the document for firefox)
function measure(d: string) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', d)
  svg.append(path)
  svg.style.position = 'absolute'
  svg.style.visibility = 'hidden'
  document.body.append(svg)
  const length = path.getTotalLength()
  svg.remove()
  return length
}
