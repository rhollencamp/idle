# Mate Atua

An idle village-defense game. You are the chief of a village on the shore.
Something has gone wrong out in the water and the sea is sending its creatures
up the beach — so grow the village, arm it, and keep the old rites, because the
next tide is already on its way.

The village runs itself while the tab is closed: it gathers, grows, and meets
raids on the standing orders you left it. Built as an installable PWA (works
offline, add to your phone's home screen).

## Stack

- React + TypeScript + Vite
- Mantine 9 for UI and theming
- `vite-plugin-pwa` for the web app manifest and service worker

## Styling

Mantine owns the look of the app. `src/theme.ts` is the single entry point: the
palette, the dark-scheme ramp, typography and per-component defaults all
live there. `src/styles/app.css` holds only what a theme object cannot express —
the page background, the safe-area padding, and two app-level custom properties.

Reach for Mantine components and style props before writing custom CSS. Every
component's CSS ships in the one `@mantine/core/styles.css` import in
`src/main.tsx`, so using a new component needs no build changes.

Dark mode is Mantine's: a small inline script in `index.html` mirrors the
device's colour-scheme preference onto `data-mantine-color-scheme` on `<html>`
before first paint.

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Credits

The app icon is [Crab](https://game-icons.net/lorc/originals/crab.html) by
**Lorc**, from [game-icons.net](https://game-icons.net), used under
[CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) and recoloured to the
app's palette. `public/favicon.svg` is the source; the PNGs beside it are
rendered from it by `npm run icons`. The favicon keeps its full bleed, but every
other surface rounds or masks the square, so each PNG insets the artwork: 78% of
the width for the home-screen icons, 66% for the maskable variant, which has to
sit inside Android's safe-zone circle.
