# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Scope: widely-relevant technical choices only. Gameplay and game-design mechanics are documented separately, and subsystem detail lives in `docs/` — see Further reading at the bottom.

## Commands

```bash
npm install       # install deps
npm run dev        # vite dev server
npm run build       # tsc -b (project references) && vite build
npm run lint       # oxlint (not eslint)
npm run format      # prettier --write .
npm run format:check # prettier --check . (what CI runs)
npm run test       # vitest run (single run, not watch mode)
npm run preview     # serve the production build locally
```

Run a single test file with `npx vitest run src/game/tick.test.ts`, or `npx vitest` (no `run`) for watch mode.

## Stack

- React 19 + TypeScript, built with Vite.
- `vite-plugin-pwa` provides the web app manifest and generates the service worker.
- Linting is `oxlint`, configured via `.oxlintrc.json` — there is no ESLint config in this repo.
- Formatting is Prettier (`.prettierrc.json`: `semi: false`, `singleQuote: true`), not `oxfmt` — `oxfmt` is still pre-1.0 and formatting isn't a speed-sensitive path, so the mature tool won out over matching oxlint's toolchain.
- `tsconfig.json` uses project references (`tsconfig.app.json` for `src/`, `tsconfig.node.json` for `vite.config.ts`), which is why `npm run build` runs `tsc -b` rather than plain `tsc`. Both reference configs have `strict` enabled.
- Node version is pinned in `.nvmrc` (also `engines.node` in `package.json`); CI reads it via `node-version-file`, so bumping the Node version only requires updating `.nvmrc`.

## Architecture

`src/game/` is the game engine, kept independent of React: the state shape (`types.ts`), a pure `advanceTo(state, now)` tick (`tick.ts`), and localStorage persistence (`save.ts`). `useGameLoop.ts` is the only React seam — it owns the tick interval, autosaves, and saves on `visibilitychange`/`pagehide`. `App.tsx` is currently its only consumer.

Because `advanceTo` is elapsed-time based rather than tick-count based, offline progress falls out for free: calling it with a `now` far ahead of `lastTick` catches the state up in one step.

Tests live alongside the code they cover (`src/game/*.test.ts`) — Vitest with a jsdom environment (`vitest.config.ts`), plus `@testing-library/react` for hook tests. `App.tsx` and the service-worker wiring aren't unit tested; verify those by running the app.

## Gotchas

- **Save compatibility:** `save.ts` keys localStorage by a versioned `SAVE_KEY` (`island-god:save:v2`, derived from `SAVE_VERSION` in `types.ts`), and `migrate()` is the single seam that turns an unknown saved blob into a `GameState` or `null`. Handle additive `GameState` changes inside `migrate` by defaulting the new field, so existing saves survive; bumping `SAVE_VERSION` discards every save and is reserved for reshapes that can't be repaired. `LEGACY_SAVE_KEYS` lists retired keys, cleared on load.
- **Base path:** the app is served from a subpath, so `base` in `vite.config.ts` and the manifest's `start_url`/`scope` are all pinned to `/idle/` and have to change together.

## Further reading

- `docs/mechanics.md` — the game design: core loop, currencies, prayers, and deferred ideas.
- `docs/implementation-plan.md` — the incremental steps for building it.
- `docs/pwa.md` — service worker registration and the check-for-update-on-open flow.
- `docs/deployment.md` — the GitHub Pages deploy pipeline and its constraints.
