import { useEffect, useState } from 'react'

// tall narrow windows get the phone, everything else gets the laptop
export type Device = 'laptop' | 'phone'

export function deviceFor(viewportWidth: number, viewportHeight: number): Device {
  return viewportWidth / viewportHeight < 0.8 ? 'phone' : 'laptop'
}

// fixed aspect, fills `fit` of the window once the camera lands.
// phone gets more since the screen's small already
export const DISPLAYS = {
  laptop: { aspect: 16 / 10, fit: 0.9 },
  // 9:19.5, like most current phones
  phone: { aspect: 9 / 19.5, fit: 0.95 },
} as const

// laptop-only code still uses this
export const SCREEN_ASPECT = DISPLAYS.laptop.aspect

// measure a fixed inset: 0 box, same as the canvas. clientHeight doesn't change on iOS when
// the toolbars hide, so the UI came out smaller than the 3d screen
let box: HTMLElement | null = null
function viewportBox() {
  if (!box) {
    box = document.createElement('div')
    box.style.cssText = 'position: fixed; inset: 0; visibility: hidden; pointer-events: none'
    document.body.appendChild(box)
  }
  return box
}

function viewport() {
  const { width, height } = viewportBox().getBoundingClientRect()
  return { width: Math.round(width), height: Math.round(height) }
}

// display rect in css px at the end of the scroll
export function screenRect(
  viewportWidth = viewport().width,
  viewportHeight = viewport().height,
  device = deviceFor(viewportWidth, viewportHeight),
) {
  // canvas size can be fractional
  viewportWidth = Math.round(viewportWidth)
  viewportHeight = Math.round(viewportHeight)
  const { aspect, fit } = DISPLAYS[device]
  // whole pixels with an even margin on each side so it's exactly centered. CameraRig and the
  // 3d screens fit to this rect so the snapshot lines up 1:1 with the live UI
  let height = Math.floor(Math.min(viewportHeight, viewportWidth / aspect) * fit)
  if ((viewportHeight - height) % 2) height -= 1
  let width = Math.round(height * aspect)
  if ((viewportWidth - width) % 2) width -= 1
  return { width, height, left: (viewportWidth - width) / 2, top: (viewportHeight - height) / 2, device }
}

// ResizeObserver, not the resize event. scrollbars and the iOS toolbars change the size
// without always firing resize
export function useScreenRect() {
  const [rect, setRect] = useState(() => screenRect())
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      const next = screenRect()
      setRect((rect) =>
        rect.width === next.width && rect.height === next.height && rect.left === next.left && rect.top === next.top && rect.device === next.device
          ? rect
          : next,
      )
    })
    observer.observe(viewportBox())
    return () => observer.disconnect()
  }, [])
  return rect
}

export function useDevice() {
  return useScreenRect().device
}
