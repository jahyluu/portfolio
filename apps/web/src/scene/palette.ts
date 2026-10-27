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
  windowFrame: '#7a4a26',
  // furniture. light bamboo so tables and the bar stand out from the dark floor
  bamboo: '#d4b483',
  tableTop: '#d4b483',
  chair: '#3a2414',
  banquette: '#5c2e24', // oxblood leather
  wood: '#4a2f1c',
  barBody: '#3a2415',
  slat: '#3b2616',
  slatAlt: '#33200f',
  menuBoard: '#1b1a18',
  chalk: '#d9d4c7',
  brass: '#b08d57',
  // gear
  steel: '#a7adb3',
  black: '#1e1e20',
  glass: '#cfe3e8',
  beans: '#3b2414',
  coffee: '#2a1608',
  registerScreen: '#33465a',
  // cups, teapots, pots
  ceramics: ['#e8e1d3', '#9fb8a0', '#b4673f', '#d9cbb0', '#5c6b73', '#efe9dd'],
  syrups: ['#c9862e', '#7a3b1a', '#b5262a', '#4a2c17', '#6f8f3a'],
  label: '#efe9dd',
  bottles: ['#7a4a1c', '#2f5a3a', '#a8763a', '#3d2a1a', '#c9b38a', '#5a2a2a'],
  leaves: ['#3f6b35', '#4f7d3f', '#2f5229', '#5b8a45'],
  // pastries
  pastry: '#c98a3e',
  pastryDark: '#7a4a22',
  cookie: '#b9834a',
  paperCup: '#d8cbb5',
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
  // back panel of the cup shelves. just over white so it glows softly
  shelfPanel: glow('#ffcf8a', 1.25),
  ledStrip: glow('#ffd9a8', 3),
}
