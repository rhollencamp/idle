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

export function SaveView({ state, onImport, onReset }: SaveViewProps) {
  const clipboard = useClipboard({ timeout: 2000 })
  const [pasted, setPasted] = useState('')
  const [status, setStatus] = useState<Status>(null)
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

  const importText = (text: string) => {
    const imported = parseSave(text)
    if (!imported) {
      setStatus({
        tone: 'error',
        message: 'That is not a save this version of the game can read.',
      })
      return
    }

    onImport(imported)
    setPasted('')
    setStatus({
      tone: 'ok',
      message: 'Save loaded. Your pā is as you left it.',
    })
  }

  const importFile = async (file: File | null) => {
    if (!file) return

    try {
      importText(await file.text())
    } catch {
      setStatus({ tone: 'error', message: 'That file could not be read.' })
    }
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
          <FileButton onChange={importFile} accept="application/json,.json">
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
            onClick={() => importText(pasted)}
          >
            Load pasted save
          </Button>
        </Group>
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
