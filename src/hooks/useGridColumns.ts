import { useSyncExternalStore } from 'react'

// Must match the .region-grid breakpoints in RegionCards.css (1 → 2 → 4 columns).
const QUERIES = [
  ['(min-width: 1280px)', 4],
  ['(min-width: 600px)', 2],
] as const

const columns = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return 1
  for (const [query, count] of QUERIES) if (window.matchMedia(query).matches) return count
  return 1
}

const subscribe = (onChange: () => void) => {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const lists = QUERIES.map(([query]) => window.matchMedia(query))
  lists.forEach((list) => list.addEventListener('change', onChange))
  return () => lists.forEach((list) => list.removeEventListener('change', onChange))
}

/** Column count of the region grid, so the detail row can open right below the row of the chosen card. */
export function useGridColumns() {
  return useSyncExternalStore(subscribe, columns, () => 1)
}
