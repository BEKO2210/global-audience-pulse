import { describe, expect, it } from 'vitest'
import { chunkFiles, parseDiff, renderReport, verifyFindings } from './local-review.mjs'

const DIFF = `diff --git a/src/a.ts b/src/a.ts
index 1..2 100644
--- a/src/a.ts
+++ b/src/a.ts
@@ -10,3 +10,4 @@ export function a() {
 const x = 1
-const y = 2
+const y = 3
+const z = 4
 return x
diff --git a/package-lock.json b/package-lock.json
--- a/package-lock.json
+++ b/package-lock.json
@@ -1 +1 @@
-{}
+{"a":1}
diff --git a/src/gone.ts b/src/gone.ts
--- a/src/gone.ts
+++ /dev/null
@@ -1 +0,0 @@
-old
`

const finding = (over = {}) => ({
  datei: 'src/a.ts',
  zeile: 11,
  schwere: 'mittel',
  kategorie: 'bug',
  problem: 'y falsch',
  vorschlag: 'prüfen',
  ...over,
})

describe('parseDiff', () => {
  it('numbers new-file lines and marks only added lines as changed', () => {
    const [file, ...rest] = parseDiff(DIFF)
    expect(rest).toEqual([])
    expect(file.path).toBe('src/a.ts')
    expect([...file.changed]).toEqual([11, 12])
    expect(file.lines).toEqual([
      '…',
      '10|  const x = 1',
      '-|- const y = 2',
      '11|+ const y = 3',
      '12|+ const z = 4',
      '13|  return x',
    ])
  })
})

describe('parseDiff removals', () => {
  it('attributes a pure removal to the following context line', () => {
    const [file] = parseDiff(
      'diff --git a/x.tsx b/x.tsx\n--- a/x.tsx\n+++ b/x.tsx\n@@ -1,3 +1,2 @@\n <svg\n-  role="img"\n   aria-label="a"\n',
    )
    expect([...file.changed]).toEqual([2])
    expect(file.lines).toContain('-|-   role="img"')
  })
})

describe('chunkFiles', () => {
  it('splits oversized files and keeps the file header on every part', () => {
    const lines = Array.from({ length: 50 }, (_, i) => `${i + 1}|+ ${'x'.repeat(40)}`)
    const chunks = chunkFiles([{ path: 'src/big.ts', lines, changed: new Set([1]) }], 600)
    expect(chunks.length).toBeGreaterThan(1)
    for (const c of chunks) {
      expect(c.startsWith('### Datei: src/big.ts\n')).toBe(true)
      expect(c.length).toBeLessThanOrEqual(700)
    }
  })
})

describe('verifyFindings', () => {
  const files = parseDiff(DIFF)

  it('drops findings on unknown files, unchanged lines or invalid enums, and dedupes', () => {
    const { kept, dropped } = verifyFindings(
      [
        finding(),
        finding(), // duplicate
        finding({ zeile: 10 }), // context line, not changed
        finding({ datei: 'src/other.ts' }),
        finding({ schwere: 'kritisch' }),
        finding({ zeile: 12, schwere: 'hoch', problem: 'z ungenutzt' }),
      ],
      files,
    )
    expect(dropped).toBe(4)
    expect(kept.map((f) => [f.zeile, f.schwere])).toEqual([
      [12, 'hoch'],
      [11, 'mittel'],
    ])
  })
})

describe('renderReport', () => {
  const meta = {
    model: 'qwen3.5:9b',
    base: 'main',
    baseSha: 'abc1234',
    headSha: 'def5678',
    dirty: false,
    files: 1,
    chunks: 1,
    seconds: 3,
    errors: [],
  }

  it('escapes table pipes and states when there is nothing to report', () => {
    const md = renderReport({ findings: [finding({ problem: 'a | b' })], dropped: 0, meta })
    expect(md).toContain('| mittel | bug | `src/a.ts:11` | a \\| b | prüfen |')
    expect(renderReport({ findings: [], dropped: 2, meta })).toContain('Keine Befunde.')
  })
})
