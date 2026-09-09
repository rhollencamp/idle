import { useEffect, useRef, useState } from 'react'
import { createInitialState } from './initialState'
import { clearSave, loadState, saveState } from './save'
import { resumeFrom, summarizeAbsence } from './summary'
import { advanceTo } from './tick'
import { unassignedCount } from './village'
import type { AwaySummary } from './summary'
import type { GameState, JobKey } from './types'

const TICK_MS = 250
const AUTOSAVE_MS = 5000

/**
 * The state and the pending absence report are held together because they are
 * produced together: the report is the difference between the state that went
 * into a catch-up and the state that came out, and splitting them across two
 * `useState` calls is how the pair drifts out of step.
 */
interface Session {
  state: GameState
  summary: AwaySummary | null
}

export function useGameLoop() {
  const [session, setSession] = useState<Session>(() =>
    resumeFrom(loadState(), Date.now()),
  )
  /**
   * The state as it stood when the tab went away, or `null` while it is on
   * screen. A hidden tab keeps ticking — throttled, but it ticks — so the
   * absence cannot be measured from the state on return alone; this is the
   * other end of the span.
   */
  const departure = useRef<GameState | null>(null)

  /** Applies a change to the live state, leaving any pending report alone. */
  const updateState = (change: (state: GameState) => GameState) => {
    setSession((prev) => {
      const state = change(prev.state)

      return state === prev.state ? prev : { ...prev, state }
    })
  }

  useEffect(() => {
    const saveCurrentState = () => {
      setSession((prev) => {
        saveState(prev.state)
        return prev
      })
    }

    const tickInterval = setInterval(() => {
      // `advanceTo` hands back the same object when no whole step has elapsed,
      // which `updateState` passes through without re-rendering.
      updateState((state) => advanceTo(state, Date.now()))
    }, TICK_MS)

    const autosaveInterval = setInterval(saveCurrentState, AUTOSAVE_MS)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setSession((prev) => {
          saveState(prev.state)
          departure.current = prev.state
          return prev
        })
        return
      }

      const left = departure.current
      if (!left) return
      departure.current = null

      setSession((prev) => {
        const state = advanceTo(prev.state, Date.now())
        // Measured from where the tab left off rather than from `prev.state`:
        // a throttled background tick has already folded most of the absence
        // into the live state, so diffing against it would report a minute of
        // a night away.
        const summary = summarizeAbsence(left, state)

        // A short round trip reports nothing, and must not clear a report the
        // player has not read yet.
        return { state, summary: summary ?? prev.summary }
      })
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    // `pagehide` has no visible counterpart, so it only banks a save: a tab
    // restored from the back/forward cache comes back through
    // `visibilitychange`, which is where the absence gets measured.
    window.addEventListener('pagehide', saveCurrentState)

    return () => {
      clearInterval(tickInterval)
      clearInterval(autosaveInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', saveCurrentState)
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
    updateState((state) => {
      if (unassignedCount(state) < 1) return state

      return { ...state, jobs: { ...state.jobs, [job]: state.jobs[job] + 1 } }
    })
  }

  /** Puts the report away. It is read once and does not come back. */
  const dismissSummary = () => {
    setSession((prev) => (prev.summary ? { ...prev, summary: null } : prev))
  }

  const resetGame = () => {
    clearSave()
    departure.current = null
    setSession({ state: createInitialState(), summary: null })
  }

  // An imported save is caught up to now the same way a loaded one is, so a
  // file written days ago pays its offline progress on the way in. Written
  // straight away rather than waiting for the next autosave, so a reload
  // cannot land back on the save that was just replaced.
  const importGame = (next: GameState) => {
    // Reported as well as paid: an imported save is exactly the case where the
    // player has no idea what the pā has been doing, since they were not the
    // ones who left it running.
    const resumed = resumeFrom(next, Date.now())
    saveState(resumed.state)
    departure.current = null
    setSession(resumed)
  }

  return {
    state: session.state,
    summary: session.summary,
    trainVillager,
    dismissSummary,
    resetGame,
    importGame,
  }
}
