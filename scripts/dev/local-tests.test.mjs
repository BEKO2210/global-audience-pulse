import { describe, expect, it } from 'vitest'
import { isCandidate, unfence } from './local-tests.mjs'

describe('local test writer (T-052)', () => {
  it('only takes pure modules that exist', () => {
    expect(isCandidate('src/lib/captions.ts')).toBe(true)
    expect(isCandidate('src/lib/captions.test.ts')).toBe(false)
    expect(isCandidate('src/components/AskPulse.tsx')).toBe(false)
    expect(isCandidate('src/lib/does-not-exist.ts')).toBe(false)
  })
  it('unwraps a fenced answer', () => {
    expect(unfence('Hier:\n```ts\nimport x\n```\nfertig')).toBe('import x\n')
    expect(unfence('import y')).toBe('import y\n')
  })
})
