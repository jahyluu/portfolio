import { useEffect, useRef, useSyncExternalStore } from 'react'
import { toSvg } from 'html-to-image'
import { screenRect } from './screen'

// snapshot of the desktop/phone UI for the screen in the cafe (DeviceScreens.tsx).
// retaken in the background after changes so it's current by the time you scroll out

let element: HTMLElement | null = null
let image: HTMLCanvasElement | null = null
let version = 0
let busy = false
let rerun = false
let timer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()

export function registerDesktop(node: HTMLElement | null) {
  element = node
}

export function getSnapshot() {
  return image
}

export function useSnapshotVersion() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    () => version,
  )
}

// debounced so dragging a window only takes one snapshot at the end
export function scheduleSnapshot(delay = 600) {
  clearTimeout(timer)
  timer = setTimeout(() => {
    if ('requestIdleCallback' in window) requestIdleCallback(() => takeSnapshot(), { timeout: 1000 })
    else takeSnapshot()
  }, delay)
}

// fixes for the cloned markup. the live desktop isn't touched
// - backdrop-filter renders as a haze around windows, drop it
// - animations restart inside the svg, so a window can come out mid fade-in. drop them and
//   force windows opaque
// - no blur means the wallpaper shows through windows, so use a solid fill close to the
//   blurred color
// - html-to-image rounds font sizes down (13px -> 12.9px), which shifts the text on swap.
//   our sizes are all whole pixels so round them back up
function fixSnapshotMarkup(svg: string) {
  const [head, body] = svg.split(',', 2)
  const markup = decodeURIComponent(body)
    .replace(/(-webkit-)?(backdrop-filter|animation[a-z-]*):[^;"]*;?/g, '')
    .replace(/(class="window[^"]*"[^>]*style="[^"]*?)(?<![a-z-])opacity: [0-9.]+/g, '$1opacity: 1')
    .replace(/(class="window[^"]*"[^>]*style="[^"]*?)(?<![a-z-])transform: [^;"]+/g, '$1transform: none')
    .replace(/rgba\(30, 26, 38, 0\.92\)/g, 'rgb(43, 36, 51)')
    .replace(/(font(?:-size)?: [^;"]*?)(\d+)\.9px/g, (_, before: string, size: string) => `${before}${Number(size) + 1}px`)
  return `${head},${encodeURIComponent(markup)}`
}

// at device pixel ratio (capped at 2) so it's as sharp as the live desktop
async function rasterize(url: string, width: number, height: number) {
  const scale = Math.min(window.devicePixelRatio || 1, 2)
  const img = new Image()
  img.src = url
  await img.decode()
  // chrome can return a half-painted svg right after decode. html-to-image waits a frame too
  await new Promise(requestAnimationFrame)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas
}

// snapshot on load, after changes while it's open, and once more on the way out.
// resizes retake it even while hidden, otherwise the iOS toolbars hiding mid scroll stretch
// the old one and the icons jump when the live UI shows
export function useSnapshots(active: boolean, changes: unknown[], size: { width: number; height: number }) {
  useEffect(() => scheduleSnapshot(1000), [])
  useEffect(() => {
    if (active) scheduleSnapshot()
  }, [active, ...changes])
  const firstSize = useRef(true)
  useEffect(() => {
    if (firstSize.current) {
      firstSize.current = false
      return
    }
    scheduleSnapshot(150)
  }, [size.width, size.height])
  const wasActive = useRef(active)
  useEffect(() => {
    if (wasActive.current && !active) takeSnapshot()
    wasActive.current = active
  }, [active])
}

export async function takeSnapshot() {
  if (!element) return
  if (busy) {
    rerun = true
    return
  }
  busy = true
  try {
    // wait for running animations (window fade-in) or the clone catches them mid-way
    const animations = element.getAnimations({ subtree: true }).map((animation) => animation.finished.catch(() => {}))
    await Promise.race([Promise.all(animations), new Promise((resolve) => setTimeout(resolve, 1000))])
    const { width, height } = screenRect()
    const svg = await toSvg(element, {
      width,
      height,
      // system fonts, nothing to embed
      skipFonts: true,
      // iframes can't be captured (there's a placeholder page behind the resume pdf).
      // the dock is left out on purpose, it slides in on arrival
      filter: (node) => !(node instanceof HTMLIFrameElement) && !(node instanceof HTMLElement && node.classList.contains('dock')),
      // place it at 0,0 and make it visible (it's at opacity 0 in the cafe). the logical
      // insets get copied too and override left/top, so reset those as well
      style: { left: '0', top: '0', insetInlineStart: '0', insetBlockStart: '0', opacity: '1' },
    })
    image = await rasterize(fixSnapshotMarkup(svg), width, height)
    version++
    listeners.forEach((listener) => listener())
  } catch (error) {
    console.warn('desktop snapshot failed', error)
  }
  busy = false
  if (rerun) {
    rerun = false
    takeSnapshot()
  }
}
