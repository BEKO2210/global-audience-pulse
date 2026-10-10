import { REGIONS } from '../../config/regions'
import { SERIES } from '../../config/model'

export function seriesColorForRegion(regionId: string): string {
  const index = REGIONS.findIndex((r) => r.id === regionId)
  const i = index >= 0 ? index : 0
  return SERIES[i % SERIES.length] ?? SERIES[0]
}
