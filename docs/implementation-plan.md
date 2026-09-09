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
- Only bump `SAVE_KEY` when the state shape changes incompatibly. There is a
  migration seam, so prefer a migration over a bump when the old save can be
  salvaged.

---

## Phase 0 — Foundations

### Step 1: Reshape state ✅

Put the real state shape in place, even though most of it is inert.

- `types.ts`: `ResourceKey = food | wood | stone`, plus `faith`,
  `lifetimeFaith`, `population`, `lastTick`.
- `initialState.ts`: a starting village — strawman 5 villagers, small food
  stock, no faith.
- `save.ts`: a `migrate(raw)` seam that takes a versioned blob and returns a
  `GameState` or `null`, so the next state change doesn't have to be a wipe.
- `App.tsx`: render the resources.

**Done when:** the app shows food/wood/stone/faith ticking, an unreadable save
is discarded cleanly rather than crashing, and `migrate` has tests for
{valid, wrong version, garbage, missing fields}.

### Step 2: Fixed-step tick ✅

`advanceTo` was closed-form linear. Population, food, and every system after it
are a coupled feedback loop, so it had to become an integrator.

- Simulate in fixed buckets up to a step budget; coarsen the step when the
  elapsed time would blow the budget, so a two-week absence resolves in bounded
  work.
- A seeded PRNG derived from the save (a stored `seed` plus step index), so the
  same absence always resolves identically. No `Math.random` in `src/game/`.
- Keep `advanceTo(state, now)` as the public signature.

**Done when:** advancing 1 hour in one call, in 60 one-minute calls, and in
3600 one-second calls all produce the same state; a 30-day absence completes in
well under a second.

Landed with `STEP_MS = 1000` and `MAX_STEPS_PER_ADVANCE = 345_600` — four days
at full resolution, measured at ~10ms, with anything longer resolving in wider
buckets at the same cost. The step is the UI's resolution too unless the
display interpolates, which it now does (`projection.ts`), leaving `STEP_MS`
free to be chosen for the model alone. Revisit the budget against measured
coarse-vs-fine divergence, not against a target absence length.

### Step 3: Population, food, and starvation ✅

The first real feedback loop.

- Villagers eat per second; surplus accumulates toward a birth; a birth needs
  housing headroom (fixed cap for now).
- Going short on food → starvation → slow villager loss.
- Food is capped (fixed cap for now); overflow is discarded.

**Done when:** a village left alone grows to its cap and holds; a village that
gathers too little shrinks slowly and never hits zero fast enough to feel like
a wipe. Tests cover growth, equilibrium, and the starvation curve.

Landed in `village.ts` (constants and rate helpers) plus a `simulateVillage`
pass inside `simulateStep`. `FOOD_PER_VILLAGER = 0.05/s`, `BIRTH_FOOD_COST =
50`, one starvation death per 60s. Caps are `POPULATION_CAP = 10` and
`FOOD_CAP = 200`, both fixed until buildings replace them.

Two rules were added that the sketch above did not call for, both to keep an
absence from reading as a punishment:

- **A birth needs the yield to cover the larger village**, not merely a full
  granary. Growing on stock alone would push the village past what its
  gardeners can feed, starve it back, and leave it oscillating across its
  carrying capacity, killing someone each lap.
- **Starvation never takes the last villager.** Once yields derive from jobs,
  an empty shore can never gather again — a wipe with no way back.

`starvation` joins `GameState` as a clock in [0, 1] rather than a level, and is
defaulted in `migrate` rather than costing a `SAVE_VERSION` bump. Food's
`perSecond` is still the _gross_ yield: `netFoodPerSecond` is what the UI shows
and what `projectFood` interpolates.

---

## Phase 1 — The village runs itself

### Step 4: Name and frame

Small, mechanical, and worth doing before more UI accumulates against the
placeholder.

- Retitle to **Mate Atua** across `index.html`, the PWA manifest in
  `vite.config.ts`, `package.json`, and `App.tsx`. The docs already carry the
  name; the app does not.
- Rewrite the header copy for the framing in `docs/setting.md`: a pā on a
  shore, a rangatira, and a guardian gone silent.
- Adopt the setting's vocabulary in the UI — pā, rangatira, toa, tohunga,
  pātaka — and nowhere else yet. Macrons included; they are not optional.
- Move `SAVE_KEY` to the new name and add the old key to `LEGACY_SAVE_KEYS` so
  it is cleared rather than left behind.
- `base` in `vite.config.ts` stays `/idle/` — it tracks the repository name,
  not the game's.

**Done when:** nothing user-visible carries the old name, the app installs with
the new name and icon, and an existing save is discarded cleanly on first load
rather than resurrecting under two keys.

### Step 5: Jobs and Devotion income

- Job assignment as counts that sum to population: gardener, woodcutter,
  quarrier, toa, tohunga.
- Food, wood, and stone accrue from their jobs; Devotion accrues via
  `tohunga × devotionPerTohunga × shrineMultiplier` (multiplier pinned at 1.0).
- Toa gather nothing and eat more than the rest, so a standing guard costs
  something even in a quiet week.
- Rename the currency fields to match the setting: `faith` → `devotion`,
  `lifetimeFaith` → `mana`. A rename is a state change the `migrate` seam can
  absorb by reading the old field names, so it costs no `SAVE_VERSION` bump.
- Mana increments alongside Devotion and is never decremented.

**Done when:** moving villagers between jobs visibly changes the rates, toa
show as a food cost with no yield, and reassignment is handled correctly when
population changes — births and deaths rebalance without dropping or duplicating
villagers.

### Step 6: Decrees

- A screen to set the labor split, breeding policy, muster share, and offering
  share.
- Offerings convert surplus food to Devotion at a poor fixed rate.
- Muster is stored now and read by the raid step later.
- Decrees persist in the save and apply during offline catch-up.

