import { Button, Divider, Group, Modal, Stack, Text } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { formatDuration } from '../game/summary'
import type { AwaySummary } from '../game/summary'
import type { ResourceKey } from '../game/types'

const RESOURCE_LABELS: Record<ResourceKey, string> = {
  food: 'Food',
  wood: 'Wood',
  stone: 'Stone',
}

/** A signed figure, so a pātaka that drained reads as one. */
function signed(value: number, digits = 0): string {
  // Rounded before its sign is read, so a change that displays as nothing is
  // not shown as "-0.0" on the strength of a float's last bit.
  const rounded = Number(value.toFixed(digits)) || 0

  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(digits)}`
}

function Line({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color?: string
}) {
  return (
    <Group justify="space-between" align="baseline" wrap="nowrap">
      <Text size="sm">{label}</Text>
      <Text ff="monospace" c={color}>
        {value}
      </Text>
    </Group>
  )
}

/**
 * What the pā did while nobody was watching.
 *
 * A modal rather than a drawer on purpose: this is read once and dismissed,
 * and it wants the screen to itself for the moment it is up. The Chronicle's
 * scrollable history (step 13) is the piece that will want a drawer, opened
 * from the nav whenever the player feels like it.
 */
export function ReturnSummary({
  summary,
  onDismiss,
}: {
  summary: AwaySummary | null
  onDismiss: () => void
}) {
  const fullScreen = useMediaQuery('(max-width: 36em)')

  return (
    <Modal
      opened={summary !== null}
      onClose={onDismiss}
      title="While you were away"
      centered
      fullScreen={fullScreen}
      withCloseButton={false}
    >
      {summary && (
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            You were gone about {formatDuration(summary.awayMs)}.
          </Text>

          <Divider />

          <Stack gap={4}>
            {/* Births and deaths get a line each even at zero: "none died" is
                news on a night that buried four, and a line that appears only
                sometimes makes the two nights harder to tell apart. */}
            <Line
              label="Born"
              value={summary.births === 0 ? 'none' : signed(summary.births)}
            />
            <Line
              label="Died"
              value={summary.deaths === 0 ? 'none' : `-${summary.deaths}`}
              color={summary.deaths > 0 ? 'red' : undefined}
            />
            <Line label="Villagers" value={`${summary.population}`} />
            <Line label="Devotion earned" value={signed(summary.devotion, 1)} />
            {(Object.keys(RESOURCE_LABELS) as ResourceKey[]).map((key) => (
              <Line
                key={key}
                label={RESOURCE_LABELS[key]}
                value={signed(summary.resources[key], 1)}
                color={summary.resources[key] < 0 ? 'red' : undefined}
              />
            ))}
          </Stack>

          <Text size="sm" c={summary.starving ? 'red' : 'dimmed'}>
            {summary.starving
              ? 'The pātaka is empty and your people are dying. They need you.'
              : summary.deaths > 0
                ? 'The pā went hungry in your absence, but it holds.'
                : 'The pā kept to its standing orders.'}
          </Text>

          <Button onClick={onDismiss} mt="xs" fullWidth>
            Get back to it
          </Button>
        </Stack>
      )}
    </Modal>
  )
}
