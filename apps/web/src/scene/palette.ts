import { Color } from 'three'

// scene colors. dark wood + warm plaster, all lit warm.
// the night outside the window is the only cool color
export const COLOR = {
  // room
  floorBase: '#140c07',
  floorPlanks: ['#3a2416', '#33200f', '#422a19', '#2c1b0f', '#3d2717'],
  wainscot: '#2e1d11',
  trim: '#24160c',
  plaster: '#a8937a',
  ceilingPanel: '#4a3322',
  beam: '#22160d',
  door: '#2a1a10',
  // furniture. light bamboo so tables and the bar stand out from the dark floor
  bamboo: '#d4b483',
  tableTop: '#d4b483',
  chair: '#3a2414',
  wood: '#4a2f1c',
  // people (placeholders until the people commit)
  person: '#7d7f87',
  hoodie: '#26262b',
  // tech
  laptop: '#b8bcc4',
  screen: '#9cc0ff',
  shade: '#1c1c1c',
  // light + air
  warmLight: '#ffc58a',
  skyFill: '#ffe2c2',
  groundFill: '#4a2f1c',
  nightLight: '#5f7fbf',
  night: '#0d1220',
  haze: '#2a1b10',
}

// pushed past white so the bloom pass picks it up
function glow(hex: string, strength: number) {
  return new Color(hex).multiplyScalar(strength)
}

export const GLOW = {
  bulb: glow('#ffd9a8', 6),
  downlight: glow('#ffd9a8', 4),
}
