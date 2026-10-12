import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import process from 'node:process'
import { PRESETS, REGIONS, type RegionId } from '../../src/config/regions'
import { parseSnapshot } from '../../src/lib/snapshot'
import { countrySharesToWeights, withAudience, withoutDeviation } from './audience'
import { constant, pastHourMean, studyHoursBaseline } from './baselines'
import { parseInstagramCsv } from './instagram-csv'
import { residualize } from './outcome'
import { renderValidationReport, type ValidationResult } from './report'
import { scoreAtPublish } from './score-at'
import { blockBootstrapCI, holm, permutationP, spearman, tercileUplift } from './stats'
import type { PostType, ResidualPost } from './types'

const SEED = 20_261_013
const repoRoot = process.cwd()

function argsOf(argv: readonly string[]) {
  const result = new Map<string, string>()
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i]!
    if (!key.startsWith('--')) throw new Error(`Unbekanntes Argument: ${key}`)
    const value = argv[i + 1]
    if (!value || value.startsWith('--')) throw new Error(`Wert fehlt für ${key}`)
    result.set(key.slice(2), value)
    i += 1
  }
  return result
}

function parseMinAge(value?: string): Record<PostType, number> {
  const result: Record<PostType, number> = { image: 7, carousel: 7, reel: 28, story: 0, other: 7 }
  if (!value) return result
  for (const entry of value.split(',')) {
    const [type, days] = entry.split('=')
    if (!(type && type in result) || !days || !Number.isFinite(Number(days)))
      throw new Error(`Ungültiges --min-age: ${entry}`)
    result[type as PostType] = Number(days)
  }
  return result
}

async function snapshotFrom(source?: string) {
  const target = source ?? join(repoRoot, 'public/data/snapshot.json')
  const text = /^https?:\/\//.test(target)
    ? await fetch(target).then((response) => {
        if (!response.ok)
          throw new Error(`Snapshot konnte nicht geladen werden: HTTP ${response.status}`)
        return response.text()
      })
    : await readFile(target, 'utf8')
  return parseSnapshot(JSON.parse(text) as unknown)
}

function isoWeek(date: Date) {
  const value = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = value.getUTCDay() || 7
  value.setUTCDate(value.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(value.getUTCFullYear(), 0, 1))
  return `${value.getUTCFullYear()}-W${String(Math.ceil(((value.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)).padStart(2, '0')}`
}

const sd = (values: readonly number[]) => {
  if (values.length < 2) return 0
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  return Math.sqrt(
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1),
  )
}

async function audienceSelection(
  args: Map<string, string>,
  snapshot: Awaited<ReturnType<typeof snapshotFrom>>,
) {
  const choices = ['audience', 'preset', 'regions'].filter((key) => args.has(key))
  if (choices.length > 1)
    throw new Error('Nur eine Option aus --audience, --preset und --regions ist erlaubt')
  if (args.has('audience')) {
    const raw = args.get('audience')!
    const json = existsSync(raw) ? await readFile(raw, 'utf8') : raw
    const parsed = JSON.parse(json) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      throw new Error('--audience erwartet ein JSON-Objekt')
    const shares = Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [key, Number(value)]),
    )
    const weights = countrySharesToWeights(shares)
    const selected = REGIONS.filter((region) => (weights[region.id] ?? 0) > 0).map(
      (region) => region.id,
    )
    if (!selected.length)
      throw new Error('Keine Zielgruppenanteile konnten Regionen zugeordnet werden')
    return { snapshot: withAudience(snapshot, weights), selected, warnings: weights.warnings }
  }
  if (args.has('preset')) {
    const wanted = args
      .get('preset')!
      .toLowerCase()
      .replace(/[^a-zäöü0-9]+/g, '-')
    const preset = PRESETS.find(
      (item) => item.name.toLowerCase().replace(/[^a-zäöü0-9]+/g, '-') === wanted,
    )
    if (!preset) throw new Error(`Unbekanntes Preset: ${args.get('preset')}`)
    return { snapshot, selected: [...preset.ids], warnings: [] }
  }
  if (args.has('regions')) {
    const selected = args
      .get('regions')!
      .split(',')
      .map((id) => id.trim())
    const known = new Set(REGIONS.map((region) => region.id))
    if (!selected.length || selected.some((id) => !known.has(id as RegionId)))
      throw new Error(`Ungültige --regions: ${args.get('regions')}`)
    return { snapshot, selected: selected as RegionId[], warnings: [] }
  }
  return { snapshot, selected: REGIONS.map((region) => region.id), warnings: [] }
}

