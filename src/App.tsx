import { useState } from 'react'
import {
  ActionIcon,
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
import { projectAmount, projectFood, projectedGain } from './game/projection'
import {
  BIRTH_FOOD_COST,
  FOOD_CAP,
  JOB_KEYS,
  JOB_YIELD,
  POPULATION_CAP,
  canFeedAnother,
  devotionPerSecond,
  foodUpkeepPerSecond,
  gatherRates,
  netFoodPerSecond,
  unassignedCount,
} from './game/village'
import type { JobKey, ResourceKey } from './game/types'
import { useRenderClock } from './useRenderClock'
import { theme } from './theme'

const RESOURCE_LABELS: Record<ResourceKey, string> = {
  food: 'Food',
  wood: 'Wood',
  stone: 'Stone',
}

const JOB_NAMES: Record<JobKey, string> = {
  gardener: 'Gardeners',
  woodcutter: 'Woodcutters',
  quarrier: 'Quarriers',
  toa: 'Toa',
  tohunga: 'Tohunga',
}

function App() {
  const { state, assignVillager, resetGame } = useGameLoop()
  const [confirmingReset, setConfirmingReset] = useState(false)
  // The sim advances in whole seconds; this fills in the fraction between
  // steps so the numbers glide instead of stepping.
  const now = useRenderClock()

  const rates = gatherRates(state)
  const devotionRate = devotionPerSecond(state)
  const devotion = projectAmount(
    state.devotion,
    devotionRate,
    state.lastTick,
    now,
  )
  const mana = state.mana + projectedGain(devotionRate, state.lastTick, now)
  // Whole points once there are enough to count; a decimal before that, so a
  // pā that has just started earning does not read as having earned nothing.
  const manaLabel = mana < 10 ? mana.toFixed(1) : mana.toFixed(0)

  /** What a job is contributing right now — the number the choice turns on. */
  const jobOutput = (job: JobKey): string => {
    if (job === 'toa') return 'Holds the wall. Eats more than the rest.'

    const perSecond =
      job === 'tohunga' ? devotionRate : rates[JOB_YIELD[job]!.resource]
    const label =
      job === 'tohunga' ? 'Devotion' : RESOURCE_LABELS[JOB_YIELD[job]!.resource]

    return `${label} +${perSecond.toFixed(2)}/s`
  }

  const food = projectFood(state, now)
  // Rounded before its sign is read, so a rate that displays as zero is not
  // shown as a red "-0.00/s" on the strength of a float's last bit.
  const netFood = Number(netFoodPerSecond(state).toFixed(2)) || 0
  const idle = unassignedCount(state)
  const starving = state.starvation > 0
  const hasHousing = state.population < POPULATION_CAP
  // Growing needs somewhere to put the newcomer and the food to keep feeding
  // them, which is the same pair of questions the sim asks before a birth.
  const canGrow = hasHousing && canFeedAnother(state)
  // What the pā is working toward: another villager when one is coming, and
  // otherwise a fuller pātaka.
  const villageProgress = canGrow
    ? (Math.min(food, BIRTH_FOOD_COST) / BIRTH_FOOD_COST) * 100
    : (food / FOOD_CAP) * 100

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
              Mate Atua
            </Title>
            <Text size="sm" c="dimmed">
              The sea is taking back what it lost. Your pā stands in its way.
            </Text>
          </Container>
        </header>

        <Container component="main" size="sm" py="lg" flex={1} w="100%">
          <Stack gap="md">
            <Card withBorder padding={0}>
              <Text fw={600} p="sm">
                Devotion
              </Text>
              <Divider />
              <Stack gap="xs" p="sm">
                <Group justify="space-between" align="baseline" wrap="nowrap">
                  <Text size="xl" ff="monospace">
                    {devotion.toFixed(1)}
                  </Text>
                  <Badge ff="monospace">+{devotionRate.toFixed(2)}/s</Badge>
                </Group>
                <Progress.Root>
                  <Progress.Section
                    value={(devotion % 1) * 100}
                    aria-label="Devotion toward the next point"
                  />
                </Progress.Root>
                <Text size="sm" c="dimmed">
                  {devotionRate > 0
                    ? `${manaLabel} mana — the standing of your pā`
                    : 'No one keeps the karakia. Put a villager to the shrine.'}
                </Text>
              </Stack>
            </Card>

            <Card withBorder padding={0}>
              <Group justify="space-between" align="center" p="sm">
                <Text fw={600}>The Pā</Text>
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
                        : 'How full the pātaka is'
                    }
                  />
                </Progress.Root>
                <Text size="sm" c="dimmed">
                  {starving
                    ? 'The pātaka is empty. Your people are dying.'
                    : canGrow
                      ? `${BIRTH_FOOD_COST} food feeds a newborn.`
                      : hasHousing
                        ? 'They gather too little to feed another mouth.'
                        : 'Every house is full.'}
                </Text>
                <Text size="sm" c="dimmed">
                  They eat {foodUpkeepPerSecond(state).toFixed(2)}/s between
                  them.
                </Text>
              </Stack>
            </Card>

            <Card withBorder padding={0}>
              <Group justify="space-between" align="center" p="sm">
                <Text fw={600}>Work</Text>
                {idle > 0 && (
                  <Badge color="yellow" variant="light">
                    {idle} unassigned
                  </Badge>
                )}
              </Group>
              {JOB_KEYS.map((job) => {
                const count = state.jobs[job]
                const name = JOB_NAMES[job]

                return (
                  <div key={job}>
                    <Divider />
                    <Group
                      justify="space-between"
                      align="center"
                      p="sm"
                      wrap="nowrap"
                    >
                      <div>
                        <Text fw={600}>{name}</Text>
                        <Text size="sm" c="dimmed">
                          {jobOutput(job)}
                        </Text>
                      </div>
                      <Group gap="xs" wrap="nowrap">
                        <ActionIcon
                          variant="default"
                          radius="xl"
                          disabled={count === 0}
                          onClick={() => assignVillager(job, -1)}
                          aria-label={`Take a villager off ${name}`}
                        >
                          −
                        </ActionIcon>
                        <Text ff="monospace" w={24} ta="center">
                          {count}
                        </Text>
                        <ActionIcon
                          variant="default"
                          radius="xl"
                          disabled={idle === 0}
                          onClick={() => assignVillager(job, 1)}
                          aria-label={`Put a villager to ${name}`}
                        >
                          +
                        </ActionIcon>
                      </Group>
                    </Group>
                  </div>
                )
              })}
              <Divider />
              <Text size="sm" c="dimmed" p="sm">
                {idle > 0
                  ? 'Unassigned villagers eat and do nothing. Put them to work.'
                  : 'Take someone off a job to free them for another.'}
              </Text>
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
                      aria-label="Food stored, as a share of the pātaka"
                    />
                  </Progress.Root>
                  <Badge ff="monospace" color={netFood < 0 ? 'red' : undefined}>
                    {netFood >= 0 ? '+' : ''}
                    {netFood.toFixed(2)}/s
                  </Badge>
                </Group>
              </Stack>

              {(['wood', 'stone'] as const).map((key) => {
                const amount = projectAmount(
                  state.resources[key],
                  rates[key],
                  state.lastTick,
                  now,
                )

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
                            value={(amount % 1) * 100}
                            aria-label={`${RESOURCE_LABELS[key]} progress toward the next unit`}
                          />
                        </Progress.Root>
                        <Badge ff="monospace">+{rates[key].toFixed(2)}/s</Badge>
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
