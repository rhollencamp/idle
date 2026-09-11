import { createTheme } from '@mantine/core'

// Mantine is the theming layer for this app: colours, typography, spacing and
// dark mode all come from the theme below and Mantine's CSS custom properties
// rather than hand-rolled tokens. Reskin the game here.
//
// Mantine derives its surfaces from three places: `colors.island` (accents),
// `colors.dark` (every dark-scheme surface, border and muted text), and
// `black` (light-scheme body text). Only the light page background lives in
// styles/app.css, because in light mode Mantine ties the page and card
// backgrounds to the same `white` token and the design wants them different.
export const theme = createTheme({
  // Deep water; the 7th shade is the one Mantine uses as `island.filled`, and
  // it matches the PWA theme colour in index.html and the manifest.
  primaryColor: 'island',
  primaryShade: 7,
  // Light-scheme body text: driftwood, not pure black.
  black: '#1c2a33',
  colors: {
    island: [
      '#e7f2f7',
      '#cfe4ee',
      '#a5cbdd',
      '#77b0cb',
      '#5199bc',
      '#3b8bb3',
      '#2d83b0',
      '#0e5c82',
      '#0b4e6f',
      '#03415f',
    ],

    // Night on the beach. Mantine reads this ramp for the whole dark scheme:
    // [0] is body text, [4] borders, [5] hover, [6] card surfaces, [7] the page
    // background. Replacing it is how a dark theme gets reskinned — overriding
    // --mantine-color-body alone would leave cards on Mantine's neutral grey.
    dark: [
      '#c7d2d8',
      '#a9b7bf',
      '#8b9ca6',
      '#6d818c',
      '#4f6672',
      '#33454e',
      '#1b262c',
      '#10171b',
      '#0b1014',
      '#06090b',
    ],
  },

  // The original 18px / 145% system-font setup. Mantine's body rules read
  // --mantine-font-size-md and --mantine-line-height, which are these.
  fontFamily: 'system-ui, "Segoe UI", Roboto, sans-serif',
  fontFamilyMonospace:
    'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontSizes: { md: '1.125rem' },
  lineHeights: { md: '1.45' },
  headings: { fontWeight: '500' },

  components: {
    // Cards float on the photographic backdrop rather than hiding it: a thin
    // wash of the surface colour, blurred just enough to keep the sand grain
    // from reading through the dimmed captions. The colours themselves are
    // per-scheme tokens in styles/app.css, beside the backdrop they sit on.
    Card: {
      styles: {
        root: {
          backgroundColor: 'var(--app-surface-bg)',
          backdropFilter: 'blur(3px)',
          borderColor: 'var(--app-surface-border)',
        },
      },
    },
    // The one control that sits on a card. Mantine's `default` variant paints
    // it a solid surface colour, which reads as a chip of the old opaque UI.
    ActionIcon: {
      styles: {
        root: {
          '--ai-bg': 'var(--app-surface-bg)',
          '--ai-bd': '1px solid var(--app-surface-border)',
          '--ai-hover': 'var(--app-surface-border)',
        },
      },
    },
    // Resource bars are a thin accent, not a focal point: Mantine's default
    // `md` is already the 0.5rem the design calls for, but its track reads as
    // a light grey band that fights the island palette in both schemes.
    Progress: {
      styles: { root: { backgroundColor: 'var(--app-progress-track)' } },
    },
    // The fill is already redrawn every animation frame from the projection,
    // so Mantine's default width transition has no gap to smooth: it only
    // damps each update, leaving the bar trailing the number beside it. Worse,
    // an `ease` transition restarted every frame never gets past the slow head
    // of its own curve, so the bar creeps while the figure climbs. Note the
    // key: `Progress.Root` reads its props under `ProgressRoot`, and only its
    // styles resolve against `Progress` above.
    ProgressRoot: { defaultProps: { transitionDuration: 0 } },
    // Rates read as data, not as shouting.
    Badge: { defaultProps: { variant: 'light', tt: 'none' } },
  },
})

// Palette notes for systems not built yet: foraging/growth #3f7d3f,
// firelight #c98b2e. Add each as a full Mantine shade ramp when the first
// component actually needs it.
