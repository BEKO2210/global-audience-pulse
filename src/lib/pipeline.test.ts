import { describe, expect, it } from 'vitest'
import healthFixture from '../../e2e/fixtures/health-v2.json'
import {
  isHealthPayload,
  logLines,
  oneDecimal,
  runCells,
  runSeconds,
  stationStats,
  type HealthPayload,
} from './pipeline'

const fixture = healthFixture as unknown as HealthPayload

describe('pipeline derivations (real runs from 2026-10-10)', () => {
  it('accepts the fixture as a health payload', () => {
    expect(isHealthPayload(fixture)).toBe(true)
    expect(isHealthPayload({ runs: [] })).toBe(false)
  })

  it('marks each station per run', () => {
    const [retry, , , , , , template, , , skipped] = fixture.runs
    expect(runCells(retry!)).toMatchObject({
      schreiber: 'ok',
      zahlen: 'ok',
      pruefer: 'retry',
      ergebnis: 'ok',
    })
    expect(runCells(template!).ergebnis).toBe('template')
    expect(Object.values(runCells(skipped!))).toEqual(['skip', 'skip', 'skip', 'skip', 'skip'])
  })

  it('sums the 24 h station numbers', () => {
    const s = stationStats(fixture.runs)
    expect(s.checkerRejections).toBe(6)
    expect(s.numberRejections).toBe(0)
    expect(s.published).toBe(11)
    expect(s.templates).toBe(1)
    expect(s.retries).toBe(4)
    expect(s.writerCalls).toBe(16) // 2+1+1+1+1+1+3+2+1+0+2+1
    expect(s.writerSeconds).toBeGreaterThan(30)
  })

  it('splits compute time per run and writes log lines newest first', () => {
    expect(runSeconds(fixture.runs[0]!)).toEqual({ writer: 69.827, checker: 51.79 })
    const lines = logLines(fixture.runs, 'Europe/Berlin', 3)
    expect(lines[0]).toMatchObject({ time: '22:04', outcome: 'published', note: '' })
    expect(lines[0]!.steps).toBe('Schreiber 37,6 s · Prüfer 23,9 s · 1 Versuch')
    expect(lines[1]!.note).toBe('V1 abgelehnt (Prüfer)')
    expect(lines[2]!.steps).toMatch(/übersprungen/)
  })

  it('writes English log lines with a decimal point', () => {
    const lines = logLines(fixture.runs, 'Europe/Berlin', 3, 'en')
    expect(lines[0]).toMatchObject({ time: '22:04', outcome: 'published', note: '' })
    expect(lines[0]!.steps).toBe('Writer 37.6 s · Checker 23.9 s · 1 attempt')
    expect(lines[1]!.note).toBe('Attempt 1 rejected (checker)')
    expect(lines[2]!.steps).toBe('GPU busy – hour skipped')
    expect(oneDecimal(1.25, 'en')).toBe('1.3')
    expect(oneDecimal(1.25)).toBe('1,3')
  })
})
