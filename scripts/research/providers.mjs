// Local model backend for the platform agents: Ollama on the RTX 3070, no API key, no cost.
import { RESULT_SCHEMA, normalizeResult, validateResult } from './schema.mjs'

const OLLAMA = process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434'
export const DEFAULT_MODEL = 'qwen3.5:9b'

export function systemPrompt(platform, topic, today) {
  return `Du bist der Recherche-Agent für ${platform.name}. Heute ist ${today}.
Schwerpunkt: ${platform.focus}.
${topic ? `Thema/Nische des Creators: "${topic}".` : 'Keine Nische vorgegeben: allgemeine Creator-Trends.'}

Arbeite NUR mit den mitgelieferten Live-Daten (gerade aus dem Netz geholt; Quellen u. a. ${platform.domains.join(', ')}
und Nachrichten der letzten 7 Tage). Erfinde keine Trends, Zahlen, Zitate oder Accounts.
Schreibe AUSSCHLIESSLICH auf Deutsch (Eigennamen/Hashtags bleiben). Keine Vermutungen ("wahrscheinlich",
"likely", "vermutlich") – nur, was die Daten zeigen. Wähle Trends, die für Creator nutzbar sind; lass Unglücke,
Gewalt, Todesfälle sowie religiös oder politisch aufgeladene Einzelereignisse weg.
Liefere konkret und knapp (je Eintrag ≤ 140 Zeichen):
- topTrends: 3–5 aktuelle Trends/Themen auf ${platform.name}, belegt durch die Daten
- provenHooks: 3–5 Hook-Formeln, die zu diesen Trends passen (als Vorlage formuliert)
- corePainPoints: 3–5 Probleme/Fragen, die die Zielgruppe laut Daten äußert oder hat
- actionableRecommendation: ein konkreter nächster Post für diese Woche (Format, Hook, Zeitpunkt)
platform = "${platform.name}", status = "success".
Wenn die Daten nichts Belastbares hergeben: status "error" und den Grund in actionableRecommendation.
Antworte nur mit dem JSON-Objekt.`
}

export function evidenceMessage(evidence) {
  return `Live-Daten (gerade abgerufen, ${evidence.length} Einträge):\n${evidence.map((e) => `- ${e}`).join('\n')}`
}

export function ollamaProvider({ model = DEFAULT_MODEL, fetchImpl = fetch } = {}) {
  return {
    name: 'ollama',
    model,
    async run(platform, { topic, today, evidence, signal }) {
      if (!evidence?.length) throw new Error('Live-Quellen lieferten keine Daten')
      const res = await fetchImpl(`${OLLAMA}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          stream: false,
          think: false,
          format: RESULT_SCHEMA,
          keep_alive: '30s', // agents run back to back; free the GPU shortly after the last one
          options: { temperature: 0.2, num_ctx: 8192 },
          messages: [
            { role: 'system', content: systemPrompt(platform, topic, today) },
            { role: 'user', content: evidenceMessage(evidence.slice(0, 40)) },
          ],
        }),
        signal,
      })
      if (!res.ok) throw new Error(`Ollama ${res.status}: ${(await res.text()).slice(0, 160)}`)
      const input = JSON.parse((await res.json()).message.content)
      const problems = validateResult(input)
      if (problems.length) throw new Error(`Schema verletzt: ${problems.join('; ')}`)
      const sources = [
        ...new Set(evidence.map((e) => e.match(/https?:\/\/\S+/)?.[0]).filter(Boolean)),
      ]
      return { result: normalizeResult({ ...input, platform: platform.name }), sources }
    },
  }
}
