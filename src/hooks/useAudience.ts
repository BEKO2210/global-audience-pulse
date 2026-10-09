import { useEffect, useState } from 'react'
import { REGIONS, type RegionId } from '../config/regions'

const all = REGIONS.map((r) => r.id)
const valid = new Set<RegionId>(all)

function initialSelection(): RegionId[] {
  try {
    const query = new URLSearchParams(location.search).get('audience')?.split(',').filter((id): id is RegionId => valid.has(id as RegionId))
    if (query?.length) return query
    const stored = JSON.parse(localStorage.getItem('gap-audience') ?? '[]') as string[]
    const parsed = stored.filter((id): id is RegionId => valid.has(id as RegionId))
    return parsed.length ? parsed : all
  } catch { return all }
}

export function useAudience() {
  const [selected, setSelected] = useState<RegionId[]>(initialSelection)
  useEffect(() => {
    try {
      localStorage.setItem('gap-audience', JSON.stringify(selected))
      const url = new URL(location.href)
      if (selected.length === all.length) url.searchParams.delete('audience')
      else url.searchParams.set('audience', selected.join(','))
      history.replaceState(null, '', url)
    } catch { /* Storage and history are optional enhancements. */ }
  }, [selected])
  const toggle = (id: RegionId) => setSelected((current) => current.includes(id) ? (current.length > 1 ? current.filter((item) => item !== id) : current) : [...current, id])
  return { selected, toggle, selectAll: () => setSelected(all), setSelected }
}
