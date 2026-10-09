/// <reference lib="webworker" />

import { REGIONS } from '../config/regions'
import { buildScoreGridData } from '../lib/model'
import type { Snapshot } from '../lib/snapshot'

interface GridRequest {
  id: number
  anchor: number
  snapshot: Snapshot
}

self.onmessage = (event: MessageEvent<GridRequest>) => {
  const { id, anchor, snapshot } = event.data
  const grid = buildScoreGridData(REGIONS, snapshot, new Date(anchor))
  const buffers = Object.values(grid.byRegion).map((values) => values.buffer)
  self.postMessage({ id, grid }, { transfer: buffers })
}
