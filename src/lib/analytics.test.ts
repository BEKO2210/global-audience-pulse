import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('analytics', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-10T10:00:00Z'))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('uses the Plausible stub queue', async () => {
    const plausible = Object.assign((...args: unknown[]) => plausible.q.push(args), {
      q: [] as unknown[][],
    })
    vi.stubGlobal('window', { plausible })
    const { track } = await import('./analytics')
    track('Gewichtung', { modus: 'reach' })
    expect(plausible.q).toEqual([['Gewichtung', { props: { modus: 'reach' } }]])
  })

  it('filters unknown, invalid, and non-primitive properties', async () => {
    const plausible = vi.fn()
    vi.stubGlobal('window', { plausible })
    const { track } = await import('./analytics')
    track('Zielgruppe', {
      region: 'eu_central',
      aktiv: true,
      anzahl: 4,
      email: 'person@example.test',
      nested: { secret: true },
    } as never)
    expect(plausible).toHaveBeenCalledWith('Zielgruppe', {
      props: { region: 'eu_central', aktiv: true, anzahl: 4 },
    })
  })

  it('throttles identical scrub events but permits the next gesture', async () => {
    const plausible = vi.fn()
    vi.stubGlobal('window', { plausible })
    const { track } = await import('./analytics')
    const props = { quelle: 'leiste', horizont: '24h', offsetStunden: 3 } as const
    track('Scrub', props)
    track('Scrub', props)
    expect(plausible).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(501)
    track('Scrub', props)
    expect(plausible).toHaveBeenCalledTimes(2)
  })

  it('does nothing when Plausible is blocked', async () => {
    vi.stubGlobal('window', {})
    const { track } = await import('./analytics')
    expect(() => track('Plan kopiert')).not.toThrow()
  })
})
