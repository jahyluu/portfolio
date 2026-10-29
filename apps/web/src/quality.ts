// phones/tablets
export const TOUCH = window.matchMedia('(pointer: coarse)').matches

// lower dpr, no msaa, smaller shadow maps
export const LOW_POWER = TOUCH

// no webgl = no cafe, App skips to the desktop/phone
export const HAS_WEBGL = (() => {
  try {
    return !!document.createElement('canvas').getContext('webgl2')
  } catch {
    return false
  }
})()