export async function runValidation(argv = process.argv.slice(2)) {
  const args = argsOf(argv)
  const csvPath = args.get('csv')
  const timeZone = args.get('tz')
  if (!csvPath || !timeZone) throw new Error('Pflichtargumente: --csv <datei> --tz <IANA>')
  const now = args.has('now') ? new Date(args.get('now')!) : new Date()
  if (Number.isNaN(now.getTime())) throw new Error('Ungültiger Wert für --now')
  const parsed = parseInstagramCsv(await readFile(csvPath, 'utf8'), { timeZone })
  const baseSnapshot = await snapshotFrom(args.get('snapshot'))
  const audience = await audienceSelection(args, baseSnapshot)
  const snapshot = withoutDeviation(audience.snapshot)
  const outcome = residualize(parsed.posts, { now, minAgeDays: parseMinAge(args.get('min-age')) })
  const scored = outcome.rows.map((row) => ({
    ...row,
    score: scoreAtPublish(row.publishedAt, { selected: audience.selected, snapshot }),
  }))
  const rhoOf = (rows: readonly (ResidualPost & { score: number })[]) =>
    spearman(
      rows.map((row) => row.score),
      rows.map((row) => row.residual),
    )
  const blockOf = (row: ResidualPost) => isoWeek(row.publishedAt)
  const primaryCI = blockBootstrapCI(scored, blockOf, rhoOf, { B: 2000, seed: SEED, level: 0.95 })
  const upliftCI = blockBootstrapCI(scored, blockOf, tercileUplift, {
    B: 2000,
    seed: SEED,
    level: 0.95,
  })
  const withoutReels = scored.filter((row) => row.type !== 'reel')
  const split = Math.floor(scored.length / 2)
  const later = scored.slice(split)
  const predictions = later.map((row, index) => {
    const prior = scored.slice(0, split + index)
    return {
      residual: row.residual,
      score: row.score,
      hour: pastHourMean(row.publishedAt, prior, timeZone),
      study: studyHoursBaseline(row.publishedAt, timeZone),
      fixed: constant(),
    }
  })
  const response = predictions.map((row) => row.residual)
  const correlations = [
    spearman(
      predictions.map((row) => row.score),
      response,
    ),
    spearman(
      predictions.map((row) => row.hour),
      response,
    ),
    spearman(
      predictions.map((row) => row.study),
      response,
    ),
  ]
  const baselinePs =
    predictions.length > 1
      ? correlations.map((_, index) =>
          permutationP(
            predictions.map((row) => [row.score, row.hour, row.study][index]!),
            response,
            { n: 1000, seed: SEED + index },
          ),
        )
      : [1, 1, 1]
  const withoutReelsP = permutationP(
    withoutReels.map((row) => row.score),
    withoutReels.map((row) => row.residual),
    { n: 1000, seed: SEED },
  )
  const exploratoryPs = holm([withoutReelsP, ...baselinePs])
  const scores = scored.map((row) => row.score)
  const anchor = scored[0]?.publishedAt ?? now
  const weekly = Array.from({ length: 7 * 24 * 4 }, (_, index) =>
    scoreAtPublish(new Date(anchor.getTime() + index * 900_000), {
      selected: audience.selected,
      snapshot,
    }),
  )
  const weeklyRange = Math.max(...weekly) - Math.min(...weekly)
  const counts = Object.fromEntries(
    (['image', 'carousel', 'reel', 'story', 'other'] as const).map((type) => [
      type,
      scored.filter((row) => row.type === type).length,
    ]),
  )
  const exclusions: Record<string, number> = {}
  for (const item of outcome.excluded) exclusions[item.reason] = (exclusions[item.reason] ?? 0) + 1
  const result: ValidationResult = {
    generatedAt: now,
    timeZone,
    selected: audience.selected,
    snapshot,
    counts,
    ...(scored.length
      ? { period: { from: scored[0]!.publishedAt, to: scored.at(-1)!.publishedAt } }
      : {}),
    exclusions,
    score: {
      sd: sd(scores),
      min: scores.length ? Math.min(...scores) : Number.NaN,
      max: scores.length ? Math.max(...scores) : Number.NaN,
      weeklyRangeShare: weeklyRange ? (sd(scores) / weeklyRange) * 100 : 0,
    },
    primary: {
      n: scored.length,
      rho: rhoOf(scored),
      ci: primaryCI,
      p: permutationP(
        scores,
        scored.map((row) => row.residual),
        { n: 5000, seed: SEED },
      ),
    },
    exploratory: {
      uplift: tercileUplift(scored),
      upliftCI,
      withoutReels: {
        n: withoutReels.length,
        rho: rhoOf(withoutReels),
        adjustedP: exploratoryPs[0],
      },
      later: {
        n: later.length,
        scoreRho: correlations[0]!,
        pastHourMeanRho: correlations[1]!,
        studyHoursRho: correlations[2]!,
        constantRho: spearman(
          predictions.map((row) => row.fixed),
          response,
        ),
        adjustedPs: exploratoryPs.slice(1),
      },
    },
    warnings: [...parsed.warnings, ...audience.warnings],
  }
  const output =
    args.get('out') ??
    join(homedir(), '.local/share/gap-validation', `report-${now.toISOString().slice(0, 10)}.md`)
  const absoluteOutput = isAbsolute(output) ? output : resolve(output)
  const relative = absoluteOutput.slice(repoRoot.length)
  if (
    absoluteOutput === repoRoot ||
    (absoluteOutput.startsWith(repoRoot) && relative.startsWith('/'))
  )
    throw new Error('Der Bericht darf nicht ins Repository geschrieben werden')
  await mkdir(dirname(absoluteOutput), { recursive: true })
  await writeFile(absoluteOutput, renderValidationReport(result), 'utf8')
  return { result, output: absoluteOutput }
}

if (process.argv[1]?.endsWith('run.mjs') || process.argv[1]?.endsWith('run.ts')) {
  runValidation()
    .then(({ output }) => process.stdout.write(`${output}\n`))
    .catch((error: unknown) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
      process.exitCode = 1
    })
}
