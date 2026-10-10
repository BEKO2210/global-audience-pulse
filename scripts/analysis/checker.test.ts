import { describe, expect, it } from 'vitest'
import { contradictions, type CheckItem } from './checker'

const item = (over: Partial<CheckItem>): CheckItem => ({
  aussage: 'A',
  berichtswert: 'x',
  datenwert: 'y',
  vergleich: 'Stimmt nicht überein.',
  widerspruch: true,
  ...over,
})

describe('contradictions', () => {
  it('keeps real contradictions and drops verdicts whose own comparison says the claim holds', () => {
    expect(contradictions([item({})])).toHaveLength(1)
    expect(contradictions([item({ vergleich: 'Faktisch korrekt, Berlin hat 21 > 19.' })])).toEqual(
      [],
    )
    expect(contradictions([item({ vergleich: 'Es gibt keinen Widerspruch.' })])).toEqual([])
    expect(contradictions([item({ vergleich: 'Die Aussage ist nicht korrekt.' })])).toHaveLength(1)
    expect(contradictions([item({ widerspruch: false })])).toEqual([])
  })
})

describe('trendContradictions', () => {
  const falling = {
    gesamt: { score: 69 },
    trendNaechsteStunden: [{ score: 62 }, { score: 58 }, { score: 56 }],
  }
  const rising = {
    gesamt: { score: 50 },
    trendNaechsteStunden: [{ score: 55 }, { score: 60 }, { score: 64 }],
  }

  it('flags a sentence about the coming hours that contradicts the trend direction', async () => {
    const { trendContradictions } = await import('./checker')
    expect(
      trendContradictions(['Der Gesamtwert steigt in den nächsten drei Stunden.'], falling),
    ).toHaveLength(1)
    expect(
      trendContradictions(['In den kommenden Stunden fällt der Wert deutlich.'], rising),
    ).toHaveLength(1)
  })

  it('accepts matching directions, flat trends and sentences not about the next hours', async () => {
    const { trendContradictions } = await import('./checker')
    expect(
      trendContradictions(['Der Score wird in den nächsten drei Stunden auf 56 sinken.'], falling),
    ).toEqual([])
    expect(trendContradictions(['Berlin stieg gestern stark an.'], falling)).toEqual([])
    const flat = {
      gesamt: { score: 60 },
      trendNaechsteStunden: [{ score: 61 }, { score: 61 }, { score: 62 }],
    }
    expect(trendContradictions(['In den nächsten Stunden steigt der Wert leicht.'], flat)).toEqual(
      [],
    )
  })
})
