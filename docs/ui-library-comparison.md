# UI library: Bootstrap vs. MUI

Bootstrap 5 has been the UI and theming layer since #6. This note weighs
swapping it for MUI so the question stops being reopened. It is a decision
record, not a plan — nothing in `docs/implementation-plan.md` depends on it.

The criteria are implementation effort, how it looks, and what is available
without a licence. Bundle size is deliberately not a criterion here; for the
record MUI is about +32 kB gzipped over the current build, which for an
installed PWA is a first-visit and update-download cost, not a per-session
one.

**Recommendation: switch off Bootstrap now, to Mantine.** The port costs two
files today and more at every step from here, and Bootstrap has no answer for
the two controls the game is about to need — a real slider (step 5) and a
determinate cooldown ring (step 7). MUI is the safe, obvious replacement and
would be fine; Mantine fits this particular game better, for the reasons in
_The rest of the field_ below.

Everything below was measured by porting `App.tsx` to MUI 9.4.0 and building
both, not from memory.

## What the switch actually costs

Two files. `src/game/` is React-free by design and `useGameLoop`'s tests
exercise the hook, not markup, so the UI layer is only:

- `src/App.tsx` — 151 lines, every class name replaced by components and `sx`.
- `src/styles/app.scss` — 74 lines of palette, typography, bar height and
  safe-area padding, deleted and rebuilt as a `createTheme` object plus two
  `sx` rules.

The whole test suite and the entire engine are untouched. `index.html` loses
its `data-bs-theme` script, and `vite.config.ts` loses the four silenced Sass
deprecations along with the Sass dependency.

That is the cheapest this ever gets. Each phase of the plan adds screens, and
every one of them is written in whichever vocabulary we are in.

### Friction found while porting

Real, and worth knowing before starting rather than during:

- **System props are gone on everything but `Box`.** `<Stack justifyContent>`
  and `<Typography fontWeight>` compile fine and silently do nothing — the
  first port had "Villagers5" run together because of exactly this. Nearly
  every MUI example written before v7 (and most recalled from memory) is
  wrong in this way. Everything goes in `sx`.
- **`slotProps` replaced the `*Props` escape hatches.**
  `CardHeader titleTypographyProps` is now `slotProps={{ title: ... }}`, and
  the slot props themselves take `sx` rather than bare style props.
- **`Box` typing under TypeScript 6** needed a `component` prop or `sx` to
  resolve the overload. The build runs `tsc -b` in CI, so this is real work,
  not a warning.
- **Dark mode needs a per-scheme palette.** Setting `palette.primary` at the
  top level themes light only; the dark scheme silently keeps MUI's default
  blue. Use `colorSchemes: { dark: { palette: ... } }` for both.

None are hard. All four cost time that a from-memory estimate does not
include.

## How it looks

Both builds were screenshotted at 390×844 (iPhone-ish portrait), light and
dark, from a real production build.

- **Density is the visible difference.** With default spacing the same three
  cards overflow the viewport in MUI where they fit in Bootstrap. For an idle
  game whose whole appeal is glancing at every number at once, that matters.
  It is tunable (`spacing`, `size="small"`, `MuiCardContent` overrides), but
  it is work MUI's defaults make necessary and Bootstrap's do not.
- **Neither library is thematic.** Material reads as "Google app" and
  Bootstrap reads as "admin dashboard". A game about a village
  holding a shoreline will need a real skin either way; the question is which chassis
  is easier to skin.
- **MUI is easier to skin deeply.** `styleOverrides`, `defaultProps` and
  custom variants restyle a component everywhere from one typed place.
  Bootstrap gives Sass variables and CSS custom properties for colour,
  radius and spacing; past that you write custom CSS and fight specificity.
- **Bootstrap's dark mode is currently better**, because it was set up
  carefully: an inline script sets `data-bs-theme` before first paint, so no
  flash. MUI matches it with `cssVariables: { colorSchemeSelector: 'media' }`,
  which the port uses — but it is a thing to get right, not a thing you get.

## Components, free tier only

`@mui/material` is MIT in its entirety — 156 exports, no component held back
for Pro. `react-bootstrap` (2.10.10, MIT) is the fair comparison on the
Bootstrap side, since Bootstrap's own JS components are imperative and this
app imports none of them today.

What the plan needs, and where it comes from:

