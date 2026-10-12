import { readFile, rm } from 'node:fs/promises'
import { expect, it } from 'vitest'
import { runValidation } from './run'

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
  await runValidation([...common, '--out', one])
  await runValidation([...common, '--out', two])
  expect(await readFile(one, 'utf8')).toBe(await readFile(two, 'utf8'))
  expect(await readFile(one, 'utf8')).toContain('## Urteil:')
  await Promise.all([rm(one), rm(two)])
}, 20_000)
