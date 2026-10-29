# Portfolio

My personal portfolio site. It opens on a cozy low-poly cafe on a rainy night: I'm sitting at a
table in the middle of the room, working on a laptop. Scrolling spirals the camera down and around
the room, over my shoulder and into the laptop, where the screen becomes a working Mac-style
desktop with folders for my projects, about, tech stack, resume and contact info.

## The scroll

The camera follows one continuous spiral driven by scroll position, so the motion is smooth in
both directions with no cuts between shots.

| Scroll | Camera | What's on screen |
| --- | --- | --- |
| Start | High in a corner, 3/4 view of my table and the back of the laptop | Name, title, scroll cue |
| Early | Spirals down around the room | Name fades out |
| Middle | Comes around behind my right shoulder | The laptop screen comes into view, showing the desktop |
| End | Stops square on to the laptop, screen at 90% of the window | The live desktop fades in and the dock slides up |

Scrolling back up leaves the desktop and pulls the camera back out into the cafe. Anything left
open on the desktop stays open: it shows on the laptop screen while you look around, and it's
still there when you scroll back in. A page reload resets it.

## The desktop

**How the handoff works**
- The laptop display is always 16:10 and ends up at 90% of the window, so the desktop looks the
  same on any monitor and the laptop's edges stay visible around it
- In the cafe, the laptop screen shows a snapshot of the desktop as a texture in the 3D scene.
  It's retaken in the background a moment after anything changes, so it's always current
- When the camera lands, the live HTML desktop fades in over the snapshot. Both are fitted to
  the same whole-pixel rect, so they line up exactly and the swap isn't visible
- The 3D scene stops rendering while you're on the desktop and wakes up when you scroll

**What's on it**
- Wallpaper: my own low-poly Kindred fan art, centered on Kindred
- Menu bar with the focused app's name and a live date and time
- Desktop icons for Projects, About Me, Tech Stack, Resume.pdf and Contact
- Dock with hover labels, magnification and dots under open apps
- Finder-style Projects window with a folder per project, each opening a details window
- About, Tech Stack, Contact (with copy-to-clipboard) and the resume PDF

**Windows**
- Drag by the title bar, resize from any edge or corner
- Traffic light buttons with macOS glyphs on hover: close, minimize to the dock, full screen
- Full screen fills everything under the menu bar. The title bar hides until you move to the
  top of the screen, and the dock hides until you move to the bottom

## The scene

**Inside the cafe**
- Dark wood plank floor, paneled walls, beamed ceiling with warm recessed downlights and string
  lights draped along the beams
- Long bar with stools, a self-serve station, register, pastry case, teapots and pendant lamps
- Back counter with espresso machine, grinder, brewer and blender; lit shelves of syrups,
  liquor bottles and cups; a menu board; vines trailing off the top shelf
- Tables around the room: a poker game, a study group, a window booth with cushioned seats, a
  reader on the west wall, and someone asleep next to a spilled coffee that drips off the table
- Cafe chairs with legs; empty ones are tucked half under their tables
- Laptops with QWERTY keyboards and trackpads
- My table: laptop, coffee with steam, a fruit tart, my backpack beside the chair
- An ink-wash style pixel painting, a floor-to-ceiling storefront window and a glass door
- Soft, warm lighting with shadows, glow and film-style color grading. The glow eases off as the
  camera gets close to the laptop so the close-up stays sharp

**People**
- Me, typing at my laptop and sipping my coffee
- A barista who moves between making drinks, the register and the pastry case
- Customers, each with their own look and idle loop:
  - Poker table: one player checking and pointing around the table, one holding pocket aces,
    and a nervous one who rubs his forehead, peeks at his cards and raises
  - Study table: someone playing League who loses a fight now and then, and someone taking notes
  - Window booth: a couple chatting (she laughs every so often), someone on a laptop, someone
    on their phone
  - A reader on the west wall, and the sleeper with his head on his arms
- Low-poly sneakers, loafers and sandals
- Necks that bend with the head and rounded shoulders on everyone

**Outside**
- A gentle night rain falling across everything, with drops running down the window glass
- A narrow wet street along the window and a second street outside the door, lined with shops
- A park across the street: a winding river with stone banks, cherry trees arching over it,
  petals falling and drifting downstream, rain ripples, ducks, gravel trails on both banks,
  benches, warm lantern posts and an arched footbridge
- A small bus stop at the edge of the park, utility poles, and a distant skyline

## Tech stack

- **Front end:** React, TypeScript, Vite
- **3D:** Three.js with React Three Fiber and drei
- **Post-processing:** bloom, tone mapping and vignette via @react-three/postprocessing
- **Rain on the glass:** a custom GLSL shader
- **Desktop snapshot:** html-to-image, drawn onto the laptop screen in a separate pass after
  post-processing so the colors match the live desktop
