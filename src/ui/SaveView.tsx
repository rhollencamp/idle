import { useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Divider,
  FileButton,
  Group,
  Stack,
  Text,
  Textarea,
} from '@mantine/core'
import { useClipboard } from '@mantine/hooks'
import { parseSave, serializeSave } from '../game/save'
import type { GameState } from '../game/types'

interface SaveViewProps {
  state: GameState
  onImport: (state: GameState) => void
  onReset: () => void
}

type Status = { tone: 'ok' | 'error'; message: string } | null

function saveFilename(now: Date): string {
  return `mate-atua-${now.toISOString().slice(0, 10)}.json`
}

/**
 * The few figures that tell one save from another at a glance, so the confirm
 * step can show what is arriving against what it would replace.
 */
function describeSave(state: GameState): string {
  const villagers = `${state.population} villager${state.population === 1 ? '' : 's'}`
  const faith = `${Math.floor(state.lifetimeFaith)} faith earned`
  const saved = new Date(state.lastTick).toLocaleString()

  return `${villagers}, ${faith} — last played ${saved}`
}

export function SaveView({ state, onImport, onReset }: SaveViewProps) {
  const clipboard = useClipboard({ timeout: 2000 })
  const [pasted, setPasted] = useState('')
  const [status, setStatus] = useState<Status>(null)
  // An import is held here until it is confirmed: it overwrites the village
  // being played, and a mis-picked file should not be able to do that on one
  // click. Holding the parsed state rather than the text also means the file
  // is checked before the player is asked, so a bad file fails as an error
  // instead of as a confirm they would then have to take back.
  const [pending, setPending] = useState<GameState | null>(null)
  const [confirmingReset, setConfirmingReset] = useState(false)

  const download = () => {
    const blob = new Blob([serializeSave(state)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = saveFilename(new Date())
    link.click()
    URL.revokeObjectURL(url)
  }

  const offerImport = (text: string) => {
    const imported = parseSave(text)
    if (!imported) {
      setPending(null)
      setStatus({
        tone: 'error',
        message: 'That is not a save this version of the game can read.',
      })
      return
    }

    setStatus(null)
    setPending(imported)
  }

  const offerImportFile = async (file: File | null) => {
    if (!file) return

    try {
      offerImport(await file.text())
    } catch {
      setPending(null)
      setStatus({ tone: 'error', message: 'That file could not be read.' })
    }
  }

  const confirmImport = () => {
    if (!pending) return

    onImport(pending)
    setPending(null)
    setPasted('')
    setStatus({
      tone: 'ok',
      message: 'Save loaded. Your pā is as you left it.',
    })
  }

  const reset = () => {
    onReset()
    setConfirmingReset(false)
    setStatus({ tone: 'ok', message: 'Wiped. The pā starts again.' })
  }

  return (
    <Stack gap="md">
      {status && (
        <Alert
          color={status.tone === 'ok' ? 'island' : 'red'}
          variant="light"
          withCloseButton
          onClose={() => setStatus(null)}
        >
          {status.message}
        </Alert>
      )}

      <Card withBorder padding="sm">
        <Text fw={600}>Export</Text>
        <Text size="sm" c="dimmed" mt={4}>
          The whole save as a file you can keep or carry to another device.
        </Text>
        <Group gap="xs" mt="sm">
          <Button size="compact-sm" onClick={download}>
            Download
          </Button>
          <Button
            size="compact-sm"
            variant="default"
            onClick={() => clipboard.copy(serializeSave(state))}
          >
            {clipboard.copied ? 'Copied' : 'Copy'}
          </Button>
        </Group>
      </Card>

      <Card withBorder padding="sm">
        <Text fw={600}>Import</Text>
        <Text size="sm" c="dimmed" mt={4}>
          Replaces the village you are playing now. Time passed since the export
          is paid out on the way in, as if you had been away.
        </Text>
        <Group gap="xs" mt="sm">
          <FileButton
            onChange={offerImportFile}
            accept="application/json,.json"
          >
            {(props) => (
              <Button {...props} size="compact-sm">
                Choose file
              </Button>
            )}
          </FileButton>
        </Group>
        <Divider my="sm" label="or paste it" labelPosition="center" />
        <Textarea
          value={pasted}
          onChange={(event) => setPasted(event.currentTarget.value)}
          placeholder="Paste an exported save"
          autosize
          minRows={3}
          maxRows={6}
          styles={{
            input: { fontFamily: 'var(--mantine-font-family-monospace)' },
          }}
        />
        <Group gap="xs" mt="sm">
          <Button
            size="compact-sm"
            variant="default"
            disabled={pasted.trim().length === 0}
            onClick={() => offerImport(pasted)}
          >
            Load pasted save
          </Button>
        </Group>

        {pending && (
          <Alert
            color="yellow"
            variant="light"
            mt="sm"
            title="Overwrite this village?"
          >
            <Stack gap="xs">
              <Text size="sm">Loading: {describeSave(pending)}.</Text>
              <Text size="sm">
                Replacing: {describeSave(state)}. There is no undo.
              </Text>
              <Group gap="xs">
                <Button
                  size="compact-sm"
                  color="yellow"
                  onClick={confirmImport}
                >
                  Overwrite
                </Button>
                <Button
                  size="compact-sm"
                  variant="default"
                  onClick={() => setPending(null)}
                >
                  Cancel
                </Button>
              </Group>
            </Stack>
          </Alert>
        )}
      </Card>

      <Card withBorder padding="sm">
        <Text fw={600}>Reset</Text>
        <Text size="sm" c="dimmed" mt={4}>
          Wipes this save and starts a new pā. There is no undo — export first
          if you might want it back.
        </Text>
        <Group gap="xs" mt="sm">
          {confirmingReset ? (
            <>
              <Text size="sm" c="dimmed">
                Wipe your save?
              </Text>
              <Button size="compact-sm" color="red" onClick={reset}>
                Reset
              </Button>
              <Button
                size="compact-sm"
                variant="default"
                onClick={() => setConfirmingReset(false)}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              size="compact-sm"
              color="red"
              variant="light"
              onClick={() => setConfirmingReset(true)}
            >
              Reset save
            </Button>
          )}
        </Group>
      </Card>
    </Stack>
  )
}
