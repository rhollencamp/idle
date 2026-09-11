import { Button, Divider, Group, Modal, Stack, Text } from '@mantine/core'
import { formatDuration } from '../game/summary'
import type { AwaySummary } from '../game/summary'
import type { ResourceKey } from '../game/types'

const RESOURCE_LABELS: Record<ResourceKey, string> = {
  food: 'Food',
  wood: 'Wood',
  stone: 'Stone',
}

/**
 * A signed whole figure, so a pātaka that drained reads as one.
 *
 * Whole numbers throughout: this is an account of a night, not a readout, and
 * the tenth of a unit that matters on a live rate badge is noise in a figure
 * measured in thousands. Rounded before its sign is read, so a change that
 * comes to nothing is not shown as "-0".
 */
function signed(value: number): string {
  const rounded = Math.round(value) || 0

  return `${rounded > 0 ? '+' : ''}${rounded}`
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
  return (
    <Modal
      opened={summary !== null}
      onClose={onDismiss}
      title="While you were away"
      centered
      withCloseButton={false}
      // Never full-bleed, however small the screen: the report is short, and
      // the margin is what lets the shore show around it. A single offset
      // covers both edges, so each takes the larger of the two insets — on a
      // notched phone that keeps the dialog clear of the status bar and the
      // home indicator alike, and on everything else it is the plain default.
      yOffset="max(5dvh, env(safe-area-inset-top), env(safe-area-inset-bottom))"
      xOffset="max(5vw, env(safe-area-inset-left), env(safe-area-inset-right))"
      // The pā is hidden behind this (`App` renders the report alone), so the
      // overlay only has to hold the dialog off the photograph, not dim a
      // screen full of cards.
      overlayProps={{ backgroundOpacity: 0.2 }}
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
            <Line label="Devotion earned" value={signed(summary.devotion)} />
            {(Object.keys(RESOURCE_LABELS) as ResourceKey[]).map((key) => (
              <Line
                key={key}
                label={RESOURCE_LABELS[key]}
                value={signed(summary.resources[key])}
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
