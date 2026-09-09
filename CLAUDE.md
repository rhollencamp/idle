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
- Mantine 9 is the UI and theming layer. `src/theme.ts` holds the theme (palette, dark ramp, typography, component defaults); `src/styles/app.css` holds the little that a theme object can't express. Mantine styles are plain CSS with custom properties — no CSS-in-JS runtime, and no Sass in this repo.
- `vite-plugin-pwa` provides the web app manifest and generates the service worker.
- Linting is `oxlint`, configured via `.oxlintrc.json` — there is no ESLint config in this repo.
- Formatting is Prettier (`.prettierrc.json`: `semi: false`, `singleQuote: true`), not `oxfmt` — `oxfmt` is still pre-1.0 and formatting isn't a speed-sensitive path, so the mature tool won out over matching oxlint's toolchain.
- `tsconfig.json` uses project references (`tsconfig.app.json` for `src/`, `tsconfig.node.json` for `vite.config.ts`), which is why `npm run build` runs `tsc -b` rather than plain `tsc`. Both reference configs have `strict` enabled.
- Node version is pinned in `.nvmrc` (also `engines.node` in `package.json`); CI reads it via `node-version-file`, so bumping the Node version only requires updating `.nvmrc`.

## Architecture

`src/game/` is the game engine, kept independent of React: the state shape (`types.ts`), a pure `advanceTo(state, now)` tick (`tick.ts`), seeded randomness (`rng.ts`), the population/food tuning constants and rate helpers (`village.ts`), display projection (`projection.ts`), and localStorage persistence (`save.ts`). `useGameLoop.ts` is the only React seam onto the engine — it owns the tick interval, autosaves, and saves on `visibilitychange`/`pagehide`. `App.tsx` is currently its only consumer.

`advanceTo` is a fixed-step integrator, not a closed-form formula: it runs whole `STEP_MS` steps and advances `lastTick` by exactly the time it consumed, carrying the sub-step remainder to the next call. That is what makes the result depend on elapsed time alone rather than on how it was split into calls, which matters because population, food, and faith are a coupled loop. Offline progress is the same code path — a `now` far ahead of `lastTick` just runs more steps, up to `MAX_STEPS_PER_ADVANCE`, past which the step widens so a long absence stays bounded work. All sim rules go in `simulateStep`; the loop around it only decides how many steps and how wide.

Simulation cadence and render cadence are deliberately separate. `STEP_MS` is chosen for the model — a second is already far finer than anything being simulated — while `useRenderClock` re-renders once an animation frame and `projection.ts` fills in the accrual earned since the last step, so the numbers glide. Reach for the projection when a display looks steppy; shrinking `STEP_MS` to smooth the screen just multiplies catch-up cost for no fidelity.

Tests live alongside the code they cover (`src/game/*.test.ts`) — Vitest with a jsdom environment (`vitest.config.ts`), plus `@testing-library/react` for hook tests. `App.tsx` and the service-worker wiring aren't unit tested; verify those by running the app.

## Gotchas

- **Save compatibility:** `save.ts` keys localStorage by a versioned `SAVE_KEY` (`island-god:save:v2`, derived from `SAVE_VERSION` in `types.ts`), and `migrate()` is the single seam that turns an unknown saved blob into a `GameState` or `null`. Handle additive `GameState` changes inside `migrate` by defaulting the new field, so existing saves survive; bumping `SAVE_VERSION` discards every save and is reserved for reshapes that can't be repaired. `LEGACY_SAVE_KEYS` lists retired keys, cleared on load.
- **Gross vs. net food:** `resources.food.perSecond` is the gross yield alone — a stored placeholder until jobs derive it — while what the granary actually does is `netFoodPerSecond(state)`, the yield less `foodUpkeepPerSecond(population)`. Anything player-facing (the rate badge, `projectFood`) has to use the net figure; projecting the gross one shows a granary filling while it drains. Food is also the one store `simulateStep` does not accrue in its resource loop, because it is spent as well as gathered.
- **Randomness:** nothing in `src/game/` may call `Math.random`. Draws come from `createRng(seed, step, stream)` in `rng.ts` — a pure function of the save's `seed`, the step index, and a named stream — so an absence resolves identically however it is replayed, and can be tested. New systems that draw randomly should take their own `stream` name rather than sharing one, so they can't shift each other's numbers.
- **Theming:** Mantine derives dark-scheme surfaces from `colors.dark` and light-scheme body text from `black` in `src/theme.ts` — reskinning means replacing those ramps, not overriding `--mantine-color-body`, which only moves the page background. Mantine defines its own variables at `:root[data-mantine-color-scheme='...']`, so a CSS override has to match that selector's specificity to win.
- **Colour scheme before first paint:** the inline script in `index.html` sets `data-mantine-color-scheme` on `<html>` (Mantine's `<ColorSchemeScript>` can't run early enough in a client-only app). Its `localStorage` key and `auto` handling have to stay in step with the `defaultColorScheme` passed to `MantineProvider` in `App.tsx`.
- **Base path:** the app is served from a subpath, so `base` in `vite.config.ts` and the manifest's `start_url`/`scope` are all pinned to `/idle/` and have to change together.

## Further reading

- `docs/mechanics.md` — the game design: core loop, currencies, jobs, raids, and deferred ideas.
- `docs/setting.md` — the world, its vocabulary, and the rules we follow in drawing on Māori tradition.
- `docs/implementation-plan.md` — the incremental steps for building it.
- `docs/pwa.md` — service worker registration and the check-for-update-on-open flow.
- `docs/deployment.md` — the GitHub Pages deploy pipeline and its constraints.
- `docs/ui-library-comparison.md` — Bootstrap vs. MUI for the UI layer, and why.
