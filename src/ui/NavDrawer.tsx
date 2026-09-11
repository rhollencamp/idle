import { Divider, Drawer, NavLink, Stack } from '@mantine/core'
import { VIEWS, type View } from './navigation'

interface NavDrawerProps {
  opened: boolean
  view: View
  onSelect: (view: View) => void
  onClose: () => void
  /** Whether a new version is installed and waiting to take over. */
  updateReady?: boolean
  onUpdate?: () => void
}

export function NavDrawer({
  opened,
  view,
  onSelect,
  onClose,
  updateReady = false,
  onUpdate,
}: NavDrawerProps) {
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

        {/* Only present while a new version waits, below the views it is not
            one of: this reloads the app rather than switching screens. */}
        {updateReady && (
          <>
            <Divider my="xs" />
            <NavLink
              component="button"
              label="Update available"
              description="Restart to install"
              onClick={onUpdate}
            />
          </>
        )}
      </Stack>
    </Drawer>
  )
}
