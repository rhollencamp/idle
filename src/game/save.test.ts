import { beforeEach, describe, expect, it } from 'vitest'
import { createInitialState } from './initialState'
import {
  clearSave,
  loadState,
  migrate,
  parseSave,
  saveState,
  serializeSave,
} from './save'
import { assignedCount, defaultJobs, noJobs } from './village'
import { SAVE_VERSION, type GameState } from './types'

const SAVE_KEY = `mate-atua:save:v${SAVE_VERSION}`
const LEGACY_V1_KEY = 'castaway-idle:save:v1'
const LEGACY_NAME_KEY = 'island-god:save:v2'

function makeState(overrides: Partial<GameState> = {}): GameState {
  return { ...createInitialState(), lastTick: 500, ...overrides }
}

/** A save as it was written before jobs, and before the currency was renamed. */
function makeOldShape(overrides: Record<string, unknown> = {}) {
  return {
    version: SAVE_VERSION,
    resources: {
      food: { amount: 120, perSecond: 0.8 },
      wood: { amount: 30, perSecond: 0.2 },
      stone: { amount: 12, perSecond: 0.1 },
    },
    faith: { amount: 40, perSecond: 0.5 },
    lifetimeFaith: 900,
    population: 7,
    starvation: 0,
    seed: 777,
    step: 1234,
    lastTick: 500,
    ...overrides,
  }
}

beforeEach(() => {
  localStorage.clear()
})

describe('migrate', () => {
  it('accepts a well-formed current save', () => {
    const state = makeState()

    expect(migrate(JSON.parse(JSON.stringify(state)))).toEqual(state)
  })

  it('rejects a v1 save', () => {
    const v1 = {
      resources: { water: { amount: 12, perSecond: 2 } },
      lastTick: 5,
    }

    expect(migrate(v1)).toBeNull()
  })

  it('rejects garbage', () => {
    expect(migrate(null)).toBeNull()
    expect(migrate('nope')).toBeNull()
    expect(migrate(42)).toBeNull()
    expect(migrate([])).toBeNull()
  })

  it('rejects a save missing required fields', () => {
    const { mana: _omitted, ...missingMana } = makeState()

    expect(migrate(missingMana)).toBeNull()
    expect(migrate({ ...makeState(), resources: {} })).toBeNull()
    expect(migrate({ ...makeState(), resources: null })).toBeNull()
  })

  it('rejects a save whose numbers are not numbers', () => {
    expect(migrate({ ...makeState(), lastTick: Number.NaN })).toBeNull()
    expect(
      migrate({ ...makeState(), population: Number.POSITIVE_INFINITY }),
    ).toBeNull()
  })

  it('reads the amounts out of stores written as amount-and-rate pairs', () => {
    const migrated = migrate(makeOldShape())

    // The rate that sat beside each amount is dropped rather than kept: it
    // was measured against a village that no longer exists, since rates now
    // come from who is doing what.
    expect(migrated?.resources).toEqual({ food: 120, wood: 30, stone: 12 })
  })

  it('reads Devotion and Mana out of a save that called them Faith', () => {
    const migrated = migrate(makeOldShape())

    expect(migrated?.devotion).toBe(40)
    expect(migrated?.mana).toBe(900)
  })

  it('prefers the current names when both are present', () => {
    const migrated = migrate(
      makeOldShape({
        devotion: 5,
        mana: 6,
        faith: { amount: 40 },
        lifetimeFaith: 900,
      }),
    )

    expect(migrated?.devotion).toBe(5)
    expect(migrated?.mana).toBe(6)
  })

  it('puts a pā from before jobs existed to work', () => {
    const migrated = migrate(makeOldShape())

    // Left idle, a migrated village would stop gathering and slowly starve
    // through an absence it had no say in.
    expect(migrated?.jobs).toEqual(defaultJobs(7))
    expect(assignedCount(migrated!.jobs)).toBe(7)
  })

  it('keeps a job sheet it can read', () => {
    const jobs = { ...noJobs(), gardener: 4, toa: 2, tohunga: 1 }
    const migrated = migrate({ ...makeState(), population: 7, jobs })

    expect(migrated?.jobs).toEqual(jobs)
  })

  it('trims a job sheet that claims more workers than the pā has', () => {
    const jobs = { ...noJobs(), gardener: 9, tohunga: 1 }
    const migrated = migrate({ ...makeState(), population: 4, jobs })

    expect(assignedCount(migrated!.jobs)).toBe(4)
  })

  it('falls back to a default roster when the job sheet is unusable', () => {
    const broken = { ...noJobs(), gardener: -3 }
    const migrated = migrate({ ...makeState(), population: 5, jobs: broken })

    expect(migrated?.jobs).toEqual(defaultJobs(5))
  })

  it('fills in starvation for a save written before famines existed', () => {
    const { starvation: _starvation, ...preFamine } = makeState()

    expect(migrate(preFamine)?.starvation).toBe(0)
  })

  it('fills in seed and step for a save written before they existed', () => {
    const { seed: _seed, step: _step, ...preSeed } = makeState()

    const migrated = migrate(preSeed)

    expect(migrated).not.toBeNull()
    expect(Number.isFinite(migrated?.seed)).toBe(true)
    expect(migrated?.step).toBe(0)
    // Derived from lastTick, so reloading the same save keeps the same seed.
    expect(migrate(preSeed)?.seed).toBe(migrated?.seed)
  })

  it('starts the tally of births and deaths at zero for an older save', () => {
    const { births: _births, deaths: _deaths, ...preTally } = makeState()

    const migrated = migrate(preTally)

    expect(migrated?.births).toBe(0)
    expect(migrated?.deaths).toBe(0)
  })

  it('keeps a stored tally of births and deaths', () => {
    const state = makeState({ births: 9, deaths: 4 })

    expect(migrate(state)?.births).toBe(9)
    expect(migrate(state)?.deaths).toBe(4)
  })

  it('keeps a stored seed and step rather than resetting them', () => {
    const state = makeState({ seed: 777, step: 42 })

    expect(migrate(state)?.seed).toBe(777)
    expect(migrate(state)?.step).toBe(42)
  })
})

