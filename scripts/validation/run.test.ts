import { readFile, rm } from 'node:fs/promises'
import { expect, it } from 'vitest'
import { isoWeek, runValidation, validationOutputPath } from './run'

it('builds bootstrap blocks from the local ISO week', () => {
  const mondayInBerlin = new Date('2026-07-05T23:05:00Z')
  expect(isoWeek(mondayInBerlin, 'Europe/Berlin')).toBe('2026-W28')
  expect(isoWeek(mondayInBerlin, 'UTC')).toBe('2026-W27')
})

it('rejects normalized output paths whose real parent is inside the repository', () => {
  expect(() => validationOutputPath(`/tmp/../${process.cwd()}/x.md`)).toThrow(
    'Der Bericht darf nicht ins Repository geschrieben werden',
  )
})

it('writes a complete deterministic report outside the repository', async () => {
  const one = '/tmp/t089-run-test-one.md'
  const two = '/tmp/t089-run-test-two.md'
  const common = [
    '--csv',
    'scripts/validation/fixtures/instagram-synthetic.csv',
    '--tz',
    'Europe/Berlin',
    '--preset',
    'Transatlantik',
    '--now',
    '2026-10-13T12:00:00Z',
  ]
  const first = await runValidation([...common, '--out', one])
  await runValidation([...common, '--out', two])
  expect(first.result.primary.n).toBe(24)
  expect(await readFile(one, 'utf8')).toBe(await readFile(two, 'utf8'))
  expect(await readFile(one, 'utf8')).toContain('## Urteil:')
  await Promise.all([rm(one), rm(two)])
}, 20_000)
