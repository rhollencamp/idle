# Castaway Idle

An idle survival game: stranded on an island, gather resources, unlock a skill tree, survive. Built as an installable PWA (works offline, add to your phone's home screen).

## Stack

- React + TypeScript + Vite
- Mantine 9 for UI and theming
- `vite-plugin-pwa` for the web app manifest and service worker

## Styling

Mantine owns the look of the app. `src/theme.ts` is the single entry point: the
island palette, the dark-scheme ramp, typography and per-component defaults all
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
