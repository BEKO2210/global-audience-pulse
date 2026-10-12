import { REGIONS, type RegionId } from '../../src/config/regions'
import { globalActivity } from '../../src/lib/model'
import type { Snapshot } from '../../src/lib/snapshot'

export function scoreAtPublish(
  date: Date,
  ctx: { selected: readonly RegionId[]; snapshot: Snapshot },
) {
  return globalActivity(REGIONS, ctx.selected, date, ctx.snapshot)
}