describe('saveState and loadState', () => {
  it('round-trips a state through storage', () => {
    const state = makeState({ mana: 42 })
    saveState(state)

    expect(loadState()).toEqual(state)
  })

  it('starts a fresh pā when nothing is stored', () => {
    expect(loadState().mana).toBe(0)
  })

  it('falls back to a fresh state on corrupt JSON', () => {
    localStorage.setItem(SAVE_KEY, '{not json')

    expect(loadState().mana).toBe(0)
  })

  it('falls back to a fresh state when the saved shape is unusable', () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ resources: {} }))

    expect(loadState().mana).toBe(0)
  })

  it('discards a legacy v1 save instead of crashing on it', () => {
    localStorage.setItem(
      LEGACY_V1_KEY,
      JSON.stringify({
        resources: { water: { amount: 9, perSecond: 1 } },
        lastTick: 1,
      }),
    )

    expect(loadState().mana).toBe(0)
    expect(localStorage.getItem(LEGACY_V1_KEY)).toBeNull()
  })

  it('starts fresh from a save written under the old game name', () => {
    // The key carries the game's name, so a rename retires the old key. The
    // blob under it is structurally fine and simply has nowhere to go — the
    // point of the test is that it is cleared rather than left to sit in a
    // player's storage forever.
    const stranded = makeState({ mana: 500 })
    localStorage.setItem(LEGACY_NAME_KEY, JSON.stringify(stranded))

    expect(loadState().mana).toBe(0)
    expect(localStorage.getItem(LEGACY_NAME_KEY)).toBeNull()
  })
})

describe('clearSave', () => {
  it('removes the saved state', () => {
    saveState(makeState({ mana: 99 }))
    clearSave()

    expect(loadState().mana).toBe(0)
  })
})

describe('serializeSave / parseSave', () => {
  it('round-trips a save through text', () => {
    const state = makeState({ mana: 42 })

    expect(parseSave(serializeSave(state))).toEqual(state)
  })

  it('reads an export the same way a load would', () => {
    // The exported blob goes through `migrate`, so a save written before
    // `starvation` existed is repaired on import rather than rejected.
    const { starvation: _starvation, ...older } = makeState()

    expect(parseSave(JSON.stringify(older))?.starvation).toBe(0)
  })

  it('rejects text that is not a save', () => {
    expect(parseSave('not json at all')).toBeNull()
    expect(parseSave('{}')).toBeNull()
    expect(parseSave(JSON.stringify({ version: 1 }))).toBeNull()
  })
})
