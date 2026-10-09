import { useEffect, useMemo, useRef, useState } from 'react'
import { REGIONS, type RegionId } from '../config/regions'
import { createScoreGrid, type ScoreGrid, type ScoreGridData } from '../lib/model'
import type { Snapshot } from '../lib/snapshot'

const EMPTY_VALUES = Object.fromEntries(
  REGIONS.map((region) => [region.id, new Float32Array(1)]),
) as Record<RegionId, Float32Array>

export function useScoreGrid(snapshot: Snapshot, anchor: Date) {
  const requestId = useRef(0)
  const [data, setData] = useState<ScoreGridData | null>(null)
  const anchorMinute = Math.floor(anchor.getTime() / 60_000) * 60_000

  useEffect(() => {
    const worker = new Worker(new URL('../workers/score-grid.worker.ts', import.meta.url), {
      type: 'module',
    })
    const id = ++requestId.current
    worker.onmessage = (event: MessageEvent<{ id: number; grid: ScoreGridData }>) => {
      if (event.data.id === requestId.current) setData(event.data.grid)
      worker.terminate()
    }
    worker.postMessage({ id, anchor: anchorMinute, snapshot })
    return () => worker.terminate()
  }, [anchorMinute, snapshot])

  const grid = useMemo<ScoreGrid>(() => {
    const source =
      data ??
      ({
        start: anchorMinute,
        end: anchorMinute,
        stepMs: 15 * 60_000,
        size: 1,
        byRegion: EMPTY_VALUES,
      } satisfies ScoreGridData)
    return createScoreGrid(source, snapshot)
  }, [anchorMinute, data, snapshot])

  return { grid, ready: data !== null }
}
