// Only the chosen style's fonts are downloaded (O-014); the others load the first time a viewer picks them.
import type { StyleId } from '../config/styles'

const LOADERS: Record<StyleId, () => Promise<unknown>> = {
  tafel: () => import('../fonts/tafel'),
  atlas: () => import('../fonts/atlas'),
  praezision: () => import('../fonts/praezision'),
}

export function loadStyleFonts(style: StyleId) {
  return LOADERS[style]().catch(() => undefined)
}
