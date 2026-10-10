import { describe, expect, it } from 'vitest'
import { formatDuration, humanAgo, minutesAgo } from './ago'

describe('humanAgo', () => {
  it('counts minutes below one hour', () => {
    expect(humanAgo(0)).toBe('0 Min')
    expect(humanAgo(59)).toBe('59 Min')
  })

  it('switches to hours at 60 and drops zero minutes', () => {
    expect(humanAgo(60)).toBe('1 Std')
    expect(humanAgo(61)).toBe('1 Std 1 Min')
    expect(humanAgo(120)).toBe('2 Std')
    expect(humanAgo(2879)).toBe('47 Std 59 Min')
  })

  it('switches to whole days at 48 hours', () => {
    expect(humanAgo(2880)).toBe('2 Tagen')
    expect(humanAgo(4319)).toBe('2 Tagen')
    expect(humanAgo(4320)).toBe('3 Tagen')
  })
})

describe('minutesAgo', () => {
  const now = Date.parse('2026-10-10T12:00:00Z')

  it('clamps future timestamps to 0', () => {
    expect(minutesAgo('2026-10-10T12:05:00Z', now)).toBe(0)
  })

  it('rounds to the nearest minute', () => {
    expect(minutesAgo('2026-10-10T11:58:30Z', now)).toBe(2)
    expect(minutesAgo('2026-10-10T11:59:31Z', now)).toBe(0)
  })
})

describe('formatDuration', () => {
  it('shows seconds below one minute', () => {
    expect(formatDuration(0)).toBe('0 s')
    expect(formatDuration(59)).toBe('59 s')
  })

  it('shows minutes and seconds from 60 on', () => {
    expect(formatDuration(60)).toBe('1 min 0 s')
    expect(formatDuration(125)).toBe('2 min 5 s')
  })
})
