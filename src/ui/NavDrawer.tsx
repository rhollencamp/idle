import {
  Anchor,
  Divider,
  Drawer,
  Group,
  NavLink,
  Stack,
  Text,
} from '@mantine/core'
import { GIT_SHA, REPO_URL } from '../buildInfo'
import { GitHubIcon } from './GitHubIcon'
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
      styles={{
        header: { paddingInline: 'var(--mantine-spacing-md)' },
        // Mantine's drawer content is a plain scroll box, so the column that
        // lets the footer sit at the bottom rather than under the last link
        // has to be declared here — on the content, with the body as the part
        // that grows.
        content: { display: 'flex', flexDirection: 'column' },
        body: { flex: 1, display: 'flex', flexDirection: 'column' },
      }}
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
              description="Click to restart and install"
              onClick={onUpdate}
            />
          </>
        )}
      </Stack>

      <Group mt="auto" p="md" gap="xs" wrap="nowrap" c="dimmed">
        <Anchor
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          aria-label="Source on GitHub"
          title="Source on GitHub"
          display="flex"
        >
          <GitHubIcon />
        </Anchor>

        {/* The build's commit, so a bug report can name what was running. It
            is the only version this app has — `package.json`'s is a
            placeholder. Plain text: it identifies the build, it is not
            somewhere to go. */}
        <Text size="xs" ff="monospace" title="The commit this build came from">
          {GIT_SHA}
        </Text>
      </Group>
    </Drawer>
  )
}
