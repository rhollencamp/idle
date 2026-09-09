import { useState } from 'react'
import { Container, MantineProvider } from '@mantine/core'
import { useGameLoop } from './game/useGameLoop'
import { AppHeader } from './ui/AppHeader'
import { NavDrawer } from './ui/NavDrawer'
import { ReturnSummary } from './ui/ReturnSummary'
import { AboutView } from './ui/AboutView'
import { SaveView } from './ui/SaveView'
import { SettingsView } from './ui/SettingsView'
import { VillageView } from './ui/VillageView'
import { viewTitle, type View } from './ui/navigation'
import { applyPwaUpdate } from './pwaUpdate'
import { usePwaUpdate } from './usePwaUpdate'
import { theme } from './theme'

function App() {
  const {
    state,
    summary,
    trainVillager,
    dismissSummary,
    resetGame,
    importGame,
  } = useGameLoop()
  const [view, setView] = useState<View>('village')
  const [menuOpened, setMenuOpened] = useState(false)
  const updateReady = usePwaUpdate()

  const openView = (next: View) => {
    setView(next)
    setMenuOpened(false)
  }

  return (
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <ReturnSummary summary={summary} onDismiss={dismissSummary} />

      <div className="app-shell">
        {/* A photograph of wet sand, fixed behind the scrolling cards. Purely
            decorative, so it is hidden from assistive technology. */}
        <div className="app-backdrop" aria-hidden="true" />

        <AppHeader
          title={viewTitle(view)}
          menuOpened={menuOpened}
          onToggleMenu={() => setMenuOpened((opened) => !opened)}
          menuAttention={updateReady}
        />

        <NavDrawer
          opened={menuOpened}
          view={view}
          onSelect={openView}
          onClose={() => setMenuOpened(false)}
          updateReady={updateReady}
          onUpdate={() => {
            setMenuOpened(false)
            void applyPwaUpdate()
          }}
        />

        <Container
          component="main"
          className="app-main"
          size="sm"
          py="lg"
          flex={1}
          w="100%"
        >
          {view === 'village' && (
            <VillageView state={state} onTrain={trainVillager} />
          )}
          {view === 'settings' && <SettingsView />}
          {view === 'save' && (
            <SaveView state={state} onImport={importGame} onReset={resetGame} />
          )}
          {view === 'about' && <AboutView />}
        </Container>

        <div className="app-safe-bottom" />
      </div>
    </MantineProvider>
  )
}

export default App
