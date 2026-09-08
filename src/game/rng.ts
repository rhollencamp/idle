/**
 * Deterministic randomness for the sim.
 *
 * Every draw is a pure function of `(seed, step, stream)`, so a save advanced
 * across the same steps always produces the same numbers no matter how the
 * elapsed time was chopped up — one long offline catch-up and a session spent
 * watching the tab agree. That is why nothing under `src/game/` may call
 * `Math.random`: a single unseeded draw makes an absence unreproducible and
 * costs us the ability to test it.
 *
 * `stream` names an independent sequence, so adding a system that draws
 * randomly (events, prayers) cannot shift the numbers another system sees.
 */

/** splitmix32's finalizer — avalanches a 32-bit integer into a uniform one. */
function mix32(value: number): number {
  let x = value >>> 0
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad) >>> 0
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97) >>> 0
  return (x ^ (x >>> 15)) >>> 0
}

/** FNV-1a, so streams can be named rather than numbered. */
function hashStream(stream: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < stream.length; i += 1) {
    hash = Math.imul(hash ^ stream.charCodeAt(i), 0x01000193) >>> 0
  }
  return hash
}

/**
 * Derives a save's seed from whatever entropy the caller has (in practice the
 * creation timestamp). Kept here so `Math.random` stays out of the engine.
 */
export function makeSeed(entropy: number): number {
  return mix32(entropy >>> 0) ^ mix32(Math.floor(entropy / 0x100000000) >>> 0)
}

/**
 * A generator of uniform numbers in [0, 1) for one step of one stream.
 *
 * Callers get a fresh generator per step rather than a long-lived one, so no
 * RNG cursor has to be stored in the save or kept in sync across a catch-up.
 */
export function createRng(
  seed: number,
  step: number,
  stream: string,
): () => number {
  let state =
    (mix32(seed ^ hashStream(stream)) + Math.imul(step, 0x9e3779b9)) >>> 0

  return () => {
    state = (state + 0x9e3779b9) >>> 0
    return mix32(state) / 0x100000000
  }
}
