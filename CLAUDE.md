# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Gameplay and game-design mechanics are documented separately (not in this file) — this file covers technical/architectural choices only.

## Commands

```bash
npm install       # install deps
npm run dev        # vite dev server
npm run build       # tsc -b (project references) && vite build
npm run preview     # serve the production build locally
npm run lint       # oxlint (not eslint)
npm run test       # vitest run (single run, not watch mode)
```

Run a single test file with `npx vitest run src/game/tick.test.ts`, or `npx vitest` (no `run`) for watch mode.

Tests live alongside the code they cover (`src/game/*.test.ts`), using Vitest + `@testing-library/react` for hook tests, with a jsdom environment (`vitest.config.ts`). Coverage is currently limited to `src/game/` — the pure game logic and the `useGameLoop` hook. UI components (`App.tsx`) and the PWA/service-worker wiring (`pwaUpdate.ts`) aren't unit tested; verify those by running the app.

## Stack

- React 19 + TypeScript, built with Vite.
- `vite-plugin-pwa` provides the web app manifest and generates the service worker (`workbox` `generateSW` mode, configured in `vite.config.ts`).
- Linting is `oxlint`, configured via `.oxlintrc.json` (`react`, `typescript`, `oxc` plugins) — there is no ESLint config in this repo.

## Deployment

- `.github/workflows/deploy.yml` builds and deploys `dist/` to GitHub Pages on every push to `main`, via `actions/upload-pages-artifact` + `actions/deploy-pages`.
- `vite.config.ts` sets `base: '/idle/'` to match the GitHub Pages subpath (`https://<user>.github.io/idle/`). The PWA manifest's `start_url`/`scope` are pinned to `/idle/` too — if the repo is ever renamed or moved to a custom domain, all three need to change together.
- GitHub Pages serves everything (including `sw.js`) with a fixed, non-configurable `Cache-Control: max-age=600`. There's no way to set custom response headers on GitHub Pages, so the service worker update check can see a copy of `sw.js` up to ~10 minutes stale — see the PWA update flow below for how that's handled.

## PWA update flow

The app is meant to be installed via "Add to Home Screen," so it needs to detect and pick up new deployments itself rather than relying on a browser refresh.

- `vite.config.ts` configures `VitePWA({ registerType: 'autoUpdate', ... })`. This mode bakes `skipWaiting`/`clientsClaim` into the generated service worker, so once a new worker is detected it activates itself with no user prompt.
- `src/pwaUpdate.ts` is what actually registers the service worker (via the `virtual:pwa-register` module) and calls it from `src/main.tsx` on startup. Without this call the service worker never registers at all — the `vite-plugin-pwa` config alone does nothing.
- Because opening a home-screen PWA often resumes an already-loaded page rather than doing a fresh network load, `pwaUpdate.ts` also forces an explicit `registration.update()` check on every `visibilitychange` to `'visible'` — i.e. whenever the app is foregrounded, not just on first load.
- The browser detects an update via a byte-for-byte diff of `sw.js`, not an ETag/checksum comparison in app code. `sw.js`'s bytes change on every build because Workbox embeds the precache manifest (content hashes of every built asset) directly inside it, even though the `sw.js` filename itself never changes.
- `src/vite-env.d.ts` carries the triple-slash reference (`vite-plugin-pwa/client`) needed for TypeScript to resolve the `virtual:pwa-register` module.

## Project structure

- `src/game/` is the game engine, kept independent of React:
  - `types.ts` — `GameState` shape.
  - `initialState.ts` — fresh-save state.
  - `tick.ts` — `advanceTo(state, now)`, a pure function that advances resources based on elapsed time. This is also what makes offline progress work: calling it with a `now` far in the future from `lastTick` catches the state up in one step.
  - `save.ts` — localStorage persistence (`loadState`/`saveState`/`clearSave`), keyed by a versioned `SAVE_KEY` (`castaway-idle:save:v1`). Bump the version suffix if the `GameState` shape changes incompatibly, since `loadState` only does a shallow shape check before trusting saved data.
  - `useGameLoop.ts` — the React integration: runs the tick on an interval, autosaves periodically, and saves on `visibilitychange`/`pagehide` so backgrounding the tab doesn't lose progress.
- `src/App.tsx` is the only consumer of `useGameLoop` currently; UI is not otherwise componentized yet.

## TypeScript project layout

`tsconfig.json` uses project references, not a single flat config:
- `tsconfig.app.json` — the `src/` app code (DOM lib, React JSX, bundler module resolution).
- `tsconfig.node.json` — `vite.config.ts` itself (Node types, no DOM lib).

`npm run build` runs `tsc -b` (build mode across both references) before `vite build`.
