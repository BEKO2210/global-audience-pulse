// Bench table from cage-ai/results/bench.jsonl: per model, correct verdicts, misses and mean judgment time.
import { readFileSync } from 'node:fs'

const rows = readFileSync('cage-ai/results/bench.jsonl', 'utf8')
  .trim()
  .split('\n')
  .map((l) => JSON.parse(l))
const byModel = new Map()
for (const r of rows) byModel.set(r.model, [...(byModel.get(r.model) ?? []), r])
console.log('model | correct | clean ok | defects caught | mean s | wrong cases')
for (const [model, list] of byModel) {
  const ok = list.filter((r) => r.verdict === r.expect)
  const clean = list.filter((r) => r.expect === 'holds')
  const bad = list.filter((r) => r.expect === 'fails')
  const mean = list.reduce((a, r) => a + r.ms, 0) / list.length / 1000
  console.log(
    `${model} | ${ok.length}/${list.length} | ${clean.filter((r) => r.verdict === 'holds').length}/${clean.length} | ${bad.filter((r) => r.verdict === 'fails').length}/${bad.length} | ${mean.toFixed(1)} | ${list
      .filter((r) => r.verdict !== r.expect)
      .map((r) => `${r.case}=${r.verdict}`)
      .join(', ')}`,
  )
}
