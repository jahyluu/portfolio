# Portfolio

My personal portfolio site. It opens on a cozy low-poly cafe on a rainy night: I'm sitting at a
table in the middle of the room, working on a laptop. Scrolling spirals the camera down and around
the room, over my shoulder and into the laptop, where the screen becomes a working Mac-style
desktop with folders for my projects, about, tech stack, resume and contact info. On a phone,
the camera ends on the phone lying next to my coffee instead, and it opens into an Android-style
home screen.

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

The 1 and 2 keys jump straight to the cafe or the desktop, the scroll cue doubles as a skip
button, and `/#desktop` opens straight onto the desktop.

## The desktop

**How the handoff works**
- The laptop display is always 16:10 and ends up at 90% of the window, so the desktop looks the
  same on any monitor and the laptop's edges stay visible around it
- In the cafe, the laptop screen shows a snapshot of the desktop as a texture in the 3D scene.
  It's retaken in the background a moment after anything changes, so it's always current
- From far away my laptop has the same plain blue screen as everyone else's. The snapshot fades
  in over it as the camera gets close and back out as you scroll away (on the phone it fades
  from the black glass)
- When the camera lands, the live HTML desktop fades in over the snapshot. Both are fitted to
  the same whole-pixel rect, so they line up exactly and the swap isn't visible
- The screen is drawn after the glow and color grading so its colors match the live desktop,
  and anything near my table (my arms, the coffee) still passes in front of it
- In a small window the desktop scales down as a whole like a real screen, so icons and the
  menu bar don't run out of room
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

## The phone

Tall, narrow windows (phones, or a squeezed browser window) get the phone instead of the laptop.
The camera follows the same spiral, then turns away from the laptop near the end and comes down
over the phone on the table until its screen fills 95% of the window. The handoff works the same
way as the desktop: a snapshot on the phone screen in the cafe, the live UI once the camera lands.

- Samsung-style home screen: clock widget, app icons and a dock row over the wallpaper
- Apps open full screen with a big title that scrolls away under a compact toolbar
- Projects list that opens each project, About, Tech Stack, Contact and the resume (opens or
  downloads the PDF, since phones don't show PDFs inline)
- Nav bar that's always at the bottom, in Samsung's order: recents, home, back
- Recents shows open apps as cards: tap one to switch, swipe it up to close, or close them all
- A Café app that goes back out to the cafe
- Open apps and scroll positions stay in memory like the desktop

**On phones in general**
- No pull-to-refresh or bounce while scrolling, and app scrolling doesn't leak into the page
- Touchscreens get a lighter render: lower resolution, no MSAA and smaller shadow maps
- Without WebGL the site skips the cafe and opens straight onto the desktop or phone UI

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
- My table: laptop, phone, coffee with steam, a fruit tart, my backpack beside the chair
- An ink-wash style pixel painting, a floor-to-ceiling storefront window and a glass door
- Very wide windows crop the top and bottom instead of seeing past the walls
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
│           │   ├── DeviceScreens.tsx # UI snapshots on my laptop and phone screens
│           │   ├── Phone.tsx         # my phone on the table
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
│           │   ├── screen.ts         # laptop or phone, and where its display sits
│           │   ├── snapshot.ts       # snapshot for the laptop/phone screen
│           │   ├── icons.tsx
│           │   └── desktop.css
│           ├── phone/
│           │   ├── PhoneUI.tsx       # status bar, home screen, apps, recents, nav bar
│           │   ├── store.ts          # open apps (in memory, resets on reload)
│           │   └── phone.css
│           ├── handoff.ts       # cafe -> desktop handoff
│           ├── quality.ts       # lighter render on phones, WebGL check
│           ├── scroll.ts        # scroll progress, 1/2 shortcuts
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

Then open the local URL Vite prints. In development a frame-rate counter shows in the top left.

To try it on a real phone, run `npm run dev -- --host` and open the network URL Vite prints on a
phone on the same Wi-Fi.

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
- [x] Skip-to-desktop button and a `#desktop` link
- [x] Desktop UI: menu bar, dock, Finder, project windows, resizing, full screen
- [ ] More macOS polish and animations
- [x] Phone layout: phone on the table, Android-style home screen, apps and recents
- [ ] Reduced-motion version
- [ ] Final project descriptions, screenshots and links (drafts are in place)
- [ ] Backend: projects API, terminal, live metrics, guestbook, contact form
- [ ] Performance and accessibility pass
- [ ] Deploy with a custom domain

## Credits

Third-party models, textures and animations are listed in
[assets-src/CREDITS.md](assets-src/CREDITS.md) with their sources and licenses. The desktop
wallpaper is my own fan art.
