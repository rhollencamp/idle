import { describe, expect, it } from 'vitest'
import { MAX_PROJECTION_MS, projectAmount, projectedGain } from './projection'

const resource = { amount: 10, perSecond: 2 }

describe('projectAmount', () => {
  it('adds the accrual earned since the last simulated step', () => {
    expect(projectAmount(resource, 1000, 1500)).toBe(11)
  })

  it('shows the simulated amount exactly at a step boundary', () => {
    expect(projectAmount(resource, 1000, 1000)).toBe(10)
  })

  it('never runs backwards when the clock is behind lastTick', () => {
    expect(projectAmount(resource, 1000, 900)).toBe(10)
  })

  it('caps how far ahead it will guess', () => {
    const capped = projectAmount(resource, 0, MAX_PROJECTION_MS * 10)

    expect(capped).toBe(10 + (2 * MAX_PROJECTION_MS) / 1000)
  })
})

describe('projectedGain', () => {
  it('matches the delta projectAmount applies', () => {
    expect(projectedGain(2, 1000, 1500) + resource.amount).toBe(
      projectAmount(resource, 1000, 1500),
    )
  })
})
