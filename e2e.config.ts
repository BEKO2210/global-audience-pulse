// AI eyes of the test cage (tester-army/e2e): a local vision model on Ollama looks at the rendered page and judges
// what measurements cannot – overlapping or clipped text, a bar pushed off screen, unreadable text. Local only: no
// API key, telemetry off (npm scripts set E2E_TELEMETRY_DISABLED=1). Pick the model with E2E_MODEL.
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { web } from '@e2e-dev/web'
import type { E2EConfig } from 'e2e'

const ollama = createOpenAICompatible({
  name: 'ollama',
  baseURL: process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434/v1',
  // Ollama honours JSON-schema response formats on /v1
  supportsStructuredOutputs: true,
})
export const MODEL = process.env.E2E_MODEL ?? 'qwen3.5:9b-agent32k'

// its own port, so it never collides with the Playwright preview on 4173
const app = {
  url: 'http://127.0.0.1:4174/global-audience-pulse/',
  command: {
    executable: 'npx',
    args: ['vite', 'preview', '--host', '127.0.0.1', '--port', '4174', '--strictPort'],
  },
}

export default {
  targets: [{ name: 'phone', engine: web({ viewport: { width: 390, height: 844 } }), app }],
  tests: ['cage-ai/**/*.e2e.ts'],
  workers: 1,
  retries: 0,
  timeout: 900_000,
  cache: 'off',
  agents: {
    default: {
      model: ollama.chatModel(MODEL),
      judgmentTimeout: 600_000,
      context:
        'Global Audience Pulse: a live world-clock for creators. The fixed bar at the bottom of the phone screen is the time bar (clock, a small curve, "24 h" switch, the score). The big number at the top is the live score 0–100.',
    },
  },
} satisfies E2EConfig