| Need (plan step)                   | MUI (free)                               | Bootstrap + react-bootstrap         |
| ---------------------------------- | ---------------------------------------- | ----------------------------------- |
| Muster, offering share (step 6)    | `Slider` — marks, range, keyboard        | `FormRange` — a bare native range   |
| Breeding policy (5)                | `ToggleButtonGroup`                      | `ToggleButtonGroup`                 |
| Miracle cooldown ring (7)          | `CircularProgress variant="determinate"` | none — `Spinner` is indeterminate   |
| Miracle lock/cost hints (7)        | `Tooltip`, `Badge`, `Chip`               | `OverlayTrigger`+`Tooltip`, `Badge` |
| Prayer cards and dialogs (8)       | `Card`, `Dialog`                         | `Card`, `Modal`                     |
| Prayer arrival / update notice (8) | `Snackbar`                               | `Toast` + `ToastContainer`          |
| The Chronicle (10)                 | `Timeline` (`@mui/lab`)                  | none — hand-rolled                  |
| Stats over time (later)            | `SparkLineChart`, `LineChart`, `Gauge`   | none — add a chart library          |
| Boon shop / ascension (12)         | `Grid`, `Card`, `Stepper`                | `Row`/`Col`, `Card`, none           |
| Mobile navigation between screens  | `BottomNavigation`, `SwipeableDrawer`    | `Nav`, `Offcanvas`                  |

Verified licences on the pieces that are easy to assume wrong:

- `@mui/x-charts` 9.13.0 is **MIT**, and the free package ships `LineChart`,
  `BarChart`, `PieChart`, `ScatterChart`, `RadarChart`, `SparkLineChart` and
  `Gauge`, with axes, legends and tooltips. Pro adds heatmap, funnel, and
  zoom/pan — none of which this game wants.
- `@mui/x-data-grid`, `@mui/x-date-pickers`, `@mui/x-tree-view` are all MIT
  at 9.13.0. The `-pro` packages are the licensed ones (column pinning, row
  grouping, date _range_ pickers). Nothing in the plan reaches for those.
- `@mui/icons-material` is MIT (~2k Material icons); `bootstrap-icons` is the
  equivalent free set on the other side. A wash.
- `@mui/lab` is MIT but permanently pre-release — `Timeline` currently ships
  in `9.0.0-beta.9`. That is the one dependency here with an API-churn risk.

The gaps are one-directional: everything Bootstrap has, MUI has; `Slider`,
determinate `CircularProgress`, `Timeline`, `Rating`, `Skeleton`, `Stepper`,
`Autocomplete`, `Avatar` and the charts have no Bootstrap counterpart and
would each be hand-rolled or pulled from a separate package.

## The rest of the field

Bootstrap and MUI are the incumbents, not the shortlist. Versions and licences
below were read from the npm registry in September 2026, not from memory.

### Mantine 9.6.0 (MIT) — the strongest alternative

Mantine is the one that beats both on this game's specific shapes. Its
component list reads like it was written for an idle game:

| Mantine component                      | What it is for here                                    |
| -------------------------------------- | ------------------------------------------------------ |
| `RingProgress`, `SemiCircleProgress`   | Miracle cooldown rings (step 7)                        |
| `RollingNumber`                        | Counters that tick — the core visual of the app        |
| `NumberFormatter`                      | Big-number formatting, which every idle game needs     |
| `Slider`, `AngleSlider`                | Muster and offering share (step 6)                     |
| `Timeline`                             | The Chronicle (step 10) — stable, not in a lab package |
| `SegmentedControl`                     | Breeding policy (step 5)                               |
| `Notification`, `Modal`, `Tooltip`     | Prayers and the update prompt (step 8, TODO)           |
| `Tree`, `Stepper`, `Rating`, `Spoiler` | Boon shops, ascension, chronicle collapsing            |

Practical notes from porting `App.tsx` to it:

- **It typechecked on the first attempt**, against MUI's three fixes
  (system props, `slotProps`, `Box` overloads). Styling is `style`/props plus
  CSS modules.
- **Density matches Bootstrap's.** The ported screen fits the 390×844 portrait
  viewport, where MUI's defaults overflow it.
- **No CSS-in-JS runtime.** Since v7 Mantine is CSS modules and CSS custom
  properties, so theming is `createTheme` for tokens and plain CSS for the
  rest — closer to how `app.scss` already works.
- **No paid tier at all.** Everything, including charts (`@mantine/charts`)
  and the date pickers, is MIT; there is no Pro package to bump into.
- Gotcha: `Badge` uppercases its text by default (`+0.5/s` renders `+0.5/S`).

### Worth knowing about, probably not for this

- **shadcn/ui 4.21 + Tailwind 4 + Radix (MIT).** You copy component source
  into the repo and own it. The highest ceiling if the game eventually wants a
  hand-painted look, and zero runtime — but it adds Tailwind to the build,
  makes every component ours to maintain, and ships no timeline, no charts,
  and no cooldown ring. Most work up front, most freedom later.
- **Base UI 1.0.0-rc.0 (MIT).** Unstyled primitives from the MUI and Radix
  people. Still a release candidate, and it means styling everything by hand.
- **Chakra UI 3.37 (MIT).** v3 is a ground-up rewrite on Ark UI and Panda CSS.
  Perfectly good, but a bigger conceptual stack than Mantine for no gain here.
