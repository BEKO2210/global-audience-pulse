import { describe, expect, it } from 'vitest'
import { parsePlatforms } from './useMyPlatforms'

describe('parsePlatforms (T-073)', () => {
  it('keeps known platforms in the canonical order', () => {
    expect(parsePlatforms('["youtube","instagram","myspace"]')).toEqual(['instagram', 'youtube'])
  })
  it('falls back to all platforms when nothing valid is saved', () => {
    const all = parsePlatforms(null)
    expect(all.length).toBeGreaterThan(5)
    expect(parsePlatforms('{broken')).toEqual(all)
    expect(parsePlatforms('"x"')).toEqual(all)
  })
  it('allows an explicit empty choice', () => {
    expect(parsePlatforms('[]')).toEqual([])
  })
})
