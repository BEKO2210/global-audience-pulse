// Result contract every platform agent must satisfy (T-070).

export const STATUSES = ['success', 'error']

/** JSON Schema handed to the model (Anthropic tool input / Ollama `format`). */
export const RESULT_SCHEMA = {
  type: 'object',
  properties: {
    platform: { type: 'string' },
    status: { type: 'string', enum: STATUSES },
    topTrends: { type: 'array', items: { type: 'string' } },
    provenHooks: { type: 'array', items: { type: 'string' } },
    corePainPoints: { type: 'array', items: { type: 'string' } },
    actionableRecommendation: { type: 'string' },
  },
  required: [
    'platform',
    'status',
    'topTrends',
    'provenHooks',
    'corePainPoints',
    'actionableRecommendation',
  ],
  additionalProperties: false,
}

const LIST_KEYS = ['topTrends', 'provenHooks', 'corePainPoints']

/** Strict check of the agent JSON. Returns a list of problems (empty = valid). */
export function validateResult(value) {
  const errors = []
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ['kein Objekt']
  const allowed = new Set(RESULT_SCHEMA.required)
  for (const key of Object.keys(value))
    if (!allowed.has(key)) errors.push(`unbekanntes Feld ${key}`)
  for (const key of RESULT_SCHEMA.required) if (!(key in value)) errors.push(`fehlt: ${key}`)
  if ('platform' in value && (typeof value.platform !== 'string' || !value.platform.trim()))
    errors.push('platform muss ein nicht leerer String sein')
  if ('status' in value && !STATUSES.includes(value.status))
    errors.push(`status muss ${STATUSES.join(' | ')} sein`)
  for (const key of LIST_KEYS) {
    if (!(key in value)) continue
    const list = value[key]
    if (!Array.isArray(list) || list.some((s) => typeof s !== 'string'))
      errors.push(`${key} muss ein String-Array sein`)
  }
  if ('actionableRecommendation' in value && typeof value.actionableRecommendation !== 'string')
    errors.push('actionableRecommendation muss ein String sein')
  return errors
}

/** Error result in the same shape, so the UI and cache never special-case failures. */
export function errorResult(platform, message) {
  return {
    platform,
    status: 'error',
    topTrends: [],
    provenHooks: [],
    corePainPoints: [],
    actionableRecommendation: message,
  }
}

/** Trim whitespace, drop empty entries and cap list length; the model sometimes pads lists. */
export function normalizeResult(value, max = 5) {
  const out = { ...value }
  for (const key of LIST_KEYS) {
    out[key] = [...new Set(value[key].map((s) => s.trim()).filter(Boolean))].slice(0, max)
  }
  out.actionableRecommendation = value.actionableRecommendation.trim()
  return out
}
