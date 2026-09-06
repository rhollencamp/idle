import { createInitialState } from './initialState'
import type { GameState } from './types'

const SAVE_KEY = 'castaway-idle:save:v1'

export function loadState(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return createInitialState()

    const parsed = JSON.parse(raw) as Partial<GameState>
    if (!parsed.resources || typeof parsed.lastTick !== 'number') {
      return createInitialState()
    }

    return parsed as GameState
  } catch {
    return createInitialState()
  }
}

export function saveState(state: GameState): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state))
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY)
}
