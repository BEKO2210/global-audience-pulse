import { useEffect, useState } from 'react'
import { DATA_SOURCES } from '../config/model'
import { isHealthPayload, type HealthPayload } from '../lib/pipeline'
import { isCurrentWeekly, type WeeklyPayload } from '../lib/weekly'

/**
 * The two below-the-fold data blocks (Sunday review, pipeline telemetry) are fetched here, not inside the
 * lazy components, so their section mounts only once a payload exists. Nothing is reserved for content that
 * may never come: no guessed placeholder height, no 1100 px → 0 jump on the phone.
 */
export function useBelowFoldData() {
  const [weekly, setWeekly] = useState<WeeklyPayload | null>(null)
  const [health, setHealth] = useState<HealthPayload | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const load = <T>(
      url: string,
      accept: (value: unknown) => value is T,
      set: (value: T) => void,
    ) =>
      fetch(url, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((value: unknown) => {
          if (accept(value)) set(value)
        })
        .catch(() => undefined)
    void load(
      `${DATA_SOURCES.weeklyReview}?t=${Math.floor(Date.now() / 3_600_000)}`,
      (value): value is WeeklyPayload => isCurrentWeekly(value),
      setWeekly,
    )
    void load(
      `${DATA_SOURCES.analysisHealth}?t=${Math.floor(Date.now() / 600_000)}`,
      isHealthPayload,
      setHealth,
    )
    return () => controller.abort()
  }, [])

  return { weekly, health }
}
