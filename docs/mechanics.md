# Game mechanics

The design doc for the game itself. Technical/architecture decisions live in
`CLAUDE.md` and `docs/`; this file is about what the player does and why.

Status: **draft, actively iterating.** Sections marked _Future_ are
deliberately deferred — they are recorded so we stop re-litigating them, not
because they are planned.

## Premise

You are the chief of a village on the shore. Your people fish, forage, build,
and keep the old rites without being told to.

Something in the sea has gone wrong. Crabs come out of the surf in numbers
that crabs have never come in, and behind them are worse things. Nobody knows
why. Your village's atua — the god who has always kept the water on its own
side of the sand — has gone quiet.

You cannot swing a spear yourself. You decide who forages and who stands at
the wall, what gets built, what gets offered, and what the village does while
you are not watching. Then the tide comes in.

## The central tension

This is an idle game, so every mechanic has to answer: **what does this do
while the player is gone?** The resolution we're committing to:

- **The village runs on standing orders.** What it does in your absence is the
  consequence of decisions you made before you left.
- **Waves resolve while you're away.** You do not have to be present for a
  raid, and being present is never the difference between surviving and not.
- **Active play is rewarded, never required.** Petitions and a chief's
  commands during a raid are the active layer. Skipping them costs you upside;
  it never digs a hole you can't climb out of.

The knob under all of it: **a warrior is a villager who is not gathering.**
Everything you spend on defense is growth you didn't buy, and everything you
spend on growth is a wall that isn't there when the tide comes in.

## Core loop

1. Villagers gather food, wood, and stone, and keep the rites at the shrine.
2. Rites generate **Faith**.
3. Faith buys permanent **blessings** in the atua's branch of the tech tree.
4. Wood and stone buy **huts, walls, and weapons** in the other two branches.
5. Food grows the population, which is more hands for every job.
6. The **sea attacks on a schedule** you can see coming. Warriors and the wall
   decide how much it costs you.
7. Each wave is bigger and stranger than the last, and gates the next tier of
   everything.

## Villagers, food, and population

