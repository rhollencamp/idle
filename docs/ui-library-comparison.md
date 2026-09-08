# UI library: Bootstrap vs. MUI

Bootstrap 5 has been the UI and theming layer since #6. This note weighs
swapping it for MUI so the question stops being reopened. It is a decision
record, not a plan — nothing in `docs/implementation-plan.md` depends on it.

The criteria are implementation effort, how it looks, and what is available
without a licence. Bundle size is deliberately not a criterion here; for the
record MUI is about +32 kB gzipped over the current build, which for an
installed PWA is a first-visit and update-download cost, not a per-session
one.

**Recommendation: switch to MUI, and switch now.** Every component phases 2–4
need is in the free tier, several of them are ones Bootstrap simply does not
have, and the port costs two files today and more every step from here.

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
  Bootstrap reads as "admin dashboard". A game about a tribe worshipping a
  volcano god will need a real skin either way; the question is which chassis
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
| Labor split, offering share (5)    | `Slider` — marks, range, keyboard        | `FormRange` — a bare native range   |
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

Switch to MUI, as its own change, before step 5. Do it whole — running both
means two resets, two palettes and two mental models.

The port should:

1. Rebuild `src/styles/app.scss` as a `createTheme` with per-scheme palettes
   and `cssVariables: { colorSchemeSelector: 'media' }`, so dark mode stays
   flash-free and the `data-bs-theme` script comes out of `index.html`.
2. Tighten default density deliberately (theme `spacing`, `size="small"`
   defaults) rather than accepting Material's, so the whole village still
   fits one portrait screen.
3. Keep the safe-area insets as `sx` on the header/footer `Box`es.
4. Drop `bootstrap`, `sass-embedded`, and the four silenced Sass
   deprecations in `vite.config.ts` in the same commit.

If we do not switch, adopt `react-bootstrap` at step 7 instead of hand-rolling
modals and tooltips, and budget for a custom slider and cooldown ring.
