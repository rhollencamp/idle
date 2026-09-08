# Implementation plan

Incremental steps toward the design in `docs/mechanics.md`. Each step is
independently shippable: the app builds, tests pass, and the game is playable
(if simpler than the end state) at every step boundary. Nothing here needs a
long-lived branch.

Ground rules for every step:

- `npm run lint`, `npm run format:check`, `npm run test`, and `npm run build`
  all pass before the step is done.
- New engine logic gets tests alongside it in `src/game/*.test.ts`.
- Keep `src/game/` free of React. `useGameLoop.ts` stays the only seam.
- Only bump `SAVE_KEY` when the state shape changes incompatibly. Once step 1
  lands there's a migration seam, so prefer a migration over a bump when the
  old save can be salvaged.

---

## Phase 0 — Foundations

### Step 1: Reframe and reshape state

Swap the castaway framing for the god framing and put the real state shape in
place, even though most of it is inert.

- `types.ts`: replace `ResourceKey = 'water'` with `food | wood | stone`,
  add `faith`, `lifetimeFaith`, `population`, `lastTick`.
- `initialState.ts`: a starting village — strawman 5 villagers, small food
  stock, zero faith.
- `save.ts`: bump `SAVE_KEY` to `v2` and add a `migrate(raw)` seam that takes
  a versioned blob and returns a `GameState` or `null`. v1 saves are dropped
  (nothing of value in them); the seam exists so the next change doesn't have
  to be a wipe.
- `App.tsx`: retitle to the god framing, render the new resources.

**Done when:** the app shows food/wood/stone/faith ticking, an old v1 save is
discarded cleanly rather than crashing, and `migrate` has tests for
{valid v2, v1, garbage, missing fields}.

### Step 2: Fixed-step tick

`advanceTo` is closed-form linear today. Population, food, and faith are a
coupled feedback loop, so it has to become an integrator.

- Simulate in fixed buckets (strawman 60s) up to a step budget; coarsen the
  step when the elapsed time would blow the budget, so a two-week absence
  resolves in bounded work.
- Add a seeded PRNG derived from the save (a stored `seed` plus step index),
  so the same absence always resolves identically. No `Math.random` in
  `src/game/`.
- Keep `advanceTo(state, now)` as the public signature — `useGameLoop` should
  not change.

**Done when:** advancing 1 hour in one call, in 60 one-minute calls, and in
3600 one-second calls all produce the same state; a 30-day absence completes
in well under a second.

Landed with `STEP_MS = 1000` and `MAX_STEPS_PER_ADVANCE = 345_600` — four days
at full resolution, measured at ~10ms, with anything longer resolving in wider
buckets at the same cost. The 60s strawman above was dropped: the step is the
UI's resolution too unless the display interpolates, which it now does
(`projection.ts`), leaving `STEP_MS` free to be chosen for the model alone.
Revisit the budget against measured coarse-vs-fine divergence once step 3
makes the loop nonlinear, rather than against a target absence length.

_This is the step most likely to be fiddly. Everything after it is additive._

---

## Phase 1 — The village runs itself

### Step 3: Population, food, and starvation

The first real feedback loop.

- Villagers eat per second; surplus accumulates toward a birth; a birth needs
  housing headroom (fixed cap for now).
- Empty granary → starvation → slow villager loss.
- Food is capped (fixed cap for now); overflow is discarded.

**Done when:** a village left alone grows to its cap and holds; a village
with too few foragers shrinks slowly and never hits zero fast enough to feel
like a wipe. Tests cover growth, equilibrium, and the starvation curve.

### Step 4: Jobs and Faith income

- Add job assignment: forager / woodcutter / quarrier / worshipper, stored as
  counts that sum to population.
- Wood and stone accrue from their jobs; faith accrues from worshippers via
  `worshippers × faithPerWorshipper × templeMultiplier` (multiplier pinned at
  1.0 for now).
- `lifetimeFaith` increments alongside `faith` and is never decremented.

