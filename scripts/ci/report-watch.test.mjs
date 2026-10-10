import { describe, expect, it } from 'vitest'
import { decide } from './report-watch.mjs'

const now = new Date('2026-10-11T12:00:00Z')
const run = (outcome, endedAt = '2026-10-11T11:04:00Z') => ({ outcome, endedAt })
const health = (runs, lastSuccess) => ({ runs, summary24h: { lastSuccess } })

describe('report-watch decide', () => {
  it('stays quiet for a healthy job and for a normal night off', () => {
    expect(decide(health([run('published')], '2026-10-11T11:04:00Z'), now)).toBeNull()
    // PC off for 10 h (night): no alert.
    expect(decide(health([run('published')], '2026-10-11T02:04:00Z'), now)).toBeNull()
    // skipped-gpu is not a failure
    expect(
      decide(
        health(
          [run('skipped-gpu'), run('skipped-gpu'), run('skipped-gpu')],
          '2026-10-11T09:00:00Z',
        ),
        now,
      ),
    ).toBeNull()
  })

  it('alerts when the last three runs failed while the PC is on', () => {
    const reason = decide(
      health(
        [run('published'), run('failed'), run('failed'), run('failed')],
        '2026-10-11T08:00:00Z',
      ),
      now,
    )
    expect(reason).toMatch(/letzten 3 Läufe/)
  })

  it('alerts after more than 24 h without a report, or when health.json is missing', () => {
    expect(decide(health([run('published')], '2026-10-10T10:00:00Z'), now)).toMatch(
      /Seit 26 Stunden/,
    )
    expect(decide(null, now)).toMatch(/nicht erreichbar/)
  })
})
