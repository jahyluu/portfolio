// draws the intro on a 2d canvas: writing, pulsing while the cafe loads, then widening out to
// erase the page. runs in introWorker.ts when it can

export type View = {
  // css px
  width: number
  height: number
  dpr: number
  // signature-space area that fills the screen
  viewBox: [number, number, number, number]
}

export type Setup = {
  // svg path data, main stroke first
  strokes: string[]
  // measured on the main thread, Path2D can't
  lengths: number[]
  ink: number
  // ms
  write: { stroke: number; gap: number; extraSpeed: number; hold: number }
  open: number
  reducedMotion: boolean
}

// sent back to the page: written, opening, done
export type Message = { type: 'written' | 'opening' | 'done' }

type Canvas = HTMLCanvasElement | OffscreenCanvas
type Context = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

const clamp = (x: number) => Math.min(Math.max(x, 0), 1)
const easeInOut = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t))
const easeIn = (t: number) => clamp(t) ** 2.4
const PULSE = 1800

export function createPainter(canvas: Canvas, setup: Setup, initial: View, post: (message: Message) => void, nextFrame: (callback: () => void) => void) {
  const context = canvas.getContext('2d') as Context
  const paths = setup.strokes.map((d) => new Path2D(d))
  const { lengths, ink, write } = setup

  // extras go one after another
  const timing = [{ at: 0, duration: write.stroke }]
  let at = write.stroke
  lengths.slice(1).forEach((length) => {
    at += write.gap
    timing.push({ at, duration: length / write.extraSpeed })
    at += length / write.extraSpeed
  })
  const writeEnd = setup.reducedMotion ? 0 : at + write.hold

  let view = initial
  let start = 0
  let written = false
  let wantOpen = false
  let openedAt = 0
  let stopped = false

  function resize(next: View) {
    view = next
    canvas.width = Math.round(view.width * view.dpr)
    canvas.height = Math.round(view.height * view.dpr)
  }

  function draw(now: number) {
    const t = now - start
    const [x, y, w, h] = view.viewBox
    const scale = canvas.width / w
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.setTransform(scale, 0, 0, scale, -x * scale, -y * scale)
    context.lineCap = 'round'
    context.lineJoin = 'round'

    if (openedAt) {
      const u = (now - openedAt) / setup.open
      if (setup.reducedMotion) {
        // reduced motion, just fade
        context.globalAlpha = 1 - clamp(u)
        page(x, y, w, h)
        context.globalAlpha = 1
        return u >= 1
      }
      // the line becomes a window onto the cafe, ends wide enough to cover the screen
      page(x, y, w, h)
      context.globalCompositeOperation = 'destination-out'
      context.lineWidth = ink * 1.6 + easeIn(u) * Math.hypot(w, h) * 1.2
      paths.forEach((path) => context.stroke(path))
      context.globalCompositeOperation = 'source-over'
      return u >= 1
    }

    page(x, y, w, h)
    context.strokeStyle = '#111'
    context.lineWidth = ink
    // pulse while the cafe finishes loading
    if (written) context.globalAlpha = 0.775 + 0.225 * Math.cos(((t - writeEnd) / PULSE) * Math.PI * 2)
    paths.forEach((path, i) => {
      const { at, duration } = timing[i]
      const drawn = setup.reducedMotion ? lengths[i] : easeInOut((t - at) / duration) * lengths[i]
      // 0 length dash still draws a dot with round caps
      if (drawn <= 0) return
      context.setLineDash([drawn, lengths[i] + 10])
      context.stroke(path)
    })
    context.setLineDash([])
    context.globalAlpha = 1
    return false
  }

  function page(x: number, y: number, w: number, h: number) {
    context.fillStyle = '#fff'
    context.fillRect(x - w, y - h, w * 3, h * 3)
  }

  function tick() {
    if (stopped) return
    const now = performance.now()
    if (!start) start = now
    if (!written && now - start >= writeEnd) {
      written = true
      post({ type: 'written' })
    }
    if (written && wantOpen && !openedAt) {
      openedAt = now
      post({ type: 'opening' })
    }
    const finished = draw(now)
    if (finished) {
      stopped = true
      post({ type: 'done' })
      return
    }
    nextFrame(tick)
  }

  resize(initial)
  nextFrame(tick)

  return {
    resize,
    // opens once it's done writing
    open() {
      wantOpen = true
    },
    stop() {
      stopped = true
    },
  }
}
