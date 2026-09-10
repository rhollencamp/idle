import { Drawer, NavLink, Stack } from '@mantine/core'
import { VIEWS, type View } from './navigation'

interface NavDrawerProps {
  opened: boolean
  view: View
  onSelect: (view: View) => void
  onClose: () => void
}

export function NavDrawer({ opened, view, onSelect, onClose }: NavDrawerProps) {
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="left"
      size="16rem"
      title="Mate Atua"
      padding={0}
      // The drawer body carries its own padding on the title row only; the
      // links run full-bleed so their hover state reaches the edges.
      styles={{ header: { paddingInline: 'var(--mantine-spacing-md)' } }}
    >
      <Stack gap={0}>
        {VIEWS.map((entry) => (
          <NavLink
            key={entry.key}
            component="button"
            label={entry.label}
            active={entry.key === view}
            onClick={() => onSelect(entry.key)}
          />
        ))}
      </Stack>
    </Drawer>
  )
}
