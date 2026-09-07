import { useEffect, useState } from 'react'
import { createInitialState } from './initialState'
import { clearSave, loadState, saveState } from './save'
import { advanceTo } from './tick'
import type { GameState } from './types'

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

  const resetGame = () => {
    clearSave()
    const fresh = createInitialState()
    setState(fresh)
  }

  return { state, resetGame }
}