**Done when:** moving villagers between jobs visibly changes the rates, and
reassignment is handled correctly when population changes (births/deaths
rebalance without dropping or duplicating villagers).

### Step 5: Decrees UI

- A screen to set the labor split, breeding policy, and offering share.
- Offerings convert surplus food to faith at a poor fixed rate.
- Decrees persist in the save and apply during offline catch-up.

**Done when:** a decree set before closing the tab is the one in effect on
reopening, and the offline result matches what the same elapsed time produces
online.

_At this point the game is a working idle village sim. Everything after adds
the god._

---

## Phase 2 — The god acts

### Step 6: Modifiers and cooldowns

Shared infrastructure that miracles, prayers, and events all need. Building it
once, deliberately, before three systems each grow their own version.

- A list of active modifiers on state: `{ id, target, multiplier, expiresAt }`,
  applied when computing rates.
- A cooldown map: `{ [abilityId]: readyAt }`.
- Both expire correctly through a long offline catch-up.

**Done when:** a modifier applied and then fast-forwarded past its expiry
leaves no trace, and rates return to baseline exactly.

### Step 7: Miracles

- Rain, Bounty, Vigor as data-driven definitions: faith cost, cooldown,
  effect (a modifier or an instant resource grant).
- Unlocked by `lifetimeFaith` thresholds.
- UI: a bar of miracle buttons showing cost, cooldown, and lock state.

**Done when:** casting spends faith, starts a cooldown, and applies its
effect; a locked miracle is visible but unusable with its threshold shown.

### Step 8: Prayers

The active-play hook. Depends on step 6 for rewards and step 2 for
deterministic generation.

- Generation on a population-scaled timer, from a weighted table of prayer
  definitions across the categories in the design doc.
- Pending queue with a cap; new arrivals displace the oldest; each has an
  expiry.
- Grant (pay cost, apply reward) / Reject (free, forfeit).
- Generation, expiry, and displacement all resolve during offline catch-up,
  so a returning player finds a live queue, not a backlog.

**Done when:** a 12-hour absence yields at most a full queue of unexpired
prayers, the same absence always yields the same prayers from the same save,
and rejecting has no penalty of any kind.

---

## Phase 3 — The world pushes back

### Step 9: Events

- Seeded event schedule: storm, plague, drought, good harvest, calm season.
- Events apply modifiers or one-shot losses; `Mend` (step 7) can cancel an
  active one.

**Done when:** events fire deterministically from the seed, are visible in
the UI while active, and a village with no player input survives a normal
event cadence.

### Step 10: The Chronicle

- The sim emits structured log entries (births, deaths, events, lapsed
  prayers, offerings) into a bounded ring buffer on state.
- On return from an absence, render the entries from that gap as a summary.
- A scrollable history view for the rest.

**Done when:** closing the tab overnight produces a readable account of the
night, and the buffer is capped so the save can't grow without bound.

---

## Phase 4 — The long arc

### Step 11: Buildings

- Huts (population cap), granary (food cap), shrine→temple→cathedral
  (`templeMultiplier`), replacing the fixed caps from phases 1–2.
- Construction takes villager time and materials rather than completing
  instantly; builders come out of the labor split.

**Done when:** caps are building-derived everywhere, and construction
progresses correctly through an offline catch-up.

### Step 12: Ascension

- The Great Idol as a very expensive build; completing it offers Ascension.
- Divine Essence awarded from `lifetimeFaith`; a boon shop; a reset that
  preserves essence, boons, and unlocked miracles.

**Done when:** a full run can be completed and restarted, and a second run
with boons is measurably faster than the first.

---

## Deliberately not in this plan

Alignment, Love/Fear devotion, the creature, rival tribes, and individually
simulated villagers. All are captured under _Future ideas_ in
`docs/mechanics.md`. They get revisited after step 8, when we'll know whether
the Faith-and-prayers loop is actually fun — which is the real question this
plan exists to answer as cheaply as possible.
