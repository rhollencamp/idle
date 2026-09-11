import { describe, expect, it } from 'vitest'
import { createInitialState } from './initialState'
import {
  MIN_AWAY_MS,
  formatDuration,
  resumeFrom,
  summarizeAbsence,
} from './summary'
import { advanceTo } from './tick'
import {
  DEVOTION_PER_TOHUNGA,
  FOOD_PER_VILLAGER,
  JOB_YIELD,
  MIN_POPULATION,
  noJobs,
} from './village'
import type { GameState } from './types'

const START = 1_700_000_000_000
const HOUR = 60 * 60 * 1000

function makeState(overrides: Partial<GameState> = {}): GameState {
  return { ...createInitialState(START), ...overrides }
}

describe('summarizeAbsence', () => {
  it('reports nothing for a gap under the threshold', () => {
    const before = makeState()
    const after = advanceTo(before, START + MIN_AWAY_MS - 1000)

    expect(summarizeAbsence(before, after)).toBeNull()
  })

  it('reports what each store gained', () => {
    const before = makeState({
      jobs: { ...noJobs(), gardener: 2, woodcutter: 1, tohunga: 1 },
      population: 4,
    })
    const after = advanceTo(before, START + HOUR)

    const summary = summarizeAbsence(before, after)!

    expect(summary.awayMs).toBe(HOUR)
    expect(summary.resources.wood).toBeCloseTo(
      3600 * JOB_YIELD.woodcutter!.perSecond,
      5,
    )
    expect(summary.resources.stone).toBe(0)
    expect(summary.devotion).toBeCloseTo(3600 * DEVOTION_PER_TOHUNGA, 5)
    expect(summary.starving).toBe(false)
  })

  it('counts devotion earned even when the balance was spent', () => {
    const before = makeState({
      jobs: { ...noJobs(), tohunga: 1 },
      devotion: 50,
    })
    // Standing in for a blessing bought during the absence: Mana keeps the
    // record of what was earned, which is what the report is asking about.
    const after = { ...advanceTo(before, START + HOUR), devotion: 0 }

    expect(summarizeAbsence(before, after)!.devotion).toBeCloseTo(
      3600 * DEVOTION_PER_TOHUNGA,
      5,
    )
  })

  it('reports births and deaths separately rather than netting them', () => {
    // Enough gardeners to keep having children, and enough stored food to pay
    // for them — then the gardens are wiped out mid-absence and the same pā
    // starves. One span, both halves of the story.
    const growing = makeState({
      population: 3,
      jobs: { ...noJobs(), gardener: 3 },
      resources: { food: 200, wood: 0, stone: 0 },
    })
    const grown = advanceTo(growing, START + 10 * 60 * 1000)
    expect(grown.births).toBeGreaterThan(0)

    const abandoned = {
      ...grown,
      jobs: noJobs(),
      resources: { ...grown.resources, food: 0 },
    }
    const after = advanceTo(abandoned, grown.lastTick + 10 * 60 * 1000)

    const summary = summarizeAbsence(growing, after)!

    expect(summary.births).toBe(grown.births)
    expect(summary.deaths).toBeGreaterThan(0)
    // The two halves cancel in the population count, which is exactly what a
    // net figure would hide.
    expect(summary.births).toBeGreaterThan(0)
    expect(summary.population).toBe(after.population)
    expect(after.population).toBeGreaterThanOrEqual(MIN_POPULATION)
    expect(summary.starving).toBe(true)
  })

  it('reports a quiet absence as no births and no deaths', () => {
    // Fed, but only just: eight mouths against two gardeners banks food too
    // slowly to pay for a child inside the span.
    const before = makeState({
      population: 8,
      jobs: { ...noJobs(), gardener: 2 },
      resources: { food: 10, wood: 0, stone: 0 },
    })
    const after = advanceTo(before, START + 5 * 60 * 1000)

    const summary = summarizeAbsence(before, after)!

    expect(summary.births).toBe(0)
    expect(summary.deaths).toBe(0)
    expect(summary.starving).toBe(false)
  })

  it('reports food draining as a negative', () => {
    const away = 5 * 60 * 1000
    const before = makeState({
      jobs: noJobs(),
      resources: { food: 100, wood: 0, stone: 0 },
    })
    const after = advanceTo(before, START + away)

    // Nobody gardening, so the pātaka only pays out: five villagers eating for
    // five minutes, and still stocked at the end.
    expect(summarizeAbsence(before, after)!.resources.food).toBeCloseTo(
      (-away / 1000) * FOOD_PER_VILLAGER * before.population,
      5,
    )
  })
})

describe('resumeFrom', () => {
  it('advances the state and reports the same span', () => {
    const resumed = resumeFrom(makeState(), START + 2 * HOUR)

    expect(resumed.state.lastTick).toBe(START + 2 * HOUR)
    expect(resumed.summary!.awayMs).toBe(2 * HOUR)
  })

  it('reports nothing when there was no absence', () => {
    expect(resumeFrom(makeState(), START + 500).summary).toBeNull()
  })
})

describe('formatDuration', () => {
  it('rounds down to the largest whole unit', () => {
    expect(formatDuration(30_000)).toBe('a moment')
    expect(formatDuration(60_000)).toBe('1 minute')
    expect(formatDuration(59 * 60_000)).toBe('59 minutes')
    expect(formatDuration(90 * 60_000)).toBe('1 hour')
    expect(formatDuration(5.5 * HOUR)).toBe('5 hours')
    expect(formatDuration(26 * HOUR)).toBe('1 day')
    expect(formatDuration(9 * 24 * HOUR)).toBe('9 days')
  })
})
