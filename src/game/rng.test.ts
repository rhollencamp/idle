import { describe, expect, it } from 'vitest'
import { createRng, makeSeed } from './rng'

function draw(rng: () => number, count: number): number[] {
  return Array.from({ length: count }, () => rng())
}

describe('createRng', () => {
  it('is a pure function of seed, step, and stream', () => {
    const first = draw(createRng(1234, 7, 'events'), 5)
    const second = draw(createRng(1234, 7, 'events'), 5)

    expect(second).toEqual(first)
  })

  it('gives independent sequences per step, seed, and stream', () => {
    const base = draw(createRng(1234, 7, 'events'), 5)

    expect(draw(createRng(1234, 8, 'events'), 5)).not.toEqual(base)
    expect(draw(createRng(1235, 7, 'events'), 5)).not.toEqual(base)
    expect(draw(createRng(1234, 7, 'prayers'), 5)).not.toEqual(base)
  })

  it('produces values in [0, 1)', () => {
    for (let step = 0; step < 200; step += 1) {
      for (const value of draw(createRng(99, step, 'events'), 10)) {
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThan(1)
      }
    }
  })

  it('spreads values across the range rather than clustering', () => {
    const buckets = new Array(10).fill(0)
    const rng = createRng(makeSeed(1_700_000_000_000), 0, 'events')
    for (let i = 0; i < 10_000; i += 1) {
      buckets[Math.floor(rng() * 10)] += 1
    }

    for (const count of buckets) {
      expect(count).toBeGreaterThan(700)
      expect(count).toBeLessThan(1300)
    }
  })
})

describe('makeSeed', () => {
  it('is stable for the same entropy', () => {
    expect(makeSeed(1234)).toBe(makeSeed(1234))
  })

  it('separates timestamps a moment apart', () => {
    const now = 1_700_000_000_000
    const seeds = new Set([now, now + 1, now + 2, now + 3].map(makeSeed))

    expect(seeds.size).toBe(4)
  })
})
