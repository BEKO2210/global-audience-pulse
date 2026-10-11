import { describe, expect, it } from 'vitest'
import { parseReminders } from './reminder'

describe('parseReminders (T-081)', () => {
  const now = 1_000_000
  it('keeps future, well-formed reminders in time order', () => {
    const raw = JSON.stringify([
      { at: now + 2000, title: 'b', body: '' },
      { at: now - 1, title: 'past', body: '' },
      { at: now + 1000, title: 'a', body: '' },
      { at: 'soon', title: 'bad', body: '' },
    ])
    expect(parseReminders(raw, now).map((r) => r.title)).toEqual(['a', 'b'])
  })
  it('survives broken storage', () => {
    expect(parseReminders('{oops', now)).toEqual([])
    expect(parseReminders(null, now)).toEqual([])
    expect(parseReminders('{"at":1}', now)).toEqual([])
  })
})
