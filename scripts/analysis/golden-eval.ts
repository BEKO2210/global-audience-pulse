// Runs one writer model on golden cases (T-020/T-021) and appends one JSON line per case.
//   node golden-eval.mjs <model> <from> <to> <out.jsonl>
// Backends: Ollama (default) or an OpenAI-compatible server (WRITER_URL, e.g. llama-server for gemma26b).
import { appendFileSync, readFileSync } from 'node:fs'
import { PROMPT, SCHEMA, type Facts } from './report'
import { scoreReport, type WrittenReport } from './golden'

const [model = 'gemma4:12b-it-qat', from = '0', to = '30', out = 'golden.jsonl'] =
  process.argv.slice(2)
const OLLAMA = process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434'
const WRITER_URL = process.env.WRITER_URL
const cases = JSON.parse(readFileSync('scripts/analysis/golden/facts.json', 'utf8')) as {
  id: string
  facts: Facts
}[]

async function write(facts: Facts): Promise<WrittenReport> {
  if (WRITER_URL) {
    const response = await fetch(`${WRITER_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        chat_template_kwargs: { enable_thinking: false },
        messages: [{ role: 'user', content: PROMPT(facts) }],
        response_format: { type: 'json_object', schema: SCHEMA },
      }),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    return JSON.parse(data.choices[0].message.content)
  }
  const response = await fetch(`${OLLAMA}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      think: false,
      format: SCHEMA,
      options: { temperature: 0.4, num_ctx: 8192 },
      keep_alive: 0,
      messages: [{ role: 'user', content: PROMPT(facts) }],
    }),
  })
  if (!response.ok) throw new Error(`Ollama ${response.status}`)
  const data = await response.json()
  return JSON.parse(data.message.content)
}

for (const item of cases.slice(Number(from), Number(to))) {
  const started = performance.now()
  try {
    const report = await write(item.facts)
    const seconds = Math.round((performance.now() - started) / 100) / 10
    appendFileSync(
      out,
      `${JSON.stringify({ model, id: item.id, seconds, score: scoreReport(item.facts, report), report })}\n`,
    )
    console.log(item.id, seconds, scoreReport(item.facts, report).pass)
  } catch (error) {
    appendFileSync(out, `${JSON.stringify({ model, id: item.id, error: String(error) })}\n`)
    console.log(item.id, 'Fehler', String(error))
  }
}
