// Test cage – source rules. The runtime cage (e2e/cage) measures the rendered page; these checks stop the usual
// regressions before anything renders. A failure lists file:line; fix the code, never widen the allow-lists
// without a written reason here (see e2e/cage/README.md).
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const walk = (dir: string, ext: string[]): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return walk(path, ext)
    return ext.some((e) => path.endsWith(e)) && !path.endsWith('.test.ts') ? [path] : []
  })
const css = walk(join(ROOT, 'src'), ['.css'])
const tsx = walk(join(ROOT, 'src'), ['.tsx'])

/** Every line of the given files that matches, as "file:line  text". */
function offenders(files: string[], test: (line: string, file: string) => boolean) {
  return files.flatMap((file) =>
    readFileSync(file, 'utf8')
      .split('\n')
      .flatMap((line, i) =>
        test(line, file) ? [`${relative(ROOT, file)}:${i + 1}  ${line.trim()}`] : [],
      ),
  )
}
const isToken = (line: string) => /^\s*--[\w-]+\s*:/.test(line)

describe('design cage – source rules', () => {
  it('type never scales with the viewport (no vw inside clamp – it lands between the scale steps)', () => {
    expect(offenders(css, (line) => /clamp\([^;]*\dvw/.test(line))).toEqual([])
  })

  it('font sizes come from the --text-* tokens only', () => {
    expect(
      offenders(css, (line) => {
        if (isToken(line)) return false
        const size = line.match(/(?:^|[\s;{])font-size\s*:\s*([^;]+)/)?.[1]
        // the font shorthand: the size is the part before the "/line-height"
        const short = line.match(/(?:^|[\s;{])font\s*:\s*([^;]+)/)?.[1]?.split('/')[0]
        return [size, short].some((v) => v !== undefined && /\d(?:px|rem)\b/.test(v))
      }),
    ).toEqual([])
  })

  it('weights stay within 400 / 500 / 600', () => {
    expect(
      offenders(css, (line) => {
        const weight =
          line.match(/font-weight\s*:\s*(\w+)/)?.[1] ??
          line.match(/(?:^|[\s;{])font\s*:\s*(\d{3}|bold)\s/)?.[1]
        return (
          weight !== undefined &&
          /^(\d{3}|bold)$/.test(weight) &&
          !['400', '500', '600'].includes(weight)
        )
      }),
    ).toEqual([])
  })

  it('no all-caps labels', () => {
    expect(offenders([...css, ...tsx], (line) => /uppercase/.test(line))).toEqual([])
  })

  it('spacing literals sit on the 4 px grid (hairlines up to 2 px allowed)', () => {
    expect(
      offenders(css, (line) => {
        const m = line.match(
          /^\s*(?:padding|margin|gap|row-gap|column-gap)(?:-[a-z-]+)?\s*:\s*([^;]+);/,
        )
        if (!m) return false
        return [...m[1]!.matchAll(/(-?\d+(?:\.\d+)?)px/g)].some((x) => {
          const n = Math.abs(Number(x[1]))
          return n > 2 && n % 4 !== 0
        })
      }),
    ).toEqual([])
  })

  it('colours are tokens: no raw hex outside the token blocks in styles.css', () => {
    // allowed: alpha masks (#000 is the mask, not a colour) and the logo tile, whose brand colours are fixed (O-014)
    expect(
      offenders(css, (line, file) => {
        if (!/#[0-9a-fA-F]{3,8}\b/.test(line.replace(/\/\*.*?\*\//g, ''))) return false
        if (file.endsWith(join('src', 'styles.css')) && isToken(line)) return false
        if (/mask-image/.test(line)) return false
        if (file.endsWith('LogoMark.css')) return false
        return true
      }),
    ).toEqual([])
  })

  it('regions never wear the accent (the accent means the best time, not a place)', () => {
    const regionFiles = tsx.filter((file) =>
      /(Sparkline|ContributionBar|WorldMap|RegionCards|Flag)\.tsx$/.test(file),
    )
    expect(regionFiles.length).toBeGreaterThanOrEqual(4)
    expect(offenders(regionFiles, (line) => /--(accent|link)\b/.test(line))).toEqual([])
  })
})
