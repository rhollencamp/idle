import { useEffect, useState } from 'react'
import { createInitialState } from './initialState'
import { clearSave, loadState, saveState } from './save'
import { advanceTo } from './tick'
import { unassignedCount } from './village'
import type { GameState, JobKey } from './types'

const TICK_MS = 250
const AUTOSAVE_MS = 5000

export function useGameLoop() {
  const [state, setState] = useState<GameState>(() =>
    advanceTo(loadState(), Date.now()),
  )

  useEffect(() => {
    const saveCurrentState = () => {
      setState((prev) => {
        saveState(prev)
        return prev
      })
    }

    const tickInterval = setInterval(() => {
      setState((prev) => advanceTo(prev, Date.now()))
    }, TICK_MS)

    const autosaveInterval = setInterval(saveCurrentState, AUTOSAVE_MS)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') saveCurrentState()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', handleVisibilityChange)

    return () => {
      clearInterval(tickInterval)
      clearInterval(autosaveInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', handleVisibilityChange)
      saveCurrentState()
    }
  }, [])

  /**
   * Moves one villager into a job (`delta` of 1) or out of it (-1).
   *
   * Villagers only ever move between a job and the unassigned pool, never
   * directly between two jobs: taking someone off the wall to garden is two
   * decisions, and doing it in one step would mean silently choosing whose
   * job to empty. A move that the pā cannot cover is refused rather than
   * clamped, so the sheet can never claim workers it does not have.
   */
  const assignVillager = (job: JobKey, delta: number) => {
    setState((prev) => {
      const next = prev.jobs[job] + delta
      if (next < 0) return prev
      if (delta > 0 && unassignedCount(prev) < delta) return prev

      return { ...prev, jobs: { ...prev.jobs, [job]: next } }
    })
  }

  const resetGame = () => {
    clearSave()
    const fresh = createInitialState()
    setState(fresh)
  }

  return { state, assignVillager, resetGame }
}
