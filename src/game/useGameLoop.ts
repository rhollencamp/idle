import { useEffect, useRef, useState } from 'react'
import { createInitialState } from './initialState'
import { clearSave, loadState, saveState } from './save'
import { advanceTo } from './tick'
import type { GameState } from './types'

const TICK_MS = 250
const AUTOSAVE_MS = 5000

export function useGameLoop() {
  const [state, setState] = useState<GameState>(() => advanceTo(loadState(), Date.now()))
  const stateRef = useRef(state)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    const tickInterval = setInterval(() => {
      setState((prev) => advanceTo(prev, Date.now()))
    }, TICK_MS)

    const autosaveInterval = setInterval(() => {
      saveState(stateRef.current)
    }, AUTOSAVE_MS)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveState(stateRef.current)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', handleVisibilityChange)

    return () => {
      clearInterval(tickInterval)
      clearInterval(autosaveInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', handleVisibilityChange)
      saveState(stateRef.current)
    }
  }, [])

  const resetGame = () => {
    clearSave()
    const fresh = createInitialState()
    setState(fresh)
  }

  return { state, resetGame }
}
