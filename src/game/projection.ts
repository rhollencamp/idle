import { STEP_MS } from './tick'
import type { ResourceState } from './types'

/**
 * How far ahead of the last simulated step a projection may run.
 *
 * Normally the gap is under one step. It can briefly be much larger — a tab
 * that was throttled or asleep renders before the catch-up lands — and
 * without a ceiling the display would flash a wildly inflated number for a
 * frame. Two steps is enough slack for the usual case and small enough that
 * the wrong number is never far wrong.
 */
export const MAX_PROJECTION_MS = 2 * STEP_MS

/**
 * The amount to *show* for a resource between simulated steps.
 *
 * The sim advances in whole steps, so a bar driven straight off `amount`
 * jumps once a step and sits still in between. Projecting the accrual that
 * has been earned but not yet simulated lets the display move continuously
 * without simulating more often than the model needs.
 *
 * This is presentation only — it never feeds back into the sim, and the next
 * step overwrites it with the real figure.
 */
export function projectAmount(
  resource: ResourceState,
  lastTick: number,
  now: number,
): number {
  const aheadMs = Math.min(Math.max(now - lastTick, 0), MAX_PROJECTION_MS)

  return resource.amount + (resource.perSecond * aheadMs) / 1000
}

/** The same projection as a bare delta, for totals that share a rate. */
export function projectedGain(
  perSecond: number,
  lastTick: number,
  now: number,
): number {
  const aheadMs = Math.min(Math.max(now - lastTick, 0), MAX_PROJECTION_MS)

  return (perSecond * aheadMs) / 1000
}
