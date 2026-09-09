import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadState } from './save'
import { useGameLoop } from './useGameLoop'

const SAVE_KEY = 'mate-atua:save:v2'

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
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

    // 20 stored, plus a second of the opening pā's net food: three gardeners
    // bringing in 0.25 each against five villagers eating 0.05 each.
    expect(result.current.state.resources.food).toBeCloseTo(20.5, 5)
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

    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(localStorage.getItem(SAVE_KEY)).not.toBeNull()
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

  it('moves a villager into a job only when someone is free', () => {
    const { result } = renderHook(() => useGameLoop())

    // The opening roster has everyone working, so there is nobody to add.
    const before = result.current.state.jobs.toa
    act(() => {
      result.current.assignVillager('toa', 1)
    })
    expect(result.current.state.jobs.toa).toBe(before)

    // Free one from the gardens, and now the move lands.
    act(() => {
      result.current.assignVillager('gardener', -1)
    })
    act(() => {
      result.current.assignVillager('toa', 1)
    })
    expect(result.current.state.jobs.toa).toBe(before + 1)
  })

  it('refuses to take a villager off a job nobody holds', () => {
    const { result } = renderHook(() => useGameLoop())

    act(() => {
      result.current.assignVillager('tohunga', -1)
    })

    expect(result.current.state.jobs.tohunga).toBe(0)
  })

  it('never lets the job sheet claim more villagers than the pā has', () => {
    const { result } = renderHook(() => useGameLoop())

    act(() => {
      for (let i = 0; i < 20; i += 1) result.current.assignVillager('toa', 1)
    })

    const jobs = result.current.state.jobs
    const assigned = Object.values(jobs).reduce((a, b) => a + b, 0)
    expect(assigned).toBeLessThanOrEqual(result.current.state.population)
  })
})