Villagers are a count with a job assignment, not individually simulated
agents. (Named individuals appear in petitions and the Chronicle for flavor —
that's presentation, not simulation.)

- Each villager eats `foodPerVillager` per second, whatever job they hold.
  **Warriors eat more** — keeping a standing guard is a real cost even in a
  quiet week.
- Food surplus accumulates toward a birth. A birth costs a fixed chunk of
  food, needs housing headroom, and needs the village to be able to feed the
  extra mouth from what it gathers, not merely from what it has stored.
- Food deficit drains the granary; going short starts starvation, which kills
  villagers slowly and never takes the last one.
- Food is capped by the granary; anything gathered past it is discarded.

Starvation is deliberately _slow_ — a neglected village shrinks toward the
size its foragers can feed and gets poorer, it does not wipe. Losing hours of
progress to a closed tab is not the experience.

Strawman values, as built: `foodPerVillager = 0.05/s`, birth costs 50 food,
one starvation death per 60s of unmet need, population floor of 1.

## Jobs

The player sets the split as a standing order; it persists while offline.

| Job            | Produces                                              |
| -------------- | ----------------------------------------------------- |
| **Forager**    | Food                                                  |
| **Woodcutter** | Wood                                                  |
| **Quarrier**   | Stone                                                 |
| **Warrior**    | Nothing. Fights during a wave and eats more than most |
| **Tohunga**    | Faith, by keeping the rites at the shrine             |

Births and deaths have to rebalance the split without dropping or duplicating
anyone, since the split is stored as counts that sum to the population.

## The sea

Waves arrive on a **seeded schedule**, so the same save always faces the same
sea, and an absence resolves identically however it is replayed. The next
wave's arrival time is always visible; what is in it depends on how far you
can see (see _The atua_).

Escalation is the game's clock. Each wave is drawn from a table that opens up
as the wave count climbs:

| Creature                          | From wave | What it does to you                                                   |
| --------------------------------- | --------- | --------------------------------------------------------------------- |
| **Shore crab**                    | 1         | Weak, many. Punishes having no wall at all                            |
| **Spinecrab**                     | ~4        | Armored: raw warrior count stops being enough without better spears   |
| **Reefback**                      | ~8        | Slow, enormous, goes through wall integrity fast                      |
| **Drowned**                       | ~12       | Walks past the wall entirely and goes for people. Warriors or nothing |
| _The thing they are running from_ | endgame   | The reason the sea emptied itself onto your beach                     |

The point of the table is that no single defense answers it. A tall wall does
nothing about the Drowned; a big warband bleeds against a Reefback that a wall
would have slowed. Each new creature is a reason to open a branch you have
been ignoring.

## A raid

A wave is not a dice roll — it lives on state for its whole duration and
resolves a step at a time, the same code path online and offline.

**The tide sets the clock, not the fight.** A wave lasts until the tide turns
(strawman: 3 minutes). It ends early if you kill everything in it. Whatever
you failed to kill in that window is what hurts you. That is the mechanism
that makes a raid survivable by definition — you are never locked in an
unwinnable siege, you just pay for what you couldn't stop.

Each step of a raid:

- Your warriors deal damage to the wave, scaled by warrior count, weapon tech,
  and blessings.
- The wave deals damage to the village, scaled by what's still alive in it.

Damage lands in a ladder, and only moves down a rung when the rung above is
gone:

1. **Wall integrity.** Repairable with wood and builder time.
2. **Warriors.** They are standing in front; they die first.
3. **Stores.** Food and materials get raided.
4. **Huts.** Destroyed huts lower the population cap until rebuilt.
5. **Villagers.** Never below the population floor.

So a bad night costs materials, time, and some people — and leaves a village
that can still climb back. A very bad night costs a lot of all three. There is
no rung below the floor.

## Decrees

Standing orders. Cheap to change, delayed payoff — the reason to check in
without being a demand.

- **Labor split** — how the population divides across the five jobs.
- **Breeding** — encourage / neutral / forbid. Encourage raises birth rate and
  the food cost per birth; forbid halts growth to bank food.
- **Muster** — what share of the village drops its tools and picks up a spear
  when a wave lands. Lets you run a lean standing guard and still meet a raid
  in numbers, at the cost of everything they would have gathered.
- **Offerings** — what share of surplus food burns at the shrine, converting
  food into Faith at a poor but always-available rate.

Offerings are the pressure valve: a player who over-invests in foragers has
somewhere to put the surplus.

## Chief's commands

The active layer _during_ a raid. Free, no currency, no cooldown — they are
decisions, not abilities, and each one is a trade rather than a win button.

- **Rally** — every job drops what it's doing and goes to the wall for the
  rest of the wave. Nothing is gathered while it lasts.
- **Bar the doors** — villagers hide. Fewer people lost, more stores taken.
- **Sortie** — warriors go over the wall. Kill much faster, lose more warriors.

A player who is present picks the right one for what's coming ashore. A player
who is absent gets the default, which is simply holding the wall — a fine
outcome, just not the best one.

## Faith and the atua

Faith is the third resource and the game's long-term progression. It is
**not** spent on interventions — there is no button that casts a miracle. It
buys permanent **blessings** in the atua's branch of the tech tree, and
nothing else.

```
faithPerSecond = tohunga × faithPerTohunga × shrineMultiplier
```

Two separate numbers are tracked:

- **Faith** — the spendable balance. Goes down when you buy a blessing.
- **Devotion** — the monotonic total ever earned. Never spent, never reset
  (except at the end of a run). **All tier unlocks key off Devotion.**

Splitting them matters: spending Faith freely never stalls progression. A
player who hoards and a player who buys everything the moment they can afford
it reach the same tiers; the second one just had a better-defended village
along the way.

The branch is also where the story lives. The atua is not answering, and the
blessings are the village's attempt to be heard again — each tier is a little
more of the answer to what happened out there and why the sea is running from
it.

Blessings to write against:

| Tier | Example         | Effect                                                      |
| ---- | --------------- | ----------------------------------------------------------- |
| 1    | Salt Wards      | The wall knits itself back slowly between waves             |
| 1    | Sharpened Rites | Warriors hit harder                                         |
| 2    | Tide Sense      | Omens name the next wave's size and kind, not just its hour |
| 2    | The Fed God     | Offerings convert food to Faith far better                  |
| 3    | The God Stirs   | Once per wave, the sea recoils and the tide turns early     |
| 4    | _Reawakening_   | The endgame of the branch, and the answer to the premise    |

Strawman values: `faithPerTohunga = 0.1/s`, starting `shrineMultiplier` 1.0.

## The tech tree

Three branches, three currencies, three reasons to send people to different
work:

- **Village** (wood, stone) — huts for population cap, granary for food cap
  and slower starvation, better tools for every gathering job.
- **War** (wood, stone, food) — palisade → wall → seawall, spears → stone-tipped
  spears → whatever answers the Drowned, watchtowers for earlier warning,
  drills that make each warrior worth more.
- **The atua** (Faith) — blessings, as above, tiered by Devotion.

Buildings are built by villagers over time using materials, not bought
instantly. Construction comes out of the labor split like any other job.

## Petitions

The primary active-play hook between raids, and the thing that makes checking
in feel like being a chief rather than reading a spreadsheet.

A petition is a request from a named villager that appears in the UI and waits
for a decision:

> _Ila, who forages the north field, asks:_ "The field is bare and the crabs
> have been in the shallows since dawn. Let me take four others and dig the
> beds behind the ridge — we will fill the granary or we will not come back."
>
> **Grant** — 20 food · **Refuse**

Mechanics:

- Petitions generate on a timer scaled by population — roughly one every 5–10
  minutes of village activity, faster in larger villages.
- Each has a **cost** (materials or Faith), a **reward**, and an **expiry**
  (strawman: 30 minutes). Unanswered petitions lapse.
- The pending queue is **capped** (strawman: 3). A new petition arriving at a
  full queue displaces the oldest.
- **Granting** pays the cost and applies the reward: a resource drop, a
  temporary production or defense buff, or occasionally a small permanent bump
  (a villager becomes better at their job).
- **Refusing** is free and has no penalty beyond the forfeited reward. There is
  no morale mechanic punishing you for saying no.
- Expected value of granting is positive, so the interesting decision is
  _which_ to grant when you're short, not whether to engage at all.

Offline behavior: petitions accrue and expire normally during the fast-forward,
so a returning player finds one or two live ones rather than a wall of forty.
Lapsed petitions appear in the Chronicle as a line of text — enough to feel the
cost of absence, not enough to punish it.

Categories to write against:

| Category     | Example                                 | Cost           | Reward                       |
| ------------ | --------------------------------------- | -------------- | ---------------------------- |
| **Relief**   | "The north field is bare."              | Food           | Food drop + forage buff      |
| **Ambition** | "Let me build a better spear."          | Wood           | Permanent warrior bump       |
| **Fear**     | "My children should sleep inland."      | Food           | Fewer losses next wave       |
| **Doubt**    | "Is the god dead? Tell us plainly."     | Faith          | Faith multiplier for a while |
| **Grief**    | "My brother went into the water."       | Faith          | Prevents a villager death    |
| **Salvage**  | "There is good shell on the dead ones." | Warriors' time | Stone or a weapon buff       |

Petition variety is where the game's personality lives.

## Events

Periodic pressure from a seeded schedule, separate from the wave schedule:
storms (destroy stores, damage the wall), red tide (food yield down), blight,
and their positive counterparts (a good harvest, a calm season, a beached
carcass worth a week of food).

Events are what keep the quiet stretches between waves from being monotonic.
They resolve during offline catch-up and get reported in the Chronicle.

## The Chronicle

The offline summary, written as a log rather than a receipt. This is the payoff
for coming back:

> _Night 12._ The tide brought forty crabs and something larger behind them.
> The wall held until the third hour. Nine died on the sand — six of them
> theirs. Tama's child was born the same night. Ila's petition for the ridge
> beds went unanswered.

The sim emits structured entries; the Chronicle renders them. It does most of
the work of making the game feel like a place instead of a counter.

## The last tide (prestige)

The endgame of the atua branch is finding out what the sea is running from,
and meeting it. Doing so ends the island: the village scatters, or sails, or
something we'll decide when we get there.

You keep **Divine Essence**, earned in proportion to Devotion, and spend it on
permanent boons before starting the next shore: a faster start, better base
yields, a wall that begins upright, a rite already known. A second run should
reach the escalation that ended the first one noticeably sooner.

## Future ideas

Deliberately not in the plan. Recorded so we stop re-litigating them.

- **Individually simulated villagers** — names, ages, families, a villager the
  player actually knows dying on the wall. Enormously expensive, and the
  Chronicle gets most of the emotional payoff for a fraction of the cost.
- **Terrain and placement** — choosing where the wall goes, which approach the
  sea uses. A different (and much larger) game.
- **Rival villages** — trade, raids, refugees from shores that fell first.
- **A creature of your own** — something from the sea that fights for you.
- **Alignment** — whether the village fears the atua or loves it, and what
  that changes.

All of these get revisited after the raid loop exists and we know whether
_defend the shore_ is actually fun — which is the real question the plan
exists to answer as cheaply as possible.
