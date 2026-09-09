# TODO

Running list of things worth doing. Add items as they come up; delete them when
they ship.

## UI

- [ ] **Prompt before reloading on a new version.** `src/pwaUpdate.ts` uses
      `registerType: 'autoUpdate'`, so a new service worker takes over and reloads
      the page on its own — which can yank the page out from under the player
      mid-tick. Switch to `registerType: 'prompt'` and surface the update as a
      Mantine `Notification` ("New version available — Reload") so reloading is
      the player's call. Check that the save is flushed before the reload.

- [ ] **Credit the icon in the app, not only the README.** The app icon is
      CC BY 3.0 and the attribution currently lives in `README.md`, which a
      player never sees. When there is an about or credits surface — the
      Chronicle screen is the natural home — put the line there too.
