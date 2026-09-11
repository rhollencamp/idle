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

- [ ] **Say when a famine ended mid-absence.** The return summary reports a
      night that starved five villagers and then refilled the pātaka as
      `Died -5` above `Food +200` — both true, and together they read as a
      contradiction. The report knows the pā is no longer starving but not that
      it was; a line saying the famine broke would carry what the two numbers
      only imply. `src/ui/ReturnSummary.tsx`, and it likely wants something
      more than a diff out of `summary.ts` — which is step 13's Chronicle.

- [ ] **Decide whether the return summary must be acknowledged.** It currently
      closes on a click outside or `Escape` as well as on its button, and with
      the pā held back behind it that stray click is the only thing between the
      player and a report they never read. `closeOnClickOutside={false}` plus
      `closeOnEscape={false}` in `src/ui/ReturnSummary.tsx` makes the button the
      way out. Worth more once the Chronicle gives the dialog something to say.
