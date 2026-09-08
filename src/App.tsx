import { useState } from 'react'
import {
  Badge,
  Button,
  Card,
  Container,
  Divider,
  Group,
  MantineProvider,
  Progress,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { useGameLoop } from './game/useGameLoop'
import { projectAmount, projectedGain, projectFood } from './game/projection'
import {
  BIRTH_FOOD_COST,
  FOOD_CAP,
  POPULATION_CAP,
  canFeedAnother,
  foodUpkeepPerSecond,
  netFoodPerSecond,
} from './game/village'
import type { ResourceKey } from './game/types'
import { useRenderClock } from './useRenderClock'
import { theme } from './theme'

const RESOURCE_LABELS: Record<ResourceKey, string> = {
  food: 'Food',
  wood: 'Wood',
  stone: 'Stone',
}

function App() {
  const { state, resetGame } = useGameLoop()
  const [confirmingReset, setConfirmingReset] = useState(false)
  // The sim advances in whole seconds; this fills in the fraction between
  // steps so the numbers glide instead of stepping.
  const now = useRenderClock()

  const gathered = (['wood', 'stone'] as const).map(
    (key) => [key, state.resources[key]] as const,
  )

  const food = projectFood(state, now)
  // Rounded before its sign is read, so a rate that displays as zero is not
  // shown as a red "-0.00/s" on the strength of a float's last bit.
  const netFood = Number(netFoodPerSecond(state).toFixed(2)) || 0
  const starving = state.starvation > 0
  const hasHousing = state.population < POPULATION_CAP
  // Growing needs somewhere to put the newcomer and the food to keep feeding
  // them, which is the same pair of questions the sim asks before a birth.
  const canGrow = hasHousing && canFeedAnother(state)
  // What the village is working toward: another villager when one is coming,
  // and otherwise a fuller granary.
  const villageProgress = canGrow
    ? (Math.min(food, BIRTH_FOOD_COST) / BIRTH_FOOD_COST) * 100
    : (food / FOOD_CAP) * 100

  const faith = projectAmount(state.faith, state.lastTick, now)
  const lifetimeFaith =
    state.lifetimeFaith +
    projectedGain(state.faith.perSecond, state.lastTick, now)

  // Fill the bar with progress toward the next whole unit, so an idle screen
  // still visibly ticks.
  const faithProgress = (faith % 1) * 100

  const handleReset = () => {
    resetGame()
    setConfirmingReset(false)
  }

  return (
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <div className="app-shell">
        <header className="app-header">
          <Container size="sm" py="md" ta="center">
            <Title order={1} size="h4" mb={4}>
              Island God
            </Title>
            <Text size="sm" c="dimmed">
              A tribe lives on your island. They are waiting to hear from you.
            </Text>
          </Container>
        </header>

        <Container component="main" size="sm" py="lg" flex={1} w="100%">
          <Stack gap="md">
            <Card withBorder padding={0}>
              <Text fw={600} p="sm">
                Faith
              </Text>
              <Divider />
              <Stack gap="xs" p="sm">
                <Group justify="space-between" align="baseline" wrap="nowrap">
                  <Text size="xl" ff="monospace">
                    {faith.toFixed(1)}
                  </Text>
                  <Badge ff="monospace">
                    +{state.faith.perSecond.toFixed(1)}/s
                  </Badge>
                </Group>
                <Progress.Root>
                  <Progress.Section
                    value={faithProgress}
                    aria-label="Faith progress toward the next point"
                  />
                </Progress.Root>
                <Text size="sm" c="dimmed">
                  {lifetimeFaith.toFixed(0)} faith earned in all
                </Text>
              </Stack>
            </Card>

            <Card withBorder padding={0}>
              <Group justify="space-between" align="center" p="sm">
                <Text fw={600}>Village</Text>
                {starving && (
                  <Badge color="red" variant="light">
                    Starving
                  </Badge>
                )}
              </Group>
              <Divider />
              <Stack gap="xs" p="sm">
                <Group justify="space-between" align="baseline" wrap="nowrap">
                  <Text>Villagers</Text>
                  <Text size="lg" ff="monospace">
                    {state.population} / {POPULATION_CAP}
                  </Text>
                </Group>
                <Progress.Root>
                  <Progress.Section
                    value={villageProgress}
                    color={starving ? 'red' : undefined}
                    aria-label={
                      canGrow
                        ? 'Food stored toward the next villager'
                        : 'Granary fullness'
                    }
                  />
                </Progress.Root>
                <Text size="sm" c="dimmed">
                  {starving
                    ? 'The granary is empty. Your people are dying.'
                    : canGrow
                      ? `${BIRTH_FOOD_COST} food feeds a newborn.`
                      : hasHousing
                        ? 'They gather too little to feed another mouth.'
                        : 'Every hut is full.'}
                </Text>
                <Text size="sm" c="dimmed">
                  They eat {foodUpkeepPerSecond(state.population).toFixed(2)}
                  /s between them.
                </Text>
              </Stack>
            </Card>

            <Card withBorder padding={0}>
              <Text fw={600} p="sm">
                Stores
              </Text>
              <Divider />
              <Stack gap="xs" p="sm">
                <Group justify="space-between" align="baseline" wrap="nowrap">
                  <Text fw={600}>Food</Text>
                  <Text ff="monospace">
                    {food.toFixed(1)} / {FOOD_CAP}
                  </Text>
                </Group>
                <Group gap="xs" wrap="nowrap">
                  <Progress.Root flex={1}>
                    <Progress.Section
                      value={(food / FOOD_CAP) * 100}
                      color={netFood < 0 ? 'red' : undefined}
                      aria-label="Food stored, as a share of the granary"
                    />
                  </Progress.Root>
                  <Badge ff="monospace" color={netFood < 0 ? 'red' : undefined}>
                    {netFood >= 0 ? '+' : ''}
                    {netFood.toFixed(2)}/s
                  </Badge>
                </Group>
              </Stack>

              {gathered.map(([key, resource]) => {
                const amount = projectAmount(resource, state.lastTick, now)
                const progress = (amount % 1) * 100

                return (
                  <div key={key}>
                    <Divider />
                    <Stack gap="xs" p="sm">
                      <Group
                        justify="space-between"
                        align="baseline"
                        wrap="nowrap"
                      >
                        <Text fw={600}>{RESOURCE_LABELS[key]}</Text>
                        <Text ff="monospace">{amount.toFixed(1)}</Text>
                      </Group>
                      <Group gap="xs" wrap="nowrap">
                        <Progress.Root flex={1}>
                          <Progress.Section
                            value={progress}
                            aria-label={`${RESOURCE_LABELS[key]} progress toward the next unit`}
                          />
                        </Progress.Root>
                        <Badge ff="monospace">
                          +{resource.perSecond.toFixed(1)}/s
                        </Badge>
                      </Group>
                    </Stack>
                  </div>
                )
              })}
            </Card>
          </Stack>
        </Container>

        <footer className="app-footer">
          {confirmingReset ? (
            <Group justify="center" gap="xs">
              <Text size="sm" c="dimmed">
                Wipe your save?
              </Text>
              <Button size="compact-sm" color="red" onClick={handleReset}>
                Reset
              </Button>
              <Button
                size="compact-sm"
                variant="default"
                onClick={() => setConfirmingReset(false)}
              >
                Cancel
              </Button>
            </Group>
          ) : (
            <Button
              size="compact-sm"
              variant="default"
              onClick={() => setConfirmingReset(true)}
            >
              Reset save
            </Button>
          )}
        </footer>
      </div>
    </MantineProvider>
  )
}

export default App
