# Game mechanics

The design doc for the game itself. Technical/architecture decisions live in
`CLAUDE.md` and `docs/`; this file is about what the player does and why.

Status: **draft, actively iterating.** Nothing here is built yet. Sections
marked _Future_ are deliberately deferred — they are recorded so we stop
re-litigating them, not because they are planned.

## Premise

You are a god. A small tribe lives on your island. They feed themselves,
build, and worship without you. You cannot order a villager to pick up a
log — you shape the island, answer prayers, and spend Faith on miracles,
and the tribe responds.

The reference point is Black & White: an autonomous village you influence
rather than command. The idle framing is a natural fit — a village that runs
itself is exactly what an idle game needs while the tab is closed.

## The central tension

Black & White is about direct manipulation. Idle games are about absence.
Every mechanic below has to answer: **what does this do while the player is
gone?** The resolution we're committing to:

- **The tribe runs on standing orders.** What it does while you're away is
  the consequence of decisions you made before you left.
- **Active play is rewarded, never required.** Prayers and miracles are the
  active layer. Skipping them costs you upside; it never digs a hole.

## Core loop

1. Villagers gather food, wood, and stone, and worship at the temple.
2. Worship generates **Faith**.
3. Faith buys **miracles** — short, powerful interventions on cooldowns.
4. **Prayers** surface periodically and ask for something specific; granting
   them costs resources and pays out a bonus.
5. Materials buy **buildings**, which raise caps and multipliers.
6. Population grows on food surplus, which raises Faith income.
7. Lifetime Faith gates **unlocks**, opening new miracles, buildings, and
   eventually **Ascension**.

## Faith

Faith is the primary currency and doubles as the game's XP.

```
faithPerSecond = worshippers × faithPerWorshipper × templeMultiplier
```

Two separate numbers are tracked:

- `faith` — the spendable balance. Goes down when you cast or grant.
- `lifetimeFaith` — monotonic total ever earned. Never spent, never reset
  (except by Ascension). **All unlocks key off `lifetimeFaith`.**

Splitting them matters: it means spending Faith freely on miracles never
stalls progression, so the active layer is never a trap. A player who hoards
Faith and a player who spends it constantly reach the same unlocks; the
spender just has a better-fed village along the way.

Strawman values: `faithPerWorshipper = 0.1/s`, starting temple multiplier
`1.0`.

## Villagers, food, and population

