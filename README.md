# Portfolio

My personal portfolio site. It opens on a cozy low-poly cafe on a rainy night: I'm sitting at a
table in the middle of the room, working on a laptop. Scrolling spirals the camera down and around
the room, over my shoulder and into the laptop screen, which turns into a Mac-style desktop with
folders for my projects, tech stack, about and contact info.

## The scroll

The camera follows one continuous spiral driven by scroll position, so the motion is smooth in
both directions with no cuts between shots.

| Scroll | Camera | What's on screen |
| --- | --- | --- |
| Start | High in a corner, 3/4 view of my table and the back of the laptop | Name, title, scroll cue |
| Early | Spirals down around the room | Name fades out |
| Middle | Comes around behind my right shoulder | The laptop screen comes into view |
| End | Pushes into the laptop | The screen fills the whole window |
| Next | Hands off to the page | Live desktop (in progress) |

## The scene

**Inside the cafe**
- Dark wood plank floor, paneled walls, beamed ceiling with warm recessed downlights
- Long bar with stools, a self-serve station, register, pastry case, teapots and pendant lamps
- Back counter with espresso machine, grinder, brewer and blender; lit shelves of syrups,
  liquor bottles and cups; a menu board; vines trailing off the top shelf
- Tables around the room: a poker game, a study group, a window booth, a reader on the west wall,
  and someone asleep next to a spilled coffee that drips off the table
- My table: laptop, coffee with steam, a fruit tart
- An ink-wash style pixel painting, a floor-to-ceiling storefront window and a glass door
- Soft, warm lighting with shadows, glow and film-style color grading

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
- **Backend (planned):** REST API with PostgreSQL

Everything is built from code (no imported models yet). Repeated objects like rain, rocks,
gravel, petals and blossoms are instanced so the scene stays fast.

## Project structure

```
portfolio/
├── apps/
│   └── web/                     # front end
│       ├── public/stickers/     # logo images for the laptop easter eggs
│       └── src/
│           ├── scene/
│           │   ├── layout.ts        # where everything sits, camera path
│           │   ├── CameraRig.tsx    # scroll-driven camera
│           │   ├── Lighting.tsx     # lights
│           │   ├── PostEffects.tsx  # glow, color grading, vignette
│           │   ├── Room.tsx         # floor, walls, ceiling, window, door
│           │   ├── Bar.tsx          # the bar and everything on it
│           │   ├── BackWall.tsx     # coffee gear, shelves, menu board
│           │   ├── CafeBlockout.tsx # people, tables, laptops (placeholders)
│           │   ├── Tabletop.tsx     # cups, pastries, papers, cards, the spill
│           │   ├── Paintings.tsx    # framed art
│           │   ├── EasterEggs.tsx   # clickable logos on the laptops
│           │   ├── RainGlass.tsx    # rain running down the glass
│           │   ├── Outside.tsx      # streets, shops, bus stop, falling rain
│           │   ├── Park.tsx         # river, trees, trails, bridge, ducks
│           │   └── OutsideKit.tsx   # shared outside layout, colors, materials
│           ├── overlay/         # HTML on top of the scene (name, title)
│           ├── links.ts         # my profile links
│           └── styles/
├── assets-src/                  # source files; CREDITS.md tracks licenses
└── docs/decisions/              # notes on major design decisions
```

`apps/api/` (backend) and `content/` (project descriptions) will be added later.

## Running locally

Requires Node 20.19 or newer.

```
cd apps/web
npm install
npm run dev
```

Then open the local URL Vite prints. In development, the number keys 1–5 jump to 0%, 25%, 50%,
75% and 100% of the scroll, and a frame-rate counter shows in the top left.

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
- [ ] People: me, the barista and the other customers
- [ ] Remaining props: plants and vines inside, window bench, paintings on the south wall
- [ ] Transition from the 3D screen into the desktop page, skip button
- [ ] Mobile framing and a reduced-motion version
- [ ] Desktop UI: menu bar, dock, Finder, project Properties panels, back-to-cafe button
- [ ] Project descriptions, resume and contact links
- [ ] Backend: projects API, terminal, live metrics, guestbook, contact form
- [ ] Performance and accessibility pass
- [ ] Deploy with a custom domain

## Credits

Third-party models, textures and animations are listed in
[assets-src/CREDITS.md](assets-src/CREDITS.md) with their sources and licenses.
