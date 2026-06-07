# Koi Meditative Pond

A real-time, biologically-inspired koi pond simulation built with React, TypeScript, and HTML5 Canvas. Watch authentic Japanese koi varieties swim, feed, and grow in a serene zen water garden — right in your browser.

## Features

- **16 Authentic Koi Breeds** — Kohaku, Sanke, Tancho, Yamabuki, Shiro Utsuri, Showa, Asagi, Hi Utsuri, Ki Bekko, Beni Goi, Hajiro, Koromo, Sakura Pink, Tsuki Blue, plus mystical Yin & Yang koi
- **Bio-Mimetic Spine Animation** — Each fish has a 10-vertebrae skeletal chain with organic snake-like serpentine movement, realistic wiggle physics, and dynamic turning
- **Feed & Grow System** — Switch to Feed Mode, tap to drop pellets, watch koi rush to eat. Each pellet causes visible growth. Koi grow from tiny fry to majestic beauties over time
- **Persistent Growth** — Fish sizes and growth progress save to localStorage automatically and load instantly on page refresh. Your koi keep their growth forever
- **3D Depth Simulation** — Fish swim at varying depths with realistic shadow projections, depth-based scaling, and surface-feeding behavior when food is dropped
- **Yin-Yang Cultivation Mode** — Toggle sacred mandala formation where Yin and Yang koi orbit in cosmic dual circles, with followers schooling behind them
- **Living Pond Environment** — Drifting lily pads, submerged swaying grass, water caustics, cherry blossom petals, and ambient ripple effects
- **Slow-Moving Pond Turtles** — Two resident turtles wander the pond floor, resting and swimming at their own peaceful pace
- **4 Water Color Palettes** — Deep Teal, Serene Blue, Moss Green, and Dark Slate
- **Interactive Ripples** — Tap the water surface to create expanding ripple rings that attract nearby fish
- **Smart Food AI** — Fish intelligently distribute among food pellets (max 3 per pellet), lock onto targets, and gulp instantly — no frustrating chew delays

## Quick Start

**Prerequisites:** Node.js 18+

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Open `http://localhost:5173` in your browser.

## How to Play

| Action | Effect |
|--------|--------|
| **Tap water (Ripple Mode)** | Creates ripple rings and attracts nearby koi |
| **Tap water (Feed Mode)** | Drops a sinking food pellet — koi rush to eat it |
| **Add 1 Koi** | Spawns a new random breed koi |
| **Reset Pond** | Clears all progress and starts fresh |
| **Koi Population slider** | Adjust total fish count (1–24) |
| **Swimming Energy slider** | Control swim speed (0.4x–2.5x) |
| **Sakura Blossom Drifts** | Toggle falling cherry blossom petals |
| **Yin-Yang Cultivation** | Toggle sacred orbit formation mode |

## Growth System

Koi start as tiny fry and grow through two mechanisms:

1. **Feeding** — Each food pellet eaten gives +8 growth points. Koi swim faster when food is nearby (3.5x normal speed) and detect pellets up to 600px away.
2. **Passive Growth** — Koi grow +1 point every ~37 seconds passively from cosmic longevity.

Growth formula: `sizeMultiplier = min(1.3, baseSize + growthPoints × 0.005)`

A well-fed koi can reach max size after about 10 pellets. Growth is automatically saved to localStorage every second, on page close, and instantly after each food pellet is eaten — so progress persists reliably across refreshes.

## Persistence

Fish state (positions, sizes, growth points, physics properties) is saved to `localStorage` and loaded synchronously during component initialization, before any rendering effects run. This ensures that:

- Fish sizes are never lost on page refresh
- Growth progress is preserved even during rapid refreshes
- The save triggers on: every 60 frames (~1 second), on `beforeunload`, and immediately after eating food

## Tech Stack

- **React 18** + **TypeScript** — Component architecture and type safety
- **HTML5 Canvas** — 60fps hardware-accelerated rendering
- **ResizeObserver** — Responsive canvas sizing
- **localStorage** — Client-side persistence for fish state, turtle state, and settings
- **Lucide React** — UI icons
- **Vite** — Fast dev server and build tooling

## Architecture

```
src/
├── App.tsx                    # Root component, settings state, clock
├── main.tsx                   # React DOM entry point
├── index.css                  # Tailwind + global styles
├── types.ts                   # TypeScript interfaces (KoiFish, Ripple, FoodPellet, etc.)
└── components/
    ├── PondCanvas.tsx         # Core simulation: 60fps render loop, physics, drawing
    └── PondControlPanel.tsx   # Settings panel UI with toggles and sliders
```

All simulation state (fish, turtles, ripples, food, particles) lives in `useRef` to avoid React re-render overhead. The canvas redraws at 60fps via `requestAnimationFrame` with zero React state updates during the render loop.

## Deployment

Works on any static hosting platform:

```bash
npm run build    # Outputs to dist/
```

Deploy the `dist/` folder to Vercel, Netlify, Cloudflare Pages, or any static host.

## License

MIT
