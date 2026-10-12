import { describe, expect, it } from 'vitest'
import { PLAYBOOKS, SOURCES, SOURCE_BY_ID, citedSources, formatSourceDate, tr } from './playbooks'

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
        expect(SOURCE_BY_ID.get(f.source)?.kind, `${p.id}: ${f.text.de}`).toBe('offiziell')
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

  it('has every text in German and English', () => {
    const texts = PLAYBOOKS.flatMap((p) => [
      ...[...p.rewards, ...p.limits].flatMap((f) => [f.lead, f.text]),
      ...p.times.flatMap((t) => [t.label, ...(t.weak ? [t.weak] : [])]),
      ...(p.gap ? [p.gap] : []),
    ])
    for (const text of [...texts, ...SOURCES.flatMap((s) => [s.title, s.basis ?? ''])]) {
      expect(tr(text, 'de')).toBeTypeOf('string')
      if (typeof text !== 'string') {
        expect(text.de, text.en).toBeTruthy()
        expect(text.en, text.de).toBeTruthy()
        expect(text.en, text.de).not.toMatch(/\bUhr\b|Mio\.|\d,\d(?!\d\d)/)
      }
    }
    expect(tr(PLAYBOOKS[0]!.rewards[2]!.lead, 'en')).toBe('Explore')
  })

  it('formats source dates and lists cited sources in first-use order', () => {
    expect(formatSourceDate('2026-03-31')).toBe('31.03.2026')
    expect(formatSourceDate('2026-10')).toBe('Okt. 2026')
    expect(formatSourceDate('laufend')).toBe('laufend aktualisiert')
    expect(formatSourceDate('2026-03-31', 'en')).toBe('31 Mar 2026')
    expect(formatSourceDate('2026-10', 'en')).toBe('Oct 2026')
    expect(formatSourceDate('laufend', 'en')).toBe('continuously updated')
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
      'Mo 13–14\u00A0Uhr · Di 11–17\u00A0Uhr · Mi 11–16\u00A0Uhr · Do 11–12, 13–17\u00A0Uhr · Fr 11–12, 13–14\u00A0Uhr',
    )
    expect(describeWindows(linkedin.times[1]!)).toBe('Mo–Fr 15–20\u00A0Uhr')
    expect(describePeaks(linkedin.times[1]!)).toBe(
      '1. Mi 16\u00A0Uhr · 2. Fr 15\u00A0Uhr · 3. Fr 16\u00A0Uhr',
    )
    const tiktok = PLAYBOOKS.find((p) => p.id === 'tiktok')!
    expect(describeWindows(tiktok.times[1]!)).toBe('täglich 18–23\u00A0Uhr')
  })

  it('speaks English with a 24-hour clock', async () => {
    const { describeWindows, describePeaks, describeDaily } = await import('./playbooks')
    const linkedin = PLAYBOOKS.find((p) => p.id === 'linkedin')!
    expect(describeWindows(linkedin.times[0]!, 'en')).toBe(
      'Mon 13:00–14:00 · Tue 11:00–17:00 · Wed 11:00–16:00 · Thu 11:00–12:00, 13:00–17:00 · Fri 11:00–12:00, 13:00–14:00',
    )
    expect(describeWindows(linkedin.times[1]!, 'en')).toBe('Mon–Fri 15:00–20:00')
    expect(describePeaks(linkedin.times[1]!, 'en')).toBe(
      '1. Wed 16:00 · 2. Fri 15:00 · 3. Fri 16:00',
    )
    const threads = PLAYBOOKS.find((p) => p.id === 'threads')!
    expect(describeDaily(threads.times[0]!)).toMatch(/^Mo 12\u00A0Uhr · Di 10\u00A0Uhr/)
    expect(describeDaily(threads.times[0]!, 'en')).toMatch(
      /^Mon 12:00 · Tue 10:00 · Wed 12:00 · Thu 09:00/,
    )
    const tiktok = PLAYBOOKS.find((p) => p.id === 'tiktok')!
    expect(describeWindows(tiktok.times[1]!, 'en')).toBe('daily 18:00–23:00')
  })
})

describe('heatmap scores', () => {
  it('unions windows, weekly peaks and daily slots per study and names the strongest cells', async () => {
    const { blockScores, strongestCells, describeCells, studyHours } = await import('./playbooks')
    const x = PLAYBOOKS.find((p) => p.id === 'x')!
    // Tuesday: Sprout 12–18; Buffer daily 9, 10, 11 (weekly peak 9 is one of them, counted once).
    expect([...studyHours(x.times[1]!, 1)].sort((a, b) => a - b)).toEqual([9, 10, 11])
    const scores = blockScores(x.times)
    expect(scores[1]).toEqual([0, 0, 3, 4, 2, 0])
    expect(scores[5]).toEqual([0, 0, 3, 0, 0, 0]) // Saturday: Buffer only
    expect(describeCells(strongestCells(scores))).toBe('Di–Fr 12–16\u00A0Uhr')
    expect(describeCells(strongestCells(scores), 'en')).toBe('Tue–Fri 12:00–16:00')
    expect(strongestCells([[0, 0]])).toEqual([])
  })

  it('formats day ranges', async () => {
    const { dayRange } = await import('./playbooks')
    expect(dayRange([1, 2, 3])).toBe('Di–Do')
    expect(dayRange([0, 2])).toBe('Mo, Mi')
    expect(dayRange([0, 1, 4, 5, 6])).toBe('Mo, Di, Fr–So')
    expect(dayRange([0, 1, 4, 5, 6], 'en')).toBe('Mon, Tue, Fri–Sun')
  })
})
