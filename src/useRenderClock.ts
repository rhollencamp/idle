import { useEffect, useState } from 'react'

/**
 * A clock that advances once per animation frame, for interpolating the
 * display between simulated steps.
 *
 * Deliberately separate from the simulation's own interval: how often the
 * screen updates and how often the model advances are different questions,
 * and tying them together is what forces a needlessly small sim step. The
 * browser pauses animation frames for a hidden tab, so this costs nothing in
 * the background.
 */
export function useRenderClock(): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let frame = requestAnimationFrame(function tick() {
      setNow(Date.now())
      frame = requestAnimationFrame(tick)
    })

    return () => cancelAnimationFrame(frame)
  }, [])

  return now
}
