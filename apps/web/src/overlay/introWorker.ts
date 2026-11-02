// intro drawing off the main thread, keeps going while the cafe loading blocks the page
import { createPainter, type Message, type Setup, type View } from './introPaint'

type Incoming = { type: 'init'; canvas: OffscreenCanvas; setup: Setup; view: View } | { type: 'resize'; view: View } | { type: 'open' }

const scope = self as unknown as {
  postMessage(message: Message): void
  onmessage: ((event: MessageEvent<Incoming>) => void) | null
  requestAnimationFrame?: (callback: () => void) => number
}
// not every browser has rAF in workers
const nextFrame = (callback: () => void) => (scope.requestAnimationFrame ? scope.requestAnimationFrame(callback) : setTimeout(callback, 16))

let painter: ReturnType<typeof createPainter> | null = null

scope.onmessage = ({ data }) => {
  if (data.type === 'init') painter = createPainter(data.canvas, data.setup, data.view, (message) => scope.postMessage(message), nextFrame)
  else if (data.type === 'resize') painter?.resize(data.view)
  else if (data.type === 'open') painter?.open()
}
