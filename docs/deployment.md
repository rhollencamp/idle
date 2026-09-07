# Deployment

`.github/workflows/deploy.yml` builds and deploys `dist/` to GitHub Pages on every push to `main`, via `actions/upload-pages-artifact` + `actions/deploy-pages`.

## Base path

`vite.config.ts` sets `base: '/idle/'` to match the GitHub Pages project subpath (`https://<user>.github.io/idle/`), and the PWA manifest's `start_url`/`scope` are pinned to `/idle/` for the same reason.

These move together. Renaming the repo or moving to a custom domain means changing `base`, `start_url`, and `scope` in one go — a mismatch breaks either the asset URLs or the service worker's scope.

## Response headers aren't configurable

GitHub Pages serves every file with a fixed `Cache-Control: max-age=600`, and offers no way to set custom response headers — there's no `_headers` file equivalent as on Netlify, Vercel, or Cloudflare Pages.

Worth knowing before designing anything that depends on cache behavior. It most notably affects how quickly a newly deployed service worker gets picked up — see `docs/pwa.md`.
