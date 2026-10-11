import { describe, expect, it } from 'vitest'
import fixture from '../../e2e/fixtures/analysis-v2.json'
import { numbersMatch, sameShape, templateEn, withOriginalNames, type ReportBody } from './english'

const de = fixture.report as ReportBody
const translated = (edit: (text: string) => string): ReportBody => ({
  schlagzeile: edit(de.schlagzeile),
  empfehlung: edit(de.empfehlung),
  analyse: edit(de.analyse),
  punkte: de.punkte.map(edit),
  zielgruppen: de.zielgruppen.map((z) => ({ name: `${z.name} (EN)`, urteil: edit(z.urteil) })),
})

describe('English edition (T-015)', () => {
  it('accepts a translation that keeps every number, in any order', () => {
    const en = translated((t) => t.replace(/ Uhr/g, '').replace(/Punkten?/g, 'points'))
    expect(numbersMatch(de, en)).toBe(true)
    expect(sameShape(de, en)).toBe(true)
    const reordered = { ...en, punkte: [...en.punkte].reverse() }
    expect(numbersMatch(de, reordered)).toBe(true)
  })

  it('rejects a translation that changes, drops or adds a number', () => {
    expect(
      numbersMatch(
        de,
        translated((t) => t.replace('21:30', '21:00')),
      ),
    ).toBe(false)
    expect(
      numbersMatch(
        de,
        translated((t) => t.replace('45 Punkte', 'points')),
      ),
    ).toBe(false)
    expect(
      numbersMatch(
        de,
        translated((t) => `${t} 7`),
      ),
    ).toBe(false)
  })

  it('rejects a different shape', () => {
    expect(sameShape(de, { ...de, punkte: de.punkte.slice(0, 2) })).toBe(false)
    expect(sameShape(de, { ...de, zielgruppen: [] })).toBe(false)
  })

  it('keeps the original audience names as lookup keys', () => {
    const en = withOriginalNames(
      de,
      translated((t) => t),
    )
    expect(en.zielgruppen.map((z) => z.name)).toEqual(de.zielgruppen.map((z) => z.name))
  })

  it('builds an English template from the facts without German words', () => {
    const en = templateEn(fixture.facts as Parameters<typeof templateEn>[0])
    const text = [
      en.schlagzeile,
      en.empfehlung,
      en.analyse,
      ...en.punkte,
      ...en.zielgruppen.map((z) => z.urteil),
    ].join(' ')
    expect(en.schlagzeile).toBe('Quiet: overall score 36')
    expect(text).not.toMatch(/Uhr|Punkte|Bestes|Ruhephase|Nachtruhe|Tokio|[äöüß]/)
    expect(en.zielgruppen).toHaveLength(fixture.facts.zielgruppen.length)
  })
})
