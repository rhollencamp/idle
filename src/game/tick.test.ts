import { describe, expect, it } from 'vitest'
import { createRng } from './rng'
import { advanceTo, MAX_STEPS_PER_ADVANCE, STEP_MS } from './tick'
import { SAVE_VERSION, type GameState } from './types'

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: SAVE_VERSION,
    resources: {
      food: { amount: 0, perSecond: 1 },
      wood: { amount: 0, perSecond: 2 },
      stone: { amount: 0, perSecond: 0 },
    },
    faith: { amount: 0, perSecond: 0.5 },
    lifetimeFaith: 0,
    population: 5,
    seed: 424242,
    step: 0,
    lastTick: 1000,
    ...overrides,
  }
}

describe('advanceTo', () => {
  it('accrues each resource based on elapsed seconds', () => {
    const next = advanceTo(makeState(), 1000 + 2000)

    expect(next.resources.food.amount).toBe(2)
    expect(next.resources.wood.amount).toBe(4)
    expect(next.resources.stone.amount).toBe(0)
    expect(next.lastTick).toBe(3000)
  })

  it('accrues faith into both the balance and the lifetime total', () => {
    const next = advanceTo(makeState(), 1000 + 10_000)

    expect(next.faith.amount).toBe(5)
    expect(next.lifetimeFaith).toBe(5)
  })

  it('grows lifetime faith even when the balance has been spent down', () => {
    const spent = makeState({
      faith: { amount: 0, perSecond: 0.5 },
      lifetimeFaith: 100,
    })
    const next = advanceTo(spent, 1000 + 10_000)

    expect(next.faith.amount).toBe(5)
    expect(next.lifetimeFaith).toBe(105)
  })

  it('catches up fully when now is far in the future (offline progress)', () => {
    const oneDayMs = 24 * 60 * 60 * 1000
    const next = advanceTo(makeState(), 1000 + oneDayMs)

    expect(next.resources.food.amount).toBeCloseTo(oneDayMs / 1000, 6)
  })

  it('returns the same state unchanged when time has not advanced', () => {
    const state = makeState()

    expect(advanceTo(state, state.lastTick)).toBe(state)
    expect(advanceTo(state, state.lastTick - 1)).toBe(state)
  })

  it('holds back a partial step rather than dropping or spending it', () => {
    const state = makeState()

    // Less than a step: nothing simulated, and lastTick does not move, so the
    // time is still owed.
    expect(advanceTo(state, state.lastTick + STEP_MS - 1)).toBe(state)

    // A step and a half: one step runs, the half stays on the clock.
    const next = advanceTo(state, state.lastTick + STEP_MS * 1.5)
    expect(next.step).toBe(1)
    expect(next.lastTick).toBe(state.lastTick + STEP_MS)
  })

  it('does not mutate the input state', () => {
    const state = makeState()
    advanceTo(state, 5000)

    expect(state.resources.food.amount).toBe(0)
    expect(state.faith.amount).toBe(0)
    expect(state.lifetimeFaith).toBe(0)
    expect(state.lastTick).toBe(1000)
  })
})

describe('advanceTo determinism', () => {
  const oneHourMs = 60 * 60 * 1000

  function advanceInChunks(state: GameState, chunkMs: number, chunks: number) {
    let current = state
    for (let i = 1; i <= chunks; i += 1) {
      current = advanceTo(current, state.lastTick + chunkMs * i)
    }
    return current
  }

  it('resolves an hour identically however the time is divided', () => {
    const state = makeState()

    const inOneCall = advanceTo(state, state.lastTick + oneHourMs)
    const inMinutes = advanceInChunks(state, 60 * 1000, 60)
    const inSeconds = advanceInChunks(state, 1000, 3600)

    expect(inMinutes).toEqual(inOneCall)
    expect(inSeconds).toEqual(inOneCall)
  })

  it('leaves the PRNG at the same place however the time is divided', () => {
    const state = makeState()
    const stream = (result: GameState) => {
      const rng = createRng(result.seed, result.step, 'events')
      return [rng(), rng(), rng(), rng()]
    }

    const inOneCall = advanceTo(state, state.lastTick + oneHourMs)
    const inSeconds = advanceInChunks(state, 1000, 3600)

    expect(stream(inSeconds)).toEqual(stream(inOneCall))
  })

  it('carries the seed forward untouched', () => {
    const state = makeState()

    expect(advanceTo(state, state.lastTick + oneHourMs).seed).toBe(state.seed)
  })
})

describe('advanceTo step budget', () => {
  it('covers a multi-day absence without coarsening', () => {
    const fourDaysMs = 4 * 24 * 60 * 60 * 1000
    const state = makeState()

    const next = advanceTo(state, state.lastTick + fourDaysMs)

    // Every step is still the base width, so nothing about this span is
    // resolved more coarsely than it would be watching it happen.
    expect(next.step).toBe(fourDaysMs / STEP_MS)
    expect(next.lastTick).toBe(state.lastTick + fourDaysMs)
  })

  it('coarsens the step instead of running millions of them', () => {
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
    const state = makeState()

    const startedAt = performance.now()
    const next = advanceTo(state, state.lastTick + thirtyDaysMs)
    const elapsedMs = performance.now() - startedAt

    expect(next.step).toBeLessThanOrEqual(MAX_STEPS_PER_ADVANCE)
    // A guard against per-step cost regressing, not a performance target:
    // this is ~10ms on a dev machine, so tripping it means a step got an
    // order of magnitude more expensive, not that a CI runner was busy.
    expect(elapsedMs).toBeLessThan(150)
    // A coarser step still covers the whole absence, so nothing accrues slowly.
    expect(next.resources.food.amount).toBeCloseTo(thirtyDaysMs / 1000, 3)
  })

  it('keeps the clock consistent so a follow-up call has nothing to redo', () => {
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
    const state = makeState()
    const target = state.lastTick + thirtyDaysMs

    const next = advanceTo(state, target)
    // Flooring the coarse step can leave a remainder; it is still owed, never
    // simulated twice.
    expect(next.lastTick).toBeLessThanOrEqual(target)
    expect(advanceTo(next, target).lastTick).toBeLessThanOrEqual(target)
  })
})
