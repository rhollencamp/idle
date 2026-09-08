import type { GameState, ResourceKey } from './types'

/**
 * The sim's base resolution.
 *
 * One second is far finer than anything being modelled — the fastest process
 * in the design is starvation at one death a minute — so a smaller step buys
 * no fidelity, only cost. Screen smoothness is not this constant's job: the
 * UI interpolates between steps (`projection.ts`), which is what lets the
 * step be chosen for the simulation rather than for the eye.
 */
export const STEP_MS = 1000

/**
 * Ceiling on the steps one `advanceTo` call will run. Past it the step is
 * coarsened, so an absence of any length resolves in bounded work rather than
 * millions of iterations — a year away costs the same as four days.
 *
 * At the base step this covers four days at full resolution, which measures
 * around 10ms today and well under a frame's worth of budget even with the
 * sim several times fatter than it is now. Beyond four days the bucket widens
 * and the result drifts from what the same span watched live would produce,
 * once the loop is nonlinear. That only matters near a threshold — a village
 * at equilibrium resolves the same at any bucket width — so the number to
 * revisit this against is the measured coarse-vs-fine divergence, not the
 * clock.
 */
export const MAX_STEPS_PER_ADVANCE = 345_600

const RESOURCE_KEYS: readonly ResourceKey[] = ['food', 'wood', 'stone']

/**
 * Advances a mutable draft by one step. Every sim rule belongs here — the
 * loop around it only decides how many steps to run and how wide they are.
 */
function simulateStep(draft: GameState, dtSeconds: number): void {
  for (const key of RESOURCE_KEYS) {
    const resource = draft.resources[key]
    resource.amount += resource.perSecond * dtSeconds
  }

  const earnedFaith = draft.faith.perSecond * dtSeconds
  draft.faith.amount += earnedFaith
  draft.lifetimeFaith += earnedFaith

  draft.step += 1
}

/**
 * A private copy the step loop may mutate freely. Cloning once and mutating
 * beats a fresh object per step when a catch-up runs tens of thousands of
 * them; callers still only ever see a new object.
 */
function draftFrom(state: GameState): GameState {
  return {
    ...state,
    resources: {
      food: { ...state.resources.food },
      wood: { ...state.resources.wood },
      stone: { ...state.resources.stone },
    },
    faith: { ...state.faith },
  }
}

/**
 * Advances `state` to `now` by simulating whole fixed steps.
 *
 * Only whole steps are simulated and `lastTick` moves by exactly the time
 * consumed, so the result depends on the elapsed time alone and not on how it
 * was divided into calls: one hour in a single call, in sixty calls, or in
 * thirty-six hundred is the same state either way.
 */
export function advanceTo(state: GameState, now: number): GameState {
  const elapsedMs = now - state.lastTick
  if (elapsedMs < STEP_MS) return state

  let stepMs = STEP_MS
  let steps = Math.floor(elapsedMs / stepMs)
  if (steps > MAX_STEPS_PER_ADVANCE) {
    steps = MAX_STEPS_PER_ADVANCE
    // Floor keeps the covered span inside the elapsed time; whatever rounding
    // leaves behind is picked up by the next call.
    stepMs = Math.floor(elapsedMs / steps)
  }

  const draft = draftFrom(state)
  const dtSeconds = stepMs / 1000
  for (let i = 0; i < steps; i += 1) {
    simulateStep(draft, dtSeconds)
  }
  draft.lastTick = state.lastTick + steps * stepMs

  return draft
}
