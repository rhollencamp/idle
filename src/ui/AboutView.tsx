import { Anchor, Card, Divider, List, Stack, Text } from '@mantine/core'

interface Credit {
  name: string
  href: string
  role: string
}

const CREDITS: Credit[] = [
  { name: 'React', href: 'https://react.dev', role: 'UI runtime' },
  {
    name: 'Mantine',
    href: 'https://mantine.dev',
    role: 'components and theming',
  },
  { name: 'Vite', href: 'https://vite.dev', role: 'build tooling' },
  {
    name: 'vite-plugin-pwa',
    href: 'https://vite-pwa-org.netlify.app',
    role: 'offline support and the installable app',
  },
]

export function AboutView() {
  return (
    <Stack gap="md">
      <Card withBorder padding="sm">
        <Text fw={600}>Mate Atua</Text>
        <Text size="sm" c="dimmed" mt={4}>
          An idle game. Your pā holds the shore against what the sea is sending
          up the beach: grow the village, arm it, and keep the old rites. It
          keeps running while the tab is closed.
        </Text>
      </Card>

      <Card withBorder padding="sm">
        <Text fw={600}>Te reo Māori</Text>
        <Text size="sm" c="dimmed" mt={4}>
          The setting draws on Māori cosmology, and only on what is widely
          published — nothing iwi-specific, and no invented karakia. The great
          atua are the weather this story happens in, never enemies or content.
          The kaitiaki the game is built around is fictional and specific to it,
          so that no real atua is turned into a stat block. Any mistakes here
          are ours, and worth telling us about.
        </Text>
      </Card>

      <Card withBorder padding={0}>
        <Text fw={600} p="sm">
          Built with
        </Text>
        <Divider />
        <List spacing="xs" p="sm" listStyleType="none">
          {CREDITS.map((credit) => (
            <List.Item key={credit.name}>
              <Anchor href={credit.href} target="_blank" rel="noreferrer">
                {credit.name}
              </Anchor>
              <Text span size="sm" c="dimmed">
                {' '}
                — {credit.role}
              </Text>
            </List.Item>
          ))}
        </List>
      </Card>
    </Stack>
  )
}
