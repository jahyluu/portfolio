import { useEffect, useState } from 'react'

// the laptop display is always 16:10 and fills SCREEN_FIT of the window at the end of the
// scroll, so the layout is the same on any monitor
export const SCREEN_ASPECT = 16 / 10
export const SCREEN_FIT = 0.9

// display rect in css px at the end of the scroll. uses clientWidth (no scrollbar) to match
// the canvas, innerWidth puts it off center by half the scrollbar width
export function screenRect(
  viewportWidth = document.documentElement.clientWidth,
  viewportHeight = document.documentElement.clientHeight,
) {
  // whole pixels with an even margin on each side so it's exactly centered. CameraRig and
  // DesktopScreen fit to this rect so the snapshot lines up 1:1 with the live desktop
  let height = Math.floor(Math.min(viewportHeight, viewportWidth / SCREEN_ASPECT) * SCREEN_FIT)
  if ((viewportHeight - height) % 2) height -= 1
  let width = Math.round(height * SCREEN_ASPECT)
  if ((viewportWidth - width) % 2) width -= 1
  return { width, height, left: (viewportWidth - width) / 2, top: (viewportHeight - height) / 2 }
}

// ResizeObserver instead of the resize event: a scrollbar appearing after load changes the
// width without firing resize
export function useScreenRect() {
  const [rect, setRect] = useState(() => screenRect())
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      const next = screenRect()
      setRect((rect) => (rect.width === next.width && rect.height === next.height && rect.left === next.left && rect.top === next.top ? rect : next))
    })
    observer.observe(document.documentElement)
    return () => observer.disconnect()
  }, [])
  return rect
}
