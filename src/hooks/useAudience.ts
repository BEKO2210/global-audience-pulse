import { useEffect, useState } from 'react'
import { REGIONS, type RegionId } from '../config/regions'
import type { WeightingMode } from '../lib/snapshot'

const all = REGIONS.map((r) => r.id)
const valid = new Set<RegionId>(all)

function initialSelection(): RegionId[] {
  try {
    const audienceParam = new URLSearchParams(location.search).get('audience')
    if (audienceParam === 'none') return []
    const query = audienceParam
      ?.split(',')
      .filter((id): id is RegionId => valid.has(id as RegionId))
    if (query?.length) return query
    const stored = JSON.parse(localStorage.getItem('gap-audience') ?? '[]') as string[]
    const parsed = stored.filter((id): id is RegionId => valid.has(id as RegionId))
    return parsed.length ? parsed : all
  } catch {
    return all
  }
}

export function useAudience() {
  const [selected, setSelected] = useState<RegionId[]>(initialSelection)
  const [weightingMode, setWeightingMode] = useState<WeightingMode>(() => {
    try {
      const query = new URLSearchParams(location.search).get('weight')
      if (query === 'reach' || query === 'value') return query
      return localStorage.getItem('gap-weighting') === 'reach' ? 'reach' : 'value'
    } catch {
      return 'value'
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem('gap-audience', JSON.stringify(selected))
      const url = new URL(location.href)
      if (selected.length === all.length) url.searchParams.delete('audience')
      else url.searchParams.set('audience', selected.length ? selected.join(',') : 'none')
      history.replaceState(null, '', url)
    } catch {
      /* Storage and history are optional enhancements. */
    }
  }, [selected])
  useEffect(() => {
    try {
      localStorage.setItem('gap-weighting', weightingMode)
      const url = new URL(location.href)
      if (weightingMode === 'value') url.searchParams.delete('weight')
      else url.searchParams.set('weight', weightingMode)
      history.replaceState(null, '', url)
    } catch {
      /* Storage and history are optional enhancements. */
    }
  }, [weightingMode])
  const toggle = (id: RegionId) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  return {
    selected,
    toggle,
    selectAll: () => setSelected(all),
    setSelected,
    weightingMode,
    setWeightingMode,
  }
}
