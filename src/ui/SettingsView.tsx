import {
  Card,
  Group,
  SegmentedControl,
  Stack,
  Text,
  useMantineColorScheme,
} from '@mantine/core'

export function SettingsView() {
  // 'auto' follows the device. The value is stored under the key the inline
  // script in index.html reads before first paint, so a choice made here
  // survives a reload without a flash of the other scheme.
  const { colorScheme, setColorScheme } = useMantineColorScheme()

  return (
    <Stack gap="md">
      <Card withBorder padding="sm">
        <Group justify="space-between" align="center" wrap="wrap" gap="xs">
          <div>
            <Text fw={600}>Appearance</Text>
            <Text size="sm" c="dimmed">
              System follows your device.
            </Text>
          </div>
          <SegmentedControl
            value={colorScheme}
            onChange={(value) =>
              setColorScheme(value as 'light' | 'dark' | 'auto')
            }
            data={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'auto', label: 'System' },
            ]}
          />
        </Group>
      </Card>
    </Stack>
  )
}
