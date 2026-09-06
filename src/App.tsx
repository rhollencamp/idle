import './App.css'
import { useGameLoop } from './game/useGameLoop'

function App() {
  const { state, resetGame } = useGameLoop()
  const water = state.resources.water

  return (
    <main className="app-shell">
      <h1>Castaway Idle</h1>
      <p>Stranded on an island. Gather what you can.</p>

      <section className="resource">
        <span className="resource-label">Water</span>
        <span className="resource-amount">{water.amount.toFixed(1)}</span>
        <span className="resource-rate">+{water.perSecond.toFixed(1)}/s</span>
      </section>

      <button type="button" className="reset-button" onClick={resetGame}>
        Reset save
      </button>
    </main>
  )
}

export default App
