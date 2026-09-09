import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createInitialState } from './initialState'
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

    // 20 stored, plus a second of the starting village's net food: 0.8
    // gathered against five villagers eating 0.05 each.
    expect(result.current.state.resources.food.amount).toBeCloseTo(20.55, 5)
  })

  it('autosaves on an interval', () => {
    renderHook(() => useGameLoop())

    expect(localStorage.getItem(SAVE_KEY)).toBeNull()

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(loadState().lifetimeFaith).toBeGreaterThan(0)
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
    expect(loadState().lifetimeFaith).toBeGreaterThan(0)

    act(() => {
      result.current.resetGame()
    })

    expect(result.current.state.lifetimeFaith).toBe(0)
    expect(localStorage.getItem(SAVE_KEY)).toBeNull()
  })

  it('importGame adopts the given state, catches it up, and saves it', () => {
    const { result } = renderHook(() => useGameLoop())

    const imported = {
      ...createInitialState(),
      lifetimeFaith: 250,
      lastTick: Date.now() - 10_000,
    }

    act(() => {
      result.current.importGame(imported)
    })

    // The ten seconds since the export was written are paid out on the way in,
    // so the imported figure is the floor rather than the exact value.
    expect(result.current.state.lifetimeFaith).toBeGreaterThan(250)
    expect(loadState().lifetimeFaith).toBe(result.current.state.lifetimeFaith)
  })
})
