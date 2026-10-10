import { REGIONS } from '../../config/regions'

export function seriesColorForRegion(regionId: string): string {
  const index = REGIONS.findIndex((r) => r.id === regionId)
  const i = index >= 0 ? index : 0
  return `var(--region-series-${i % 8})`
}
