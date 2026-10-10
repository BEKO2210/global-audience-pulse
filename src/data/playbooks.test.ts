import { describe, expect, it } from 'vitest'
import { PLAYBOOKS, SOURCES, SOURCE_BY_ID, citedSources, formatSourceDate } from './playbooks'

describe('playbook data', () => {
  it('cites only known sources and uses every source', () => {
    const used = new Set<string>()
    for (const p of PLAYBOOKS) {
      for (const f of [...p.rewards, ...p.limits]) {
        expect(SOURCE_BY_ID.has(f.source), `${p.id}: ${f.source}`).toBe(true)
        used.add(f.source)
      }
      for (const t of p.times) {
        expect(SOURCE_BY_ID.get(t.source)?.kind, `${p.id}: ${t.source}`).toBe('studie')
        used.add(t.source)
      }
    }
    expect([...used].sort()).toEqual(SOURCES.map((s) => s.id).sort())
  })

  it('keeps ranking mechanics to official sources', () => {
    for (const p of PLAYBOOKS)
      for (const f of [...p.rewards, ...p.limits])
        expect(SOURCE_BY_ID.get(f.source)?.kind, `${p.id}: ${f.text}`).toBe('offiziell')
  })

  it('has valid https URLs, dates, unique ids and in-range times', () => {
    expect(new Set(SOURCES.map((s) => s.id)).size).toBe(SOURCES.length)
    for (const s of SOURCES) {
      expect(s.url).toMatch(/^https:\/\//)
      expect(s.date).toMatch(/^(laufend|\d{4}-\d{2}(-\d{2})?)$/)
      if (s.kind === 'studie') expect(s.basis, s.id).toBeTruthy()
    }
    for (const p of PLAYBOOKS)
      for (const t of p.times) {
        for (const w of t.windows) {
          expect(w.from).toBeGreaterThanOrEqual(0)
          expect(w.to).toBeLessThanOrEqual(24)
          expect(w.to).toBeGreaterThan(w.from)
        }
        for (const peak of t.peaks) expect(peak.hour).toBeGreaterThanOrEqual(0)
        expect(t.windows.length + t.peaks.length).toBeGreaterThan(0)
      }
  })

  it('every platform shows something and explains what is missing', () => {
    for (const p of PLAYBOOKS) {
      expect(p.rewards.length + p.times.length).toBeGreaterThan(0)
      if (!p.rewards.length || !p.times.length) expect(p.gap, p.id).toBeTruthy()
    }
  })

  it('formats source dates and lists cited sources in first-use order', () => {
    expect(formatSourceDate('2026-03-31')).toBe('31.03.2026')
    expect(formatSourceDate('2026-10')).toBe('Okt. 2026')
    expect(formatSourceDate('laufend')).toBe('laufend aktualisiert')
    expect(citedSources(PLAYBOOKS.find((p) => p.id === 'x')!).map((s) => s.id)).toEqual([
      'x-algorithm',
      'sprout-x',
      'buffer-x',
    ])
  })
})

describe('describeWindows / describePeaks', () => {
  it('merges consecutive identical days and lists ranked peaks', async () => {
    const { describeWindows, describePeaks } = await import('./playbooks')
    const linkedin = PLAYBOOKS.find((p) => p.id === 'linkedin')!
    expect(describeWindows(linkedin.times[0]!)).toBe(
      'Mo 13–14 Uhr · Di 11–17 Uhr · Mi 11–16 Uhr · Do 11–12, 13–17 Uhr · Fr 11–12, 13–14 Uhr',
    )
    expect(describeWindows(linkedin.times[1]!)).toBe('Mo–Fr 15–20 Uhr')
    expect(describePeaks(linkedin.times[1]!)).toBe('1. Mi 16 Uhr · 2. Fr 15 Uhr · 3. Fr 16 Uhr')
    const tiktok = PLAYBOOKS.find((p) => p.id === 'tiktok')!
    expect(describeWindows(tiktok.times[1]!)).toBe('täglich 18–23 Uhr')
  })
})
