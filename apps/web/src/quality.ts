// phones/tablets
export const TOUCH = window.matchMedia('(pointer: coarse)').matches

// lower dpr, no msaa, smaller shadow maps
export const LOW_POWER = TOUCH

// no webgl = no cafe, App skips to the desktop/phone
export const HAS_WEBGL = (() => {
  try {
    const gl = document.createElement('canvas').getContext('webgl2')
    // drop the test context now, if the gc gets to it later it hitches the intro
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    return !!gl
  } catch {
    return false
  }
})()
