// Summary of a golden A/B run (T-021): pass rate per check and median seconds per model.
//   node scripts/analysis/golden-summary.mjs <out.jsonl>
import { readFileSync } from 'node:fs'

const rows = readFileSync(process.argv[2], 'utf8')
  .trim()
  .split('\n')
  .map((line) => JSON.parse(line))
const byModel = Map.groupBy(rows, (row) => row.model)
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : null
}
const checks = ['pass', 'zahlen', 'form', 'trend', 'fenster', 'markt']
console.log(['Modell', 'Fälle', 'Fehler', ...checks, 's (Median)'].join(' | '))
for (const [model, list] of byModel) {
  const ok = list.filter((row) => row.score)
  const rate = (key) => `${ok.filter((row) => row.score[key]).length}/${list.length}`
  console.log(
    [
      model,
      list.length,
      list.length - ok.length,
      ...checks.map(rate),
      median(ok.map((r) => r.seconds)),
    ].join(' | '),
  )
}
