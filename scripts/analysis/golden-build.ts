// Freezes the golden set (T-020) from the committed snapshot. Rerun only on purpose – results are compared
// across models on exactly these facts.
//   npx esbuild scripts/analysis/golden-build.ts --bundle --platform=node --format=esm --outfile=/tmp/gb.mjs && node /tmp/gb.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { parseSnapshot } from '../../src/lib/snapshot'
import { goldenFacts } from './golden'

const snapshot = {
  ...parseSnapshot(JSON.parse(readFileSync('public/data/snapshot.json', 'utf8'))),
  weightingMode: 'value' as const,
}
const cases = goldenFacts(snapshot)
writeFileSync('scripts/analysis/golden/facts.json', `${JSON.stringify(cases, null, 1)}\n`)
console.log(`${cases.length} Fälle geschrieben`)
