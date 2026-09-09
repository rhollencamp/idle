/**
 * The screens the drawer switches between. There is no router in this app —
 * a single `View` in `App` is the whole navigation model, which keeps the
 * game mounted (and ticking) behind whichever screen is showing.
 */
export const VIEWS = [
  { key: 'village', label: 'The Pā', title: 'Mate Atua' },
  { key: 'settings', label: 'Settings', title: 'Settings' },
  { key: 'save', label: 'Save', title: 'Save' },
  { key: 'about', label: 'About', title: 'About' },
] as const

export type View = (typeof VIEWS)[number]['key']

export function viewTitle(view: View): string {
  return VIEWS.find((entry) => entry.key === view)?.title ?? 'Mate Atua'
}
