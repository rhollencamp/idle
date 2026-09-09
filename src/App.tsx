import { useState } from 'react'
import { Container, MantineProvider } from '@mantine/core'
import { useGameLoop } from './game/useGameLoop'
import { AppHeader } from './ui/AppHeader'
import { NavDrawer } from './ui/NavDrawer'
import { AboutView } from './ui/AboutView'
import { SaveView } from './ui/SaveView'
import { SettingsView } from './ui/SettingsView'
import { VillageView } from './ui/VillageView'
import { viewTitle, type View } from './ui/navigation'
import { theme } from './theme'

function App() {
  const { state, resetGame, importGame } = useGameLoop()
  const [view, setView] = useState<View>('village')
  const [menuOpened, setMenuOpened] = useState(false)

  const openView = (next: View) => {
    setView(next)
    setMenuOpened(false)
  }

  return (
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <div className="app-shell">
        <AppHeader
          title={viewTitle(view)}
          menuOpened={menuOpened}
          onToggleMenu={() => setMenuOpened((opened) => !opened)}
        />

        <NavDrawer
          opened={menuOpened}
          view={view}
          onSelect={openView}
          onClose={() => setMenuOpened(false)}
        />

        <Container component="main" size="sm" py="lg" flex={1} w="100%">
          {view === 'village' && <VillageView state={state} />}
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