- **Backend (planned):** REST API with PostgreSQL

Everything is built from code (no imported models yet). Repeated objects like rain, rocks,
gravel, petals and blossoms are instanced so the scene stays fast.

## Project structure

```
portfolio/
├── apps/
│   └── web/                     # front end
│       ├── public/
│       │   ├── stickers/        # logo images for the laptop easter eggs
│       │   ├── wallpaper.webp   # desktop wallpaper (+ a small copy that loads first)
│       │   └── resume.pdf
│       └── src/
│           ├── scene/
│           │   ├── layout.ts         # where everything sits, camera path
│           │   ├── CameraRig.tsx     # scroll-driven camera
│           │   ├── Lighting.tsx      # lights
│           │   ├── StringLights.tsx  # string lights along the beams
│           │   ├── PostEffects.tsx   # glow, color grading, vignette
│           │   ├── Room.tsx          # floor, walls, ceiling, window, door
│           │   ├── Bar.tsx           # the bar and everything on it
│           │   ├── BackWall.tsx      # coffee gear, shelves, menu board
│           │   ├── CafeBlockout.tsx  # tables, chairs, booth, laptops, who sits where
│           │   ├── Tabletop.tsx      # cups, pastries, papers, cards, chips, the spill
│           │   ├── Me.tsx            # me at my table
│           │   ├── Barista.tsx       # the barista and her routine
│           │   ├── Customer.tsx      # the customers, their looks and idle loops
│           │   ├── body.tsx          # shared character pieces (limbs, IK, hair)
│           │   ├── Sneakers.tsx      # sneakers, loafers and sandals
│           │   ├── DesktopScreen.tsx # desktop snapshot on my laptop screen
│           │   ├── Paintings.tsx     # framed art
│           │   ├── EasterEggs.tsx    # clickable logos on the laptops
│           │   ├── RainGlass.tsx     # rain running down the glass
│           │   ├── Outside.tsx       # streets, shops, bus stop, falling rain
│           │   ├── Park.tsx          # river, trees, trails, bridge, ducks
│           │   └── OutsideKit.tsx    # shared outside layout, colors, materials
│           ├── desktop/
│           │   ├── Desktop.tsx       # menu bar, icons, windows, dock
│           │   ├── apps.tsx          # what each window shows
│           │   ├── content.ts        # projects, bio, experience, links
│           │   ├── store.ts          # open windows (in memory, resets on reload)
│           │   ├── screen.ts         # where the display sits in the window
│           │   ├── snapshot.ts       # snapshot for the laptop screen
│           │   ├── icons.tsx
│           │   └── desktop.css
│           ├── handoff.ts       # cafe -> desktop handoff
│           ├── overlay/         # HTML on top of the scene (name, title)
│           ├── links.ts         # my profile links
│           └── styles/
├── assets-src/                  # source files; CREDITS.md tracks licenses
└── docs/decisions/              # notes on major design decisions
```

`apps/api/` (backend) will be added later.

## Running locally

Requires Node 20.19 or newer.

```
cd apps/web
npm install
npm run dev
```

Then open the local URL Vite prints. In development, the number keys 1–5 jump to 0%, 25%, 50%,
75% and 100% of the scroll (5 lands on the desktop), and a frame-rate counter shows in the top
left.

Other scripts:

- `npm run typecheck` checks types
- `npm run build` creates a production build in `dist/`
- `npm run preview` serves the production build

## Roadmap

- [x] Plan the concept, room layout and camera storyboard
- [x] Set up the front end (Vite, React, TypeScript, React Three Fiber)
- [x] Scroll-driven spiral camera from the opening shot into the laptop screen
- [x] Room shell and lighting: wood, beams, warm downlights, shadows, glow, color grading
- [x] Bar, back wall, tables and props
- [x] Window, door, rain on the glass, and the rainy street and park outside
- [x] People: me, the barista and the other customers
- [x] Window booth, cafe chairs, string lights
- [ ] Remaining props: plants and vines inside, paintings on the south wall
- [x] Transition from the 3D screen into the desktop
- [ ] Skip-to-desktop button and a `#desktop` link
- [x] Desktop UI: menu bar, dock, Finder, project windows, resizing, full screen
- [ ] More macOS polish and animations
- [ ] Phone layout: home screen with app icons
- [ ] Reduced-motion version
- [ ] Final project descriptions, screenshots and links (drafts are in place)
- [ ] Backend: projects API, terminal, live metrics, guestbook, contact form
- [ ] Performance and accessibility pass
- [ ] Deploy with a custom domain

## Credits

Third-party models, textures and animations are listed in
[assets-src/CREDITS.md](assets-src/CREDITS.md) with their sources and licenses. The desktop
wallpaper is my own fan art.
