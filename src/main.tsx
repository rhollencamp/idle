import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/app.scss'
import App from './App.tsx'
import { registerPwaUpdates } from './pwaUpdate.ts'

registerPwaUpdates()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
