// Bench table from cage-ai/results/bench.jsonl: per model, correct verdicts, misses and mean time per case.
//   node cage-ai/summary.mjs [round]   (default: the latest round; rows without a round are round 1)
import { readFileSync } from 'node:fs'

const all = readFileSync('cage-ai/results/bench.jsonl', 'utf8')
  .trim()
  .split('\n')
  .map((l) => JSON.parse(l))
  .map((r) => ({ round: 1, ...r }))
const round = Number(process.argv[2] ?? Math.max(...all.map((r) => r.round)))
const rows = all.filter((r) => r.round === round)
const byModel = new Map()
for (const r of rows) byModel.set(r.model, [...(byModel.get(r.model) ?? []), r])
console.log(`round ${round}`)
console.log('model | correct | clean ok | defects caught | mean s/case | wrong cases')
for (const [model, list] of byModel) {
  const ok = list.filter((r) => r.verdict === r.expect)
  const clean = list.filter((r) => r.expect === 'holds')
  const bad = list.filter((r) => r.expect === 'fails')
  const mean = list.reduce((a, r) => a + r.ms, 0) / list.length / 1000
  const wrong = list
    .filter((r) => r.verdict !== r.expect)
    .map((r) => `${r.case}=${r.verdict}${r.checks ? ` ${JSON.stringify(r.checks)}` : ''}`)
  console.log(
    `${model} | ${ok.length}/${list.length} | ${clean.filter((r) => r.verdict === 'holds').length}/${clean.length} | ${bad.filter((r) => r.verdict === 'fails').length}/${bad.length} | ${mean.toFixed(1)} | ${wrong.join(', ')}`,
  )
}