Villagers are a count with a job assignment, not individually simulated
agents. (Named individuals appear in prayers and the Chronicle for flavor —
that's presentation, not simulation.)

Jobs: **forager** (food), **woodcutter** (wood), **quarrier** (stone),
**worshipper** (Faith). The player sets the split as a standing order; it
persists while offline.

- Each villager eats `foodPerVillager` per second regardless of job.
- Food surplus accumulates toward a birth; a birth costs a fixed food chunk
  and requires housing headroom.
- Food deficit drains the granary; an empty granary starts starvation, which
  kills villagers slowly and cuts Faith income.

Starvation is the main failure state and the main reason to check in. It
should be _slow_ — a neglected village shrinks and gets poorer, it does not
wipe. Losing hours of progress to a closed tab is not the experience.

Strawman: `foodPerVillager = 0.05/s`, birth costs 50 food, starvation kills
one villager per 60s at zero food.

## Decrees

Standing orders. Cheap to change, delayed payoff — the reason to check in
without being a demand.

- **Labor split** — how the population divides across the four jobs.
- **Breeding** — encourage / neutral / forbid. Encourage raises birth rate
  and food cost per birth; forbid halts growth to bank food.
- **Offerings** — what share of surplus food burns at the temple, converting
  food into Faith at a poor but always-available rate.

Offerings are the pressure valve: a player who over-invests in foragers has
somewhere to put the surplus.

## Prayers

The primary active-play hook, and the thing that makes checking in feel like
being a god rather than reading a spreadsheet.

A prayer is a request from a named villager that appears in the UI and waits
for a decision:

> _Ila the forager prays:_ "The north field is bare. Send us rain, and we
> will fill the granary in your name."
>
> **Grant** — 40 Faith · **Reject**

Mechanics:

- Prayers generate on a timer, scaled by population — roughly one every
  5–10 minutes of tribe activity, faster in larger villages.
- Each has a **cost** (Faith, or materials), a **reward**, and an
  **expiry** (strawman: 30 minutes). Unanswered prayers lapse.
- The pending queue is **capped** (strawman: 3). A new prayer arriving at a
  full queue displaces the oldest.
- **Granting** pays the cost and applies the reward: a Faith burst, a
  temporary production buff, a resource drop, or occasionally a small
  permanent bump (a villager becomes more productive at their job).
- **Rejecting** is free and has no penalty beyond the forfeited reward.
  There is no punishment mechanic for saying no.
- Expected value of granting is positive, so the interesting decision is
  _which_ to grant when Faith is scarce, not whether to engage at all.

Offline behavior: prayers accrue and expire normally during the fast-forward,
so a returning player finds one or two live prayers rather than a wall of
forty. Lapsed prayers appear in the Chronicle as a line of text — enough to
feel the cost of absence, not enough to punish it.

Prayer variety is where the game's personality lives. Categories to write
against:

| Category | Example                            | Cost  | Reward                       |
| -------- | ---------------------------------- | ----- | ---------------------------- |
| Relief   | "The crops are failing."           | Faith | Food drop + buff             |
| Ambition | "Let us build a greater hut."      | Wood  | Permanent pop cap bump       |
| Doubt    | "Show us you are there."           | Faith | Faith multiplier for a while |
| Grief    | "My child is sick."                | Faith | Prevents a villager death    |
| Greed    | "We would have more than we need." | Food  | Faith burst                  |

## Miracles

Faith cost plus a cooldown. Discovered by hitting `lifetimeFaith`
thresholds, not purchased from a shop.

| Miracle | Effect                                       |
| ------- | -------------------------------------------- |
| Rain    | Food yield ×2 for a duration                 |
| Bounty  | Instant food drop, scaled to population      |
| Vigor   | All jobs work faster for a duration          |
| Mend    | Cancels an active bad event (famine, plague) |

Miracles are the burst layer: they cannot be sustained (cooldowns), so they
top up a village rather than replacing decrees. Destructive miracles are
deliberately absent — see _Future: alignment_.

## Buildings

Built by villagers over time using materials, not bought instantly.

- **Hut** — raises population cap.
- **Granary** — raises food cap, slows starvation onset.
- **Shrine → Temple → Cathedral** — raises `templeMultiplier`.
- **Great Idol** — the Ascension trigger. Enormous cost; finishing it ends
  the current island.

## Events

Periodic pressure from a seeded event schedule: storms (destroy stores),
plague (kills villagers, cuts output), drought (food yield down), and their
positive counterparts (good harvest, calm season).

Events are what make miracles and prayers matter — without them the sim is
monotonic. They resolve during offline catch-up and get reported in the
Chronicle.

## The Chronicle

The offline summary, written as a log rather than a receipt. This is the
payoff for coming back:

> _Night 12._ A storm took a third of the granary. Two villagers died of
> fever; Tama's child was born. Your people burned 30 grain at the idol.
> Ila's prayer for rain went unanswered.

The sim emits events; the Chronicle renders them. Cheap to build once
events exist, and it does most of the work of making the game feel like a
world instead of a counter.

## Ascension (prestige)

Completing the Great Idol ends the island: the tribe transcends, and you
seed a new one. You keep **Divine Essence**, earned in proportion to
`lifetimeFaith` at the moment of Ascension, and spend it on permanent boons
that carry across islands (faster gathering, higher starting population,
retained miracles).

Ascension is the long-arc loop and can come late — it needs the core loop to
be fun first.

---

# Future ideas

Recorded and deliberately deferred. Each one is a real design, not a
placeholder, but none of them are worth building until the Faith loop above
is proven fun.

## Alignment (good / evil)

Black & White's signature axis. The reason it's deferred: as sketched it was
a label with nothing hanging off it. It only earns its place if it _changes_
things:

- Destructive miracles (lightning, firestorm, earthquake) unlocked only by
  an evil lean, constructive ones by a good lean.
- Alignment shifts what prayers generate — a feared god gets pleas, a loved
  god gets ambitions.
- Visual drift in the island and the temple.

Revisit once there are enough miracles for the split to matter.

## Devotion: Love and Fear

The intended depth behind alignment. Faith income would split into two
components with opposite dynamics:

- **Love** — slow to build, slow to decay, survives long absences.
- **Fear** — spikes from destructive acts, decays in hours, suppresses birth
  rate.

That maps neatly onto play styles (Love is the idle build, Fear is the
active burst) and it's the most interesting idea in the original sketch. It's
deferred because it needs destructive miracles to exist first, which needs
alignment, which needs a bigger miracle roster. It's a phase-3 idea.

## The Creature

A beast you raise, with a behavior table (`gather`, `tend`, `terrorize`,
`teach`) whose weights you train by approving or rebuking what it does.
Those weights determine what it does while you're offline — so two players
with identical stats get different offline reports.

This is the most distinctive idea on the list and the most expensive: it
needs a training UI, a behavior sim, and enough systems for its actions to
be meaningful. Way later.

## Rival tribes

Unbelievers on later shores with their own influence. Convert them by
radiating Faith (a conversion bar per village driven by influence/s) or, if
alignment ever lands, break them. Adds a spatial dimension the game doesn't
currently have.

## Individually simulated villagers

Named villagers with traits, relationships, and lifespans, rather than a
count with job buckets. Massively better Chronicle and prayer flavor;
massively more expensive to simulate through a long offline catch-up.
