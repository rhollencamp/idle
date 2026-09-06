import { registerSW } from 'virtual:pwa-register'

/**
 * Registers the service worker and checks for a new version every time the
 * app is opened or brought back to the foreground. `registerType: 'autoUpdate'`
 * (see vite.config.ts) makes the new service worker take over and reload the
 * page automatically once an update is found - no user prompt needed.
 */
export function registerPwaUpdates() {
  let registration: ServiceWorkerRegistration | undefined

  registerSW({
    immediate: true,
    onRegisteredSW(_url, reg) {
      registration = reg
    },
  })

  const checkForUpdate = () => {
    registration?.update().catch(() => {
      // Ignore network errors; the app keeps running on the current version.
    })
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate()
  })
}
