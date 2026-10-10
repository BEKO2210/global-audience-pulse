import { describe, expect, it } from 'vitest'
import { regionsWestToEast } from './regions'

const expected = [
  'Los Angeles',
  'New York',
  'São Paulo',
  'London',
  'Berlin',
  'Dubai',
  'Mumbai',
  'Tokio',
]

describe('canonical region order', () => {
  it.each([new Date('2026-01-15T12:00:00Z'), new Date('2026-07-15T12:00:00Z')])(
    'stays west-to-east across DST at %s',
    (date) => {
      expect(regionsWestToEast(date).map((region) => region.city)).toEqual(expected)
    },
  )
})
