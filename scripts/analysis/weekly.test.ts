import { describe, expect, it } from 'vitest'
import { isoWeek, weeklyDue, weeklyFacts, weeklyTemplate, weeklyTemplateEn } from './weekly'
import { numbersMatch } from './english'
import type { HistoryEntry } from './signals'

// Sunday 2026-10-18 18:30 Berlin (16:30 UTC); hourly history for the week before, peak at 20:00 Berlin each day.
const now = new Date(Date.UTC(2026, 9, 18, 16, 30))
const history: HistoryEntry[] = Array.from({ length: 168 }, (_, i) => {
  const t = new Date(now.getTime() - (168 - i) * 3_600_000)
  const berlinHour = (t.getUTCHours() + 2) % 24
  const score = berlinHour === 20 ? 70 + (i % 5) : 30 + (berlinHour % 7)
  return { t: t.toISOString(), score, regions: {} }
})

describe('weekly review (T-014)', () => {
  it('needs at least three days of history', () => {
    expect(weeklyFacts(history.slice(-50), now)).toBeNull()
  })

  it('computes days, best hours and the weekly extremes', () => {
    const f = weeklyFacts(history, now)!
    expect(f.woche).toBe('2026-W42')
    expect(f.stunden).toBe(167) // the entry exactly seven days back is outside the window
    expect(f.besteStunden[0]!.stunde).toBe('20:00')
    expect(f.wochenhoch.um).toBe('20:30') // exact time of the entry; besteStunden buckets by hour
    expect(f.tage.length).toBeGreaterThanOrEqual(7)
  })

  it('is due on Sunday evening once per week', () => {
    expect(weeklyDue(now, null)).toBe(true)
    expect(weeklyDue(now, '2026-W42')).toBe(false)
    expect(weeklyDue(new Date(Date.UTC(2026, 9, 18, 10)), null)).toBe(false)
    expect(isoWeek(new Date(Date.UTC(2026, 0, 1, 12)))).toBe('2026-W01')
  })

  it('writes German and English templates with the same numbers', () => {
    const f = weeklyFacts(history, now)!
    expect(numbersMatch(weeklyTemplate(f), weeklyTemplateEn(f))).toBe(true)
    expect(weeklyTemplateEn(f).analyse).not.toMatch(/Sonntag|Montag|Uhr/)
  })
})
