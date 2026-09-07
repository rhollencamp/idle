# PWA update flow

The app is meant to be installed via "Add to Home Screen," so it has to detect and pick up new deployments itself rather than relying on the user doing a browser refresh.

## How it works

- `vite.config.ts` configures `VitePWA({ registerType: 'autoUpdate', ... })`. This mode bakes `skipWaiting`/`clientsClaim` into the generated service worker, so once a new worker is detected it activates itself with no user prompt.
- `src/pwaUpdate.ts` is what actually registers the service worker (via the `virtual:pwa-register` module), and `src/main.tsx` calls it on startup. Without that call the service worker never registers at all — the `vite-plugin-pwa` config alone does nothing.
- Because opening a home-screen PWA often resumes an already-loaded page rather than doing a fresh network load, `pwaUpdate.ts` also forces an explicit `registration.update()` check on every `visibilitychange` to `'visible'` — i.e. whenever the app is foregrounded, not just on first load.
- `src/vite-env.d.ts` carries the triple-slash reference (`vite-plugin-pwa/client`) that lets TypeScript resolve the `virtual:pwa-register` module.

## How the browser decides a worker is "new"

It's a byte-for-byte comparison of `sw.js`, performed by the browser per the service worker spec — not an ETag or a checksum computed in app code.

`sw.js` keeps the same filename across builds, so what changes is its contents: Workbox embeds the precache manifest (a content hash for every built asset) directly inside it, so any changed asset changes `sw.js`'s bytes.

## Caching caveat

That comparison is still subject to normal HTTP caching on the `sw.js` request, with one spec exception: the browser forces a real network revalidation if it's been more than 24 hours since the last check. ETags/`Last-Modified` only decide whether the fetch is a full 200 or a 304 — either way the spec compares response bytes, not the validator.

GitHub Pages serves everything, `sw.js` included, with a fixed `Cache-Control: max-age=600` that cannot be overridden (see `docs/deployment.md`). So an update check can see a copy of `sw.js` up to ~10 minutes stale. That's well inside the spec's 24-hour ceiling, and short relative to how often someone reopens an idle game, so it's accepted rather than worked around.
