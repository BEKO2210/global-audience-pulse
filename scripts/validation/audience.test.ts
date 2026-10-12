import { describe, expect, it } from 'vitest'
import { FALLBACK_SNAPSHOT } from '../../src/lib/snapshot'
import { countrySharesToWeights, withAudience, withoutDeviation } from './audience'

describe('audience helpers', () => {
  it('maps ISO2 and ISO3, preserves the configured US split, and reports unknown shares', () => {
    const weights = countrySharesToWeights({ US: 60, DEU: 30, XX: 10 })
    expect(weights.us_east).toBeCloseTo(37.2)
    expect(weights.us_west).toBeCloseTo(22.8)
    expect(weights.eu_central).toBe(30)
    expect(weights.warnings).toEqual(['Nicht zuordenbarer Zielgruppenanteil: 10'])
  })

  it('sets reach weighting and clears live deviation without mutating input', () => {
    const source = {
      ...FALLBACK_SNAPSHOT,
      profiles: {
        eu_central: { weekday: Array(24).fill(1), weekend: Array(24).fill(2), deviation: 12 },
      },
    }
    const weighted = withAudience(source, { eu_central: 1 })
    const clean = withoutDeviation(weighted)
    expect(weighted.weightingMode).toBe('reach')
    expect(clean.profiles.eu_central?.deviation).toBe(0)
    expect(source.profiles.eu_central?.deviation).toBe(12)
  })
})
