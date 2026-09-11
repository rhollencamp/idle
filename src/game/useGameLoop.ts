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
   * Gives one untrained villager a trade, for good.
   *
   * There is no way back: a villager who has learned a trade keeps it, so
   * this only ever moves someone out of the untrained pool and never between
   * two trades. Retraining is a thing the pā may learn to do later; until
   * then, the composition of the village is the record of every choice made
   * at every birth. A call with nobody left to train is refused rather than
   * clamped, so the sheet can never claim villagers that do not exist.
   */
  const trainVillager = (job: JobKey) => {
    setState((prev) => {
      if (unassignedCount(prev) < 1) return prev

      return { ...prev, jobs: { ...prev.jobs, [job]: prev.jobs[job] + 1 } }
    })
  }

  const resetGame = () => {
    clearSave()
    const fresh = createInitialState()
    setState(fresh)
  }

  // An imported save is caught up to now the same way a loaded one is, so a
  // file written days ago pays its offline progress on the way in. Written
  // straight away rather than waiting for the next autosave, so a reload
  // cannot land back on the save that was just replaced.
  const importGame = (next: GameState) => {
    const caughtUp = advanceTo(next, Date.now())
    saveState(caughtUp)
    setState(caughtUp)
  }

  return { state, trainVillager, resetGame, importGame }
}
