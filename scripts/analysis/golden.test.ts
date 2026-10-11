import { describe, expect, it } from 'vitest'
import cases from './golden/facts.json'
import { GOLDEN_SIZE, scoreReport, type WrittenReport } from './golden'
import type { Facts } from './report'

const first = cases[0]!.facts as unknown as Facts
const good = (facts: Facts): WrittenReport => {
  const best = [...facts.besteFenster24h].sort((a, b) => b.score - a.score)[0]!
  return {
    schlagzeile: `Gesamtwert ${facts.gesamt.score}`,
    empfehlung: `Bestes Fenster ${best.von}–${best.bis} Uhr.`,
    analyse: `${facts.regionen[0]!.ort} trägt den größten Beitrag.`,
    punkte: ['a', 'b', 'c'],
    zielgruppen: facts.zielgruppen.map((z) => ({ name: z.name, urteil: 'später' })),
  }
}

describe('golden set (T-020)', () => {
  it('has 30 frozen cases with distinct moments', () => {
    expect(cases).toHaveLength(GOLDEN_SIZE)
    expect(new Set(cases.map((c) => c.at)).size).toBe(GOLDEN_SIZE)
  })

  it('passes a faithful report', () => {
    expect(scoreReport(first, good(first))).toMatchObject({ pass: true, falscheZahlen: [] })
  })

  it('flags invented numbers, missing key statements and wrong shape', () => {
    const report = good(first)
    expect(
      scoreReport(first, { ...report, analyse: `${report.analyse} Plus 997 Prozent.` }).zahlen,
    ).toBe(false)
    expect(scoreReport(first, { ...report, empfehlung: 'Später posten.' }).fenster).toBe(false)
    expect(scoreReport(first, { ...report, analyse: 'Niemand trägt etwas.' }).markt).toBe(false)
    const top = first.regionen[0]!
    const second = first.regionen[1]!
    expect(
      scoreReport(first, { ...report, analyse: `${top.region} trägt am meisten.` }).markt,
    ).toBe(true)
    expect(scoreReport(first, { ...report, analyse: `${second.ort} vor ${top.ort}.` }).markt).toBe(
      false,
    )
    expect(scoreReport(first, { ...report, punkte: ['a'] }).form).toBe(false)
  })
})
