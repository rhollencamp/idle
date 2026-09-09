import { Burger, Container, Group, Title } from '@mantine/core'

interface AppHeaderProps {
  title: string
  menuOpened: boolean
  onToggleMenu: () => void
}

export function AppHeader({ title, menuOpened, onToggleMenu }: AppHeaderProps) {
  return (
    <header className="app-header">
      <Container size="sm" py="xs">
        <Group gap="sm" wrap="nowrap">
          <Burger
            opened={menuOpened}
            onClick={onToggleMenu}
            size="sm"
            aria-label="Menu"
          />
          <Title order={1} size="h5" fw={600}>
            {title}
          </Title>
        </Group>
      </Container>
    </header>
  )
}
