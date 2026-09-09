import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createInitialState } from './initialState'
import { loadState, saveState } from './save'
import { useGameLoop } from './useGameLoop'

const SAVE_KEY = 'mate-atua:save:v2'

const setVisibility = (value: 'hidden' | 'visible') => {
  Object.defineProperty(document, 'visibilityState', {
    value,
    configurable: true,
  })
  document.dispatchEvent(new Event('visibilitychange'))
}

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
  setVisibility('visible')
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useGameLoop', () => {
  it('advances resources as time passes', () => {
    const { result } = renderHook(() => useGameLoop())

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    // 20 stored, plus a second of the opening pā's net food: two gardeners
    // bringing in 0.25 each against five villagers eating 0.05 each — the
    // other three are children, who eat without gathering.
    expect(result.current.state.resources.food).toBeCloseTo(20.25, 5)
  })

  it('autosaves on an interval', () => {
    renderHook(() => useGameLoop())

    expect(localStorage.getItem(SAVE_KEY)).toBeNull()

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(loadState().step).toBeGreaterThan(0)
  })

  it('saves immediately when the tab is hidden', () => {
    renderHook(() => useGameLoop())

    expect(localStorage.getItem(SAVE_KEY)).toBeNull()

    act(() => {
      setVisibility('hidden')
    })

    expect(localStorage.getItem(SAVE_KEY)).not.toBeNull()
  })

  it('summarizes the absence a save was left sitting through', () => {
    const base = createInitialState(Date.now() - 3 * 60 * 60 * 1000)
    saveState({ ...base, jobs: { ...base.jobs, tohunga: 1 } })

    const { result } = renderHook(() => useGameLoop())

    expect(result.current.summary?.awayMs).toBe(3 * 60 * 60 * 1000)
    expect(result.current.summary?.devotion).toBeGreaterThan(0)
  })

  it('starts with nothing to report on a fresh save', () => {
    const { result } = renderHook(() => useGameLoop())

    expect(result.current.summary).toBeNull()
  })

  it('summarizes the whole gap after the tab comes back', () => {
    const { result } = renderHook(() => useGameLoop())

    act(() => {
      setVisibility('hidden')
    })
    act(() => {
      // The tab keeps ticking while hidden, so the report has to be measured
      // from where it left off rather than from the state on return.
      vi.advanceTimersByTime(30 * 60 * 1000)
    })
    act(() => {
      setVisibility('visible')
    })

    expect(result.current.summary?.awayMs).toBe(30 * 60 * 1000)
    expect(result.current.summary?.births).toBeGreaterThan(0)
  })

  it('keeps quiet about a brief switch away', () => {
    const { result } = renderHook(() => useGameLoop())

    act(() => {
      setVisibility('hidden')
    })
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    act(() => {
      setVisibility('visible')
    })

    expect(result.current.summary).toBeNull()
  })

  it('dismissSummary puts the report away', () => {
    saveState(createInitialState(Date.now() - 60 * 60 * 1000))
    const { result } = renderHook(() => useGameLoop())

    expect(result.current.summary).not.toBeNull()

    act(() => {
      result.current.dismissSummary()
    })

    expect(result.current.summary).toBeNull()
  })

  it('resetGame clears any pending report along with the save', () => {
    saveState(createInitialState(Date.now() - 60 * 60 * 1000))
    const { result } = renderHook(() => useGameLoop())

    expect(result.current.summary).not.toBeNull()

    act(() => {
      result.current.resetGame()
    })

    expect(result.current.summary).toBeNull()
  })

  it('resetGame clears the save and restarts from zero', () => {
    const { result } = renderHook(() => useGameLoop())

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(loadState().step).toBeGreaterThan(0)

    act(() => {
      result.current.resetGame()
    })

    expect(result.current.state.mana).toBe(0)
    expect(result.current.state.step).toBe(0)
    expect(localStorage.getItem(SAVE_KEY)).toBeNull()
  })

  it('gives an untrained villager a trade', () => {
    const { result } = renderHook(() => useGameLoop())

    const before = result.current.state.jobs.toa
    act(() => {
      result.current.trainVillager('toa')
    })

    expect(result.current.state.jobs.toa).toBe(before + 1)
  })

  it('refuses once every villager holds a trade', () => {
    const { result } = renderHook(() => useGameLoop())

    // The opening pā has three children; a fourth call has nobody to train.
    act(() => {
      for (let i = 0; i < 4; i += 1) result.current.trainVillager('tohunga')
    })

    expect(result.current.state.jobs.tohunga).toBe(3)
  })

  it('never lets the roster claim more villagers than the pā has', () => {
    const { result } = renderHook(() => useGameLoop())

    act(() => {
      for (let i = 0; i < 20; i += 1) result.current.trainVillager('toa')
    })

    const jobs = result.current.state.jobs
    const assigned = Object.values(jobs).reduce((a, b) => a + b, 0)
    expect(assigned).toBeLessThanOrEqual(result.current.state.population)
  })

  it('importGame adopts the given state, catches it up, and saves it', () => {
    const { result } = renderHook(() => useGameLoop())

    const base = createInitialState()
    const imported = {
      ...base,
      // Someone has to be keeping the karakia, or there is no income for the
      // catch-up to pay out and the test would prove nothing.
      jobs: { ...base.jobs, tohunga: 1 },
      mana: 250,
      lastTick: Date.now() - 10_000,
    }

    act(() => {
      result.current.importGame(imported)
    })

    // The ten seconds since the export was written are paid out on the way in,
    // so the imported figure is the floor rather than the exact value.
    expect(result.current.state.mana).toBeGreaterThan(250)
    expect(loadState().mana).toBe(result.current.state.mana)
  })

  it('reports the absence an imported save had been sitting through', () => {
    const { result } = renderHook(() => useGameLoop())

    const base = createInitialState()
    act(() => {
      result.current.importGame({
        ...base,
        jobs: { ...base.jobs, tohunga: 1 },
        lastTick: Date.now() - 2 * 60 * 60 * 1000,
      })
    })

    expect(result.current.summary?.awayMs).toBe(2 * 60 * 60 * 1000)
  })
})