**Done when:** a decree set before closing the tab is the one in effect on
reopening, and the offline result matches what the same elapsed time produces
online.

_At this point the game is a working idle village sim. Everything after it is
the sea._

---

## Phase 2 — The sea attacks

### Step 7: Modifiers and cooldowns

Shared infrastructure that blessings, petitions, events, and raids all need.
Built once, deliberately, before four systems each grow their own version.

- A list of active modifiers on state: `{ id, target, multiplier, expiresAt }`,
  applied when computing rates.
- A cooldown map: `{ [id]: readyAt }`.
- Both expire correctly through a long offline catch-up.

**Done when:** a modifier applied and then fast-forwarded past its expiry leaves
no trace, and rates return to baseline exactly.

### Step 8: Waves and the siege

The heart of the game, and the step most likely to be fiddly.

- A seeded wave schedule: arrival times and composition derived from the save's
  seed and the wave number, so the same village always faces the same sea.
- Wall integrity on state, with a fixed maximum for now and repair costing wood
  and builder time.
- An active wave lives on state and resolves a step at a time inside
  `simulateStep`: the toa damage the wave, the wave damages the pā.
- **The tide ends the wave**, not the fight — a fixed duration, ending early
  only if the wave is wiped out. Whatever survives is what hurts you.
- The loss ladder, in order: wall integrity → toa → stores → houses →
  villagers, never below the population floor.
- Muster (step 6) pulls villagers to the wall for the wave's duration.
- The whole thing resolves identically during offline catch-up.

**Done when:** a wave watched live and the same wave resolved in one offline
call produce the same state; a village with no defense loses stores and huts but
survives with people alive; a village with a good wall and a real warband takes
a wave with no losses at all; and the next wave's arrival time is visible on
screen.

### Step 9: Chief's commands

The active layer during a raid. No currency, no cooldown — each is a trade.

- **Rally** (all jobs to the wall for the wave), **Bar the doors** (fewer
  villagers lost, more stores taken), **Sortie** (kill faster, lose more toa).
- Commands apply for the remainder of the current wave only, and are recorded
  on the wave so the Chronicle can report what you ordered.
- Absent players get the default: hold the wall.

**Done when:** each command measurably changes a wave's outcome in the
direction it promises, and a wave with no command given resolves exactly as it
did before this step existed.

---

## Phase 3 — The village answers

### Step 10: The kaitiaki's blessings

- Data-driven blessing definitions: Devotion cost, Mana tier, effect (a
  permanent modifier, an unlock, or a change to how a rule works).
- Purchased permanently, never cast. Devotion is spent here and nowhere else.
- UI: the branch as a tier list showing cost, effect, and what is still locked
  behind Mana.

**Done when:** buying a blessing spends Devotion, applies its effect
immediately and permanently, and survives a reload; a blessing above your Mana
is visible but unbuyable with its threshold shown.

### Step 11: Petitions

The between-raids hook. Depends on step 7 for rewards and step 2 for
deterministic generation.

- Generation on a population-scaled timer from a weighted table across the
  categories in the design doc.
- Pending queue with a cap; new arrivals displace the oldest; each has an
  expiry.
- Grant (pay cost, apply reward) / Refuse (free, forfeit).
- Generation, expiry, and displacement all resolve during offline catch-up, so
  a returning player finds a live queue, not a backlog.

**Done when:** a 12-hour absence yields at most a full queue of unexpired
petitions, the same absence always yields the same petitions from the same
save, and refusing has no penalty of any kind.

### Step 12: Events

- A seeded event schedule, independent of the wave schedule: storm, red tide,
  blight, good harvest, calm season, beached carcass.
- Events apply modifiers or one-shot losses, and can damage the wall before a
  wave rather than only during one.

**Done when:** events fire deterministically from the seed, are visible in the
UI while active, and a village with no player input survives a normal event
cadence on top of a normal wave cadence.

### Step 13: The Chronicle

- The sim emits structured log entries (births, deaths, waves and their
  outcomes, commands given, events, lapsed petitions, offerings) into a bounded
  ring buffer on state.
- On return from an absence, render the entries from that gap as a summary.
- A scrollable history view for the rest.

**Done when:** closing the tab overnight produces a readable account of the
night's raid, and the buffer is capped so the save can't grow without bound.

---

## Phase 4 — The long arc

### Step 14: Buildings and the tech tree

- Houses (population cap), the pātaka (food cap), the shrine and its upgrades
  (shrine multiplier), the wall and its upgrades (wall maximum), watchtowers
  (earlier warning), and workshops (gathering and weapon tiers) — replacing
  every fixed cap from the phases above.
- Construction takes villager time and materials rather than completing
  instantly; builders come out of the labor split.
- The three branches presented as one tree, with the kaitiaki branch from step
  10 as its third column.

**Done when:** caps are building-derived everywhere, construction progresses
correctly through an offline catch-up, and a wave arriving mid-construction
interacts with it sensibly.

### Step 15: The last tide

- The endgame of the kaitiaki's branch: a final wave that is the answer to the
  premise, gated behind Mana and a very expensive build.
- Surviving it ends the run and takes the pā to its next landfall.
- Carry-over earned from Mana; a shop for permanent advantages; a reset that
  preserves them and the karakia already kept.

**Done when:** a full run can be completed and restarted, and a second run with
boons reaches the escalation that ended the first one measurably sooner.

---

## Deliberately not in this plan

Individually simulated villagers, terrain and wall placement, other pā, a
taniwha of your own, and alignment. All are captured under _Future ideas_ in
`docs/mechanics.md`. They get revisited after step 9, when we'll know whether
the raid loop is actually fun — which is the real question this plan exists to
answer as cheaply as possible.
