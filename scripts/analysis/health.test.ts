import { describe, expect, it } from 'vitest'
import { reportStatus } from '../../src/components/ReportHealth'
import {
  nextExpectedAt,
  summarizeRuns,
  updateHealth,
  type HealthFile,
  type HealthRun,
  type RunOutcome,
} from './health'

const NOW = new Date('2026-10-10T12:30:00.000Z')

function run(
  hoursAgo: number,
  outcome: RunOutcome = 'published',
  source: HealthRun['source'] = 'llm',
): HealthRun {
  const endedAt = new Date(NOW.getTime() - hoursAgo * 3_600_000)
  return {
    startedAt: new Date(endedAt.getTime() - 30_000).toISOString(),
    endedAt: endedAt.toISOString(),
    durationSeconds: 30,
    outcome,
    attempts: outcome === 'published' ? 2 : 0,
    rejections:
      outcome === 'published' ? [{ attempt: 1, category: 'zahlen', reason: 'falsche Zahl' }] : [],
    source: outcome === 'published' ? source : null,
    models: { writer: 'writer', checker: 'checker' },
    modelCalls: [],
    liveSignals: 3,
    dataFetchErrors: [],
  }
}

describe('health summary', () => {
  it('summarizes only the last 24 hours', () => {
    const summary = summarizeRuns(
      [run(1), run(2, 'published', 'template'), run(3, 'skipped-gpu'), run(4, 'failed'), run(25)],
      NOW,
    )
    expect(summary).toMatchObject({
      runs: 4,
      published: 2,
      successRatePercent: 50,
      templateSharePercent: 50,
      skipped: 1,
      failed: 1,
      averageDurationSeconds: 30,
      rejections: { zahlen: 2, form: 0, pruefer: 0 },
      lastSuccess: run(1).endedAt,
    })
    expect(summary.nextExpectedAt).toBe('2026-10-10T13:02:00.000Z')
  })

  it('rolls the history to 48 runs', () => {
    let health: HealthFile | null = null
    for (let index = 60; index > 0; index -= 1) health = updateHealth(health, run(index), NOW)
    expect(health?.runs).toHaveLength(48)
    expect(health?.runs.at(-1)?.endedAt).toBe(run(1).endedAt)
  })

  it('keeps the last successful report when a failed run is appended', () => {
    const success = run(2)
    const before = updateHealth(null, success, NOW)
    const after = updateHealth(before, run(1, 'failed'), NOW)
    expect(after.summary24h.lastSuccess).toBe(success.endedAt)
    expect(after.runs.at(-2)).toEqual(success)
    expect(after.runs.at(-1)?.outcome).toBe('failed')
  })
})

describe('status thresholds', () => {
  it('uses active, delayed and paused boundaries', () => {
    const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000).toISOString()
    expect(reportStatus(ago(89), NOW.getTime())).toBe('active')
    expect(reportStatus(ago(90), NOW.getTime())).toBe('delayed')
    expect(reportStatus(ago(179), NOW.getTime())).toBe('delayed')
    expect(reportStatus(ago(180), NOW.getTime())).toBe('paused')
    expect(reportStatus(null, NOW.getTime())).toBe('paused')
    expect(nextExpectedAt(NOW)).toBe('2026-10-10T13:02:00.000Z')
  })
})
