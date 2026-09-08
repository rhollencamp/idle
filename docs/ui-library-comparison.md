# UI library: Bootstrap vs. MUI

Bootstrap 5 has been the UI and theming layer since #6. This note weighs
swapping it for MUI, so the question stops being reopened. It is a decision
record, not a plan — nothing in `docs/implementation-plan.md` depends on it.

**Recommendation: stay on Bootstrap.** The payload cost is real and the
benefit is mostly in components the plan does not need until phase 2, by
which point `react-bootstrap` covers the gap at a fraction of the cost.

## Measured, not guessed

Both numbers come from a production build of this app at `84b75ee`. The MUI
column is a real port of `App.tsx` (same layout: header, three cards, list
group with bars, footer buttons) using `Card`/`List`/`LinearProgress`/
`Button`/`Stack`, themed with `createTheme` to the same palette and 18px
base, on `@mui/material` 9.4.0 + `@emotion` 11.14.0.

| Build output       | Bootstrap 5.3      | MUI 9               |
| ------------------ | ------------------ | ------------------- |
| JS                 | 198.1 kB / 62.4 gz | 350.9 kB / 111.1 gz |
| CSS                | 118.4 kB / 16.2 gz | none (emotion)      |
| **Total, gzipped** | **78.6 kB**        | **111.1 kB**        |
| Precache           | 339 KiB            | 373 KiB             |

MUI is **+32 kB gzipped (+41%)** over the current app, and that is with the
same five component families. Bootstrap's CSS is cherry-picked partials
(`src/styles/app.scss`) and grows by a few hundred bytes per component added;
MUI's cost is JS that ships and parses on a phone before the first tick.

For an installed PWA the payload is precached once and then free, so this is
a first-visit and update-download cost, not a per-session one. It still
matters more here than in a typical app: the whole point of `docs/pwa.md` is
that the service worker re-downloads the bundle on every deploy.

## Where MUI would actually help

Looking at what `docs/implementation-plan.md` still needs:

- **Step 5, decrees.** A four-way labor split is the strongest argument for
  MUI: `Slider` (with marks, range, keyboard support) versus Bootstrap's
  CSS-only `.form-range`, which is a bare input.
- **Step 7, miracles.** Cooldown buttons want `Tooltip` and `Badge` —
  Bootstrap's tooltip is one of its JS-only components (see below).
- **Step 8, prayers.** Grant/reject cards are plain markup either way;
  arrival notices want `Snackbar`.
- **Step 10, the Chronicle.** A long scrollback is where `@mui/x` virtualized
  lists would pay off, though a bounded ring buffer probably never gets long
  enough to need one.
- **The open TODO item** (prompt before reloading on a new version) is a
  `Snackbar` in MUI versus Bootstrap's `.toast` markup — roughly a wash; the
  TODO already notes a static toast needs no Bootstrap JS.

MUI also brings accessibility for free on the interactive pieces (focus
traps, ARIA wiring on dialogs and sliders) that Bootstrap only gets if its
JS is loaded, and a typed theme — `sx` props are checked against the palette,
whereas a typo'd `text-body-secondry` is silent.

## The Bootstrap JS gap, and the cheap fix

This is the honest weakness of the current setup: `src/styles/app.scss`
imports Bootstrap's CSS only, and nothing imports its JS bundle. Everything
built so far (cards, list groups, progress bars, buttons, badges) is
CSS-only, so it has not bitten. Modals, dropdowns, tooltips, offcanvas and
dismissible toasts all need Bootstrap's JS, which is imperative and disposes
poorly under React's lifecycle.

The fix is not MUI, it is `react-bootstrap`: React components over the same
Bootstrap CSS variables, no jQuery-era imperative API, and — measured on
its own — a fraction of MUI's weight because the styling stays in the CSS
we already ship. That option keeps the theme, the palette, the Sass
overrides, and every line of `App.tsx` working, and can be adopted lazily at
step 7 when the first modal or tooltip actually appears.

## Costs of switching that are easy to underestimate

- **Rewrite surface.** `App.tsx` is 151 lines and every one of its class
  names goes away; `src/styles/app.scss` (74 lines of palette, typography and
  safe-area handling) is deleted and rebuilt as a theme object. Small today,
  and it only grows — this is the cheapest moment to switch if we are going
  to.
- **Dark mode regresses before it improves.** Today an inline script in
  `index.html` sets `data-bs-theme` before first paint, so there is no flash.
  MUI needs `ThemeProvider` + `CssBaseline`, and matching the no-flash
  behavior means opting into its CSS-variables theme; the naive
  `useMediaQuery` version re-renders the whole tree on scheme change.
- **The safe-area padding** (`env(safe-area-inset-*)` on the header/footer,
  from #7) has to be re-expressed as `sx` on the wrapping `Box`es. Mechanical,
  but easy to lose in a port and only visible on a real installed iOS PWA.
- **Per-tick rendering.** The UI re-renders on every tick of `useGameLoop`.
  Emotion caches serialized styles, so steady-state cost is low, but inline
  `sx` objects are re-created and hashed each render — a consideration once
  the tree is prayers, miracles and a chronicle rather than three cards.
- **Type friction, observed.** The spike did not typecheck cleanly under this
  repo's TypeScript 6 (`Box` overload resolution on `component`-less usage).
  Solvable, but the build is `tsc -b` and CI runs it, so it is work.

## Costs of staying

- **`@import` deprecation.** Bootstrap 5 predates Sass modules, which is why
  `vite.config.ts` silences four deprecation classes. That is Bootstrap's to
  fix and only lands in Bootstrap 6; until then we are pinned to a legacy
  Sass path.
- **Utility-class soup.** `App.tsx` already carries lines like
  `d-flex align-items-baseline justify-content-between`. It scales worse than
  `sx` and nothing type-checks it.
- **The JS gap above**, until `react-bootstrap` is adopted.

## Decision

Keep Bootstrap. Revisit only if one of these becomes true:

1. Step 5's decrees UI proves genuinely bad on `.form-range` — the labor
   split is the one screen where MUI's components are clearly better.
2. `react-bootstrap` turns out not to cover the phase-2 interactive
   components, leaving us hand-rolling modals and tooltips.
3. The app grows a component surface where a typed design system pays for
   32 kB — a settings screen, a boon shop, data tables at ascension.

If we do switch, switch whole: running both is the worst outcome — two
resets, two palettes, and the payload of both.
