// Re-applies the current scoring rules to a finished golden run without calling any model (T-020).
//   node golden-rescore.mjs <in.jsonl> <out.jsonl>
import { readFileSync, writeFileSync } from 'node:fs'
import type { Facts } from './report'
import { scoreReport } from './golden'

const [input = 'golden.jsonl', output = 'golden-rescored.jsonl'] = process.argv.slice(2)
const cases = JSON.parse(readFileSync('scripts/analysis/golden/facts.json', 'utf8')) as {
  id: string
  facts: Facts
}[]
const rows = readFileSync(input, 'utf8')
  .trim()
  .split('\n')
  .map((line) => JSON.parse(line))
const rescored = rows.map((row) => {
  const facts = cases.find((c) => c.id === row.id)?.facts
  return row.report && facts ? { ...row, score: scoreReport(facts, row.report) } : row
})
writeFileSync(output, `${rescored.map((row) => JSON.stringify(row)).join('\n')}\n`)
