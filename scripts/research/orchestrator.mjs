// Parallel, failure-isolated dispatch of the platform agents plus the run cache.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { MIN_EVIDENCE } from './platforms.mjs'
import { errorResult } from './schema.mjs'

export const STATES = { pending: 'Wartet', running: 'Läuft', done: 'Fertig', error: 'Fehler' }

/** Minimal semaphore: the GPU runs one model call at a time, everything else stays parallel. */
export function limiter(max) {
  let active = 0
  const queue = []
  const next = () => {
    if (active >= max || !queue.length) return
    active++
    const { fn, resolve, reject } = queue.shift()
    fn()
      .then(resolve, reject)
      .finally(() => {
        active--
        next()
      })
  }
  return (fn) =>
    new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject })
      next()
    })
}

/**
 * Run every selected agent. Live data is fetched for all agents at once; model calls queue for the GPU
 * (`concurrency`, default 1). One failing agent (source down, timeout, bad JSON) never stops the others:
 * Promise.allSettled + a per-call timeout, and every failure becomes a schema-valid error result.
 */
export async function dispatch(
  platforms,
  provider,
  { topic, today, timeoutMs = 180_000, concurrency = 1, onState, reuse = {} },
) {
  const startedAt = Date.now()
  const gpu = limiter(concurrency)
  const tasks = platforms.map(async (platform) => {
    if (reuse[platform.id]) {
      onState?.(platform.id, 'done', 'aus Cache')
      return { ...reuse[platform.id], cached: true }
    }
    const t0 = Date.now()
    onState?.(platform.id, 'running', 'Live-Daten …')
    const evidence = platform.live ? await platform.live(topic) : []
    if (evidence.length < MIN_EVIDENCE)
      throw new Error(`Nur ${evidence.length} Live-Belege – zu wenig für belastbare Aussagen`)
    onState?.(platform.id, 'running', `${evidence.length} Belege · wartet auf GPU`)
    const out = await gpu(async () => {
      onState?.(platform.id, 'running', `${evidence.length} Belege · Modell rechnet`)
      const controller = new AbortController()
      const timer = setTimeout(
        () => controller.abort(new Error(`Timeout nach ${timeoutMs / 1000} s`)),
        timeoutMs,
      )
      try {
        return await provider.run(platform, { topic, today, evidence, signal: controller.signal })
      } finally {
        clearTimeout(timer)
      }
    })
    const ok = out.result.status === 'success'
    onState?.(
      platform.id,
      ok ? 'done' : 'error',
      ok
        ? `${evidence.length} Belege · ${out.sources.length} Quellen`
        : out.result.actionableRecommendation,
    )
    return {
      id: platform.id,
      ...out,
      evidence: evidence.length,
      durationMs: Date.now() - t0,
      cached: false,
    }
  })

  const settled = await Promise.allSettled(tasks)
  const results = settled.map((s, i) => {
    if (s.status === 'fulfilled') return s.value
    const platform = platforms[i]
    const message = s.reason?.message ?? String(s.reason)
    onState?.(platform.id, 'error', message)
    return {
      id: platform.id,
      result: errorResult(platform.name, message),
      sources: [],
      evidence: 0,
      durationMs: Date.now() - startedAt,
      cached: false,
    }
  })
  return { results, durationMs: Date.now() - startedAt }
}

export const cacheKey = (topic, provider) => `${provider}::${(topic ?? '').trim().toLowerCase()}`

/** Successful per-platform results from recent runs with the same topic + provider. */
export function loadReusable(dir, key, maxAgeMs, now = Date.now()) {
  const reuse = {}
  let files = []
  try {
    files = readdirSync(dir)
      .filter((f) => /^research-.*\.json$/.test(f))
      .sort()
      .reverse()
  } catch {
    return reuse
  }
  for (const f of files) {
    let run
    try {
      run = JSON.parse(readFileSync(join(dir, f), 'utf8'))
    } catch {
      continue
    }
    if (run.key !== key || now - Date.parse(run.createdAt) > maxAgeMs) continue
    for (const r of run.results) {
      if (r.result.status === 'success' && !reuse[r.id]) reuse[r.id] = { ...r, fromRun: f }
    }
  }
  return reuse
}

export function saveRun(dir, run, now = new Date()) {
  mkdirSync(dir, { recursive: true })
  const file = join(dir, `research-${now.toISOString().replace(/[:.]/g, '-')}.json`)
  writeFileSync(file, JSON.stringify(run, null, 2) + '\n')
  return file
}
