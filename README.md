# Castaway Idle

An idle survival game: stranded on an island, gather resources, unlock a skill tree, survive. Built as an installable PWA (works offline, add to your phone's home screen).

## Stack

- React + TypeScript + Vite
- Bootstrap 5 (Sass) for UI and theming
- `vite-plugin-pwa` for the web app manifest and service worker

## Styling

Bootstrap owns the look of the app. `src/styles/app.scss` is the single entry
point: it overrides Bootstrap's Sass variables (palette, typography, bar
height) and imports only the parts of Bootstrap the game uses. Reach for
Bootstrap utilities and components before writing custom CSS, and when you need
a component that is not imported yet, add its partial to that file.

Dark mode is Bootstrap's: a small inline script in `index.html` mirrors the
device's colour-scheme preference onto `data-bs-theme` on `<html>` before first
paint.

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