- **Radix Themes 3.3, Ark UI 5.39 (MIT), React Aria Components 1.21
  (Apache-2.0).** Primitive/headless layers. React Aria is the accessibility
  benchmark, but all three mean writing the visual layer ourselves.
- **DaisyUI 5.7 (MIT).** Bootstrap's spirit on Tailwind: class-based themes,
  no JS behaviour — so the slider and cooldown ring stay hand-rolled.
- **Ant Design 6.6, Fluent UI 9.74 (MIT).** Enterprise admin aesthetics and
  weight. Wrong shape for a one-thumb phone game.
- **PrimeReact — check the licence before considering it.** v10.9.9 was MIT;
  **v11 moved to a dual community/commercial licence** requiring a licence key
  with annual eligibility renewal. The community tier is free for small
  teams and individuals, but it is no longer an MIT dependency. Given the "no
  paid licence" constraint, this is the one to avoid on principle.

### Not a real category: game UI kits

Nothing here is a game UI library, and the React ones that exist are aimed at
canvas/WebGL scenes rather than a DOM-based idle screen. Whatever we pick is a
neutral chassis that a custom skin goes on top of. That argues for a library
whose components are easy to override with plain CSS — which is Mantine or
shadcn, and not MUI.

## The case for staying, honestly stated

- It works, it is themed, dark mode is flash-free, and the safe-area handling
  from #7 is already correct on a real installed iOS PWA.
- Utility classes are fast to write for layout, and the current UI is layout
  plus five components.
- `react-bootstrap` closes the JS-component gap (modals, toasts, tooltips,
  offcanvas) for a fraction of MUI's weight, keeping every existing line.
- Bootstrap's density suits number-dense idle UI out of the box.

That case is real but it is a case for _today's_ three cards. It gets weaker
at exactly the step where the game gets interesting: step 5's four-way labor
split is a `Slider` problem, and step 7's cooldowns are a determinate-ring
problem. Both are things Bootstrap does not have.

## Decision

**Executed.** The app moved to Mantine 9 on the branch that carries this note:
`bootstrap` and `sass-embedded` are gone, `src/styles/app.scss` became
`src/theme.ts` plus a 30-line `src/styles/app.css`, and the Sass deprecation
silencing came out of `vite.config.ts`. Notes from doing it for real:

- The port was the two files predicted, plus the colour-scheme script in
  `index.html`. The engine, the tests and `useGameLoop` were untouched.
- Overriding `--mantine-color-body` is not how a dark theme gets reskinned —
  cards, borders and muted text all come from `theme.colors.dark`, so the
  island night palette had to be a full ten-shade ramp. Light-scheme body text
  is `theme.black`.
- Mantine defines its variables at `:root[data-mantine-color-scheme='light']`,
  so an override in `app.css` must match that specificity or lose silently.
- Progress bars keep their `role="progressbar"`, `aria-valuenow` and
  `aria-label` through `Progress.Root` / `Progress.Section`; the compound form
  is what puts the label on the element that carries the role.

The reasoning that led here, unchanged:

Switch, as its own change, before step 5. Do it whole — running two libraries
means two resets, two palettes and two mental models.

**Mantine first choice, MUI second, Bootstrap only if we do nothing.** All
three were ported and screenshotted; the separation is narrow and mostly comes
down to fit:

|                                           | Bootstrap         | MUI                     | Mantine                            |
| ----------------------------------------- | ----------------- | ----------------------- | ---------------------------------- |
| Slider for the muster share               | native range only | yes                     | yes                                |
| Determinate cooldown ring                 | hand-rolled       | `CircularProgress`      | `RingProgress`                     |
| Chronicle timeline                        | hand-rolled       | `@mui/lab` (beta)       | stable                             |
| Ticking-number helpers                    | none              | none                    | `RollingNumber`, `NumberFormatter` |
| Fits portrait viewport at default density | yes               | no, needs tuning        | yes                                |
| Port typechecked first try                | n/a               | no, three fixes         | yes                                |
| Paid tier to bump into                    | none              | X Pro (nothing we need) | none                               |

Whichever we pick, the port should:

1. Replace `src/styles/app.scss` with the library's theme object, keeping the
   island palette and the 18px / 1.45 type scale.
2. Keep dark mode flash-free — Mantine's `defaultColorScheme="auto"` or MUI's
   `cssVariables: { colorSchemeSelector: 'media' }` — and drop the
   `data-bs-theme` script from `index.html`.
3. Keep the safe-area insets from #7 on the header and footer.
4. Drop `bootstrap` and `sass-embedded`, and remove the four silenced Sass
   deprecations from `vite.config.ts`, in the same commit.

If we decide to stay on Bootstrap after all, adopt `react-bootstrap` at step 7
rather than hand-rolling modals and tooltips, and budget for a custom slider
and cooldown ring.
