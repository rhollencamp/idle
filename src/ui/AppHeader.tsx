import { Burger, Container, Group, Indicator, Title } from '@mantine/core'

interface AppHeaderProps {
  title: string
  menuOpened: boolean
  onToggleMenu: () => void
  /** Draws the attention dot on the burger: something in the menu is waiting. */
  menuAttention?: boolean
}

export function AppHeader({
  title,
  menuOpened,
  onToggleMenu,
  menuAttention = false,
}: AppHeaderProps) {
  return (
    <header className="app-header">
      <Container size="sm" py="xs">
        <Group gap="sm" wrap="nowrap">
          {/* The dot is decorative — the menu item it points at carries the
              wording — so it stays unlabelled. The wrapper must not be
              aria-hidden, or it would take the burger with it. */}
          <Indicator
            disabled={!menuAttention}
            color="red"
            size={8}
            offset={2}
            withBorder
          >
            <Burger
              opened={menuOpened}
              onClick={onToggleMenu}
              size="sm"
              aria-label="Menu"
            />
          </Indicator>
          <Title order={1} size="h5" fw={600}>
            {title}
          </Title>
        </Group>
      </Container>
    </header>
  )
}
