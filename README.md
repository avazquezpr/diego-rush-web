# Diego Rush (Web MVP)

A Flappy-style endless runner built with **React + Vite + Phaser 3**.

## Features

- Endless flappy gameplay with Diego as the player character
- Controls: tap/click/space to flap
- Procedural obstacle pairs scrolling right-to-left
- Collision/out-of-bounds => game over
- Score increases over time + when passing obstacle pairs
- High score saved in `localStorage`
- Main menu + game over overlays with restart flow
- 10 lore cards unlocked by score thresholds
- Responsive layout for mobile and desktop
- Basic generated graphics (player, obstacles, layered backgrounds, polished HUD/buttons)

## Tech

- React 19
- Vite 7
- TypeScript
- Phaser 3

## Run locally

```bash
cd ~/projects/diego-rush-web
npm install
npm run dev
```

Open the local URL shown by Vite.

## Production build

```bash
npm run build
npm run preview
```

## Deploy

Any static host works (Vercel, Netlify, Cloudflare Pages, GitHub Pages).

Build output is generated in:

```txt
dist/
```

Upload `dist/` or configure host to run `npm run build`.

## Controls

- **Start**: click/tap `Start Run`
- **Flap**: tap/click anywhere in canvas or press `Space`
- **Restart**: click `Restart` on game over
