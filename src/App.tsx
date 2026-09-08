import { useState } from 'react'
import { useGameLoop } from './game/useGameLoop'
import type { ResourceKey } from './game/types'

const RESOURCE_LABELS: Record<ResourceKey, string> = {
  food: 'Food',
  wood: 'Wood',
  stone: 'Stone',
}

function App() {
  const { state, resetGame } = useGameLoop()
  const [confirmingReset, setConfirmingReset] = useState(false)

  const resources = Object.entries(state.resources) as [
    ResourceKey,
    (typeof state.resources)[ResourceKey],
  ][]

  // Fill the bar with progress toward the next whole unit, so an idle screen
  // still visibly ticks.
  const faithProgress = (state.faith.amount % 1) * 100

  const handleReset = () => {
    resetGame()
    setConfirmingReset(false)
  }

  return (
    <div className="d-flex flex-column min-vh-100-svh">
      <header className="app-header bg-body-tertiary border-bottom">
        <div className="container-sm py-3 text-center">
          <h1 className="h4 mb-1">Island God</h1>
          <p className="text-body-secondary small mb-0">
            A tribe lives on your island. They are waiting to hear from you.
          </p>
        </div>
      </header>

      <main className="container-sm flex-grow-1 py-4 d-flex flex-column gap-3">
        <div className="card shadow-sm">
          <div className="card-header fw-semibold">Faith</div>
          <div className="card-body">
            <div className="d-flex align-items-baseline justify-content-between">
              <span className="fs-4 font-monospace">
                {state.faith.amount.toFixed(1)}
              </span>
              <span className="badge text-bg-secondary font-monospace">
                +{state.faith.perSecond.toFixed(1)}/s
              </span>
            </div>
            <div
              className="progress mt-2"
              role="progressbar"
              aria-label="Faith progress toward the next point"
              aria-valuenow={Math.floor(faithProgress)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="progress-bar"
                style={{ width: `${faithProgress}%` }}
              />
            </div>
            <p className="text-body-secondary small mb-0 mt-2">
              {state.lifetimeFaith.toFixed(0)} faith earned in all
            </p>
          </div>
        </div>

        <div className="card shadow-sm">
          <div className="card-header fw-semibold">Village</div>
          <div className="card-body d-flex align-items-baseline justify-content-between">
            <span>Villagers</span>
            <span className="fs-5 font-monospace">{state.population}</span>
          </div>
        </div>

        <div className="card shadow-sm">
          <div className="card-header fw-semibold">Stores</div>
          <ul className="list-group list-group-flush">
            {resources.map(([key, resource]) => {
              const progress = (resource.amount % 1) * 100

              return (
                <li key={key} className="list-group-item">
                  <div className="d-flex align-items-baseline justify-content-between">
                    <span className="fw-semibold">{RESOURCE_LABELS[key]}</span>
                    <span className="font-monospace">
                      {resource.amount.toFixed(1)}
                    </span>
                  </div>
                  <div className="d-flex align-items-center gap-2 mt-2">
                    <div
                      className="progress flex-grow-1"
                      role="progressbar"
                      aria-label={`${RESOURCE_LABELS[key]} progress toward the next unit`}
                      aria-valuenow={Math.floor(progress)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="progress-bar"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="badge text-bg-secondary font-monospace">
                      +{resource.perSecond.toFixed(1)}/s
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </main>

      <footer className="app-footer container-sm text-center pb-4">
        {confirmingReset ? (
          <div className="d-inline-flex align-items-center gap-2">
            <span className="text-body-secondary small">Wipe your save?</span>
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={handleReset}
            >
              Reset
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setConfirmingReset(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setConfirmingReset(true)}
          >
            Reset save
          </button>
        )}
      </footer>
    </div>
  )
}

export default App
