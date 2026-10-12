import { describe, expect, it } from 'vitest'
import { formatPercent, glueNumberUnits } from './format'

describe('glueNumberUnits', () => {
  it('binds a score to its unit in both languages', () => {
    expect(glueNumberUnits('Gesamtwert von 36 Punkten in ruhiger Phase')).toBe(
      'Gesamtwert von 36 Punkten in ruhiger Phase',
    )
    expect(glueNumberUnits('Overall score of 36 points')).toBe('Overall score of 36 points')
  })

  it('leaves other numbers alone', () => {
    expect(glueNumberUnits('Berlin 28% quieter at 20:00')).toBe('Berlin 28% quieter at 20:00')
  })
})

describe('formatPercent', () => {
  it('keeps German spacing', () => {
    expect(formatPercent(28, 'de')).toBe('28 %')
  })

  it('uses English spacing', () => {
    expect(formatPercent(28, 'en')).toBe('28%')
  })
})
