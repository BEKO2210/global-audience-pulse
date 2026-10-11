// T-073 "Meine Plattformen": which platforms the viewer posts on, kept only in this browser (no login, no server).
import { useSyncExternalStore } from 'react'
import { PLAYBOOKS, type PlatformId } from '../data/playbooks'

export const PLATFORMS_KEY = 'gap-platforms'
const ALL = PLAYBOOKS.map((p) => p.id)

/** Saved list, filtered to known ids; nothing saved (or unreadable) → all platforms. */
export function parsePlatforms(raw: string | null): PlatformId[] {
  try {
    const list = JSON.parse(raw ?? 'null') as unknown
    if (!Array.isArray(list)) return ALL
    return ALL.filter((id) => list.includes(id))
  } catch {
    return ALL
  }
}

function read() {
  try {
    return parsePlatforms(localStorage.getItem(PLATFORMS_KEY))
  } catch {
    return ALL
  }
}

let current: PlatformId[] = typeof window === 'undefined' ? ALL : read()
const listeners = new Set<() => void>()

export function setMyPlatforms(next: readonly PlatformId[]) {
  current = ALL.filter((id) => next.includes(id))
  try {
    localStorage.setItem(PLATFORMS_KEY, JSON.stringify(current))
  } catch {
    /* private mode: the choice lasts for this page view */
  }
  listeners.forEach((listener) => listener())
}

export function toggleMyPlatform(id: PlatformId) {
  setMyPlatforms(current.includes(id) ? current.filter((p) => p !== id) : [...current, id])
}

/** Shared by the posting plan and the playbooks, so a choice in one updates the other at once. */
export function useMyPlatforms(): readonly PlatformId[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => current,
    () => ALL,
  )
}
