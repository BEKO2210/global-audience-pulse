import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { cacheKey, dispatch, limiter, loadReusable, saveRun } from './orchestrator.mjs'
import { PLATFORMS, resolveSelection } from './platforms.mjs'
import { ollamaProvider } from './providers.mjs'
import { errorResult, validateResult } from './schema.mjs'
import { combine, parseRedditAtom, parseRss, parseTrends24 } from './sources.mjs'
import { parseAnswer } from './ui.mjs'

const good = (platform = 'X (Twitter)') => ({
  platform,
  status: 'success',
  topTrends: ['a'],
  provenHooks: ['b'],
  corePainPoints: ['c'],
  actionableRecommendation: 'd',
})

describe('validateResult', () => {
  it('accepts the exact schema and rejects extra, missing or mistyped fields', () => {
    expect(validateResult(good())).toEqual([])
    expect(validateResult(errorResult('X', 'kaputt'))).toEqual([])
    expect(validateResult({ ...good(), extra: 1 })).toContain('unbekanntes Feld extra')
    const { provenHooks: _, ...missing } = good()
    expect(validateResult(missing)).toContain('fehlt: provenHooks')
    expect(validateResult({ ...good(), status: 'ok' })[0]).toMatch(/status/)
    expect(validateResult({ ...good(), topTrends: [1] })[0]).toMatch(/topTrends/)
  })
})

describe('resolveSelection', () => {
  it('combines numbers, ids and categories without duplicates, in platform order', () => {
    expect(resolveSelection('reddit, 1').map((p) => p.id)).toEqual(['x', 'reddit'])
    expect(resolveSelection('tech github').map((p) => p.id)).toEqual(['github', 'hackernews'])
    expect(resolveSelection('all')).toHaveLength(10)
    expect(() => resolveSelection('myspace')).toThrow(/myspace/)
  })
})

describe('parseRedditAtom', () => {
  it('extracts title, subreddit and link and decodes entities', () => {
    const xml =
      '<feed><entry><category term="creators" label="r/creators"/><title>Hooks &amp; retention</title><link href="https://www.reddit.com/r/creators/1"/></entry></feed>'
    expect(parseRedditAtom(xml)).toEqual([
      'Hooks & retention (r/creators) https://www.reddit.com/r/creators/1',
    ])
  })
})

describe('dispatch', () => {
  const [x, linkedin, youtube] = PLATFORMS.slice(0, 3).map((p) => ({
    ...p,
    live: async () => ['a', 'b', 'c', 'd', 'e'],
  }))

  it('isolates failures: a throwing and a hanging agent do not stop the others', async () => {
    const provider = {
      async run(platform, { signal }) {
        if (platform.id === 'linkedin') throw new Error('429 rate limit')
        if (platform.id === 'youtube')
          await new Promise((_, reject) =>
            signal.addEventListener('abort', () => reject(signal.reason)),
          )
        return { result: good(platform.name), sources: ['https://x.com/a'], searches: 1 }
      },
    }
    const states = []
    const { results } = await dispatch([x, linkedin, youtube], provider, {
      today: '2026-10-10',
      timeoutMs: 50,
      onState: (id, s) => states.push(`${id}:${s}`),
    })
    expect(results.map((r) => r.result.status)).toEqual(['success', 'error', 'error'])
    expect(results[1].result.actionableRecommendation).toBe('429 rate limit')
    expect(results[2].result.actionableRecommendation).toMatch(/Timeout/)
    expect(states).toContain('x:done')
    for (const r of results) expect(validateResult(r.result)).toEqual([])
  })

  it('reports thin evidence as an error instead of asking the model', async () => {
    const thin = { ...x, live: async () => ['nur eins'] }
    const provider = {
      run: () => {
        throw new Error('should not run')
      },
    }
    const { results } = await dispatch([thin], provider, { today: '2026-10-10' })
    expect(results[0].result.actionableRecommendation).toMatch(/Nur 1 Live-Belege/)
  })

  it('reuses cached successes without calling the provider', async () => {
    const provider = {
      run: () => {
        throw new Error('should not run')
      },
    }
    const reuse = { x: { id: 'x', result: good(), sources: [], searches: 0 } }
    const { results } = await dispatch([x], provider, { today: '2026-10-10', reuse })
    expect(results[0].cached).toBe(true)
  })
})

describe('run cache', () => {
  it('saves a run and reloads only fresh successes with the same key', () => {
    const dir = mkdtempSync(join(tmpdir(), 'research-'))
    const key = cacheKey(' KI ', 'anthropic:haiku')
    const now = new Date('2026-10-10T12:00:00Z')
    const file = saveRun(
      dir,
      {
        createdAt: now.toISOString(),
        key,
        results: [
          { id: 'x', result: good() },
          { id: 'reddit', result: errorResult('Reddit', 'kaputt') },
        ],
      },
      now,
    )
    expect(JSON.parse(readFileSync(file, 'utf8')).key).toBe('anthropic:haiku::ki')
    expect(Object.keys(loadReusable(dir, key, 3_600_000, now.getTime() + 60_000))).toEqual(['x'])
    expect(loadReusable(dir, key, 3_600_000, now.getTime() + 7_200_000)).toEqual({})
    expect(
      loadReusable(dir, cacheKey('anderes', 'anthropic:haiku'), 3_600_000, now.getTime()),
    ).toEqual({})
  })
})

describe('parseRss / parseTrends24', () => {
  it('reads Google News items with date and link', () => {
    const xml =
      '<rss><channel><title>x</title><item><title>Reels &amp; Trends - Blog</title><link>https://news.example/a</link><pubDate>Fri, 09 Oct 2026 08:00:00 GMT</pubDate></item></channel></rss>'
    expect(parseRss(xml)).toEqual(['Reels & Trends - Blog (2026-10-09) https://news.example/a'])
  })

  it('takes only the latest-hour list from trends24 and dedupes', () => {
    const html =
      '<ol class=trend-card__list><li><a class=trend-link href=#>#Eins</a></li><li><a class=trend-link href=#>Zwei</a></li><li><a class=trend-link>#Eins</a></li></ol>' +
      '<ol class=trend-card__list><li><a class=trend-link>Alt</a></li></ol>'
    expect(parseTrends24(html)).toEqual(['#Eins', 'Zwei'])
  })
})

describe('parseAnswer', () => {
  it('reads plain selections and pasted command lines', () => {
    expect(parseAnswer('  ')).toEqual({ selection: 'all' })
    expect(parseAnswer('1,7')).toEqual({ selection: '1,7' })
    expect(
      parseAnswer('npm run research -- --platforms x,instagram --topic "Content Creator"'),
    ).toEqual({ selection: 'x,instagram', topic: 'Content Creator' })
    expect(parseAnswer("--topic 'KI'")).toEqual({ selection: 'all', topic: 'KI' })
  })
})

describe('combine', () => {
  it('keeps working sources and only fails when every source fails', async () => {
    const down = () => Promise.reject(new Error('503'))
    expect(await combine(down, async () => ['a'])).toEqual(['a'])
    await expect(combine(down, down)).rejects.toThrow('503')
  })
})

describe('limiter', () => {
  it('never runs more than the allowed number of tasks at once', async () => {
    const run = limiter(1)
    let active = 0
    let peak = 0
    const task = () =>
      run(async () => {
        peak = Math.max(peak, ++active)
        await new Promise((r) => setTimeout(r, 5))
        active--
      })
    await Promise.all([task(), task(), task()])
    expect(peak).toBe(1)
  })
})

describe('ollamaProvider', () => {
  const reply = (content) => async () => ({
    ok: true,
    json: async () => ({ message: { content: JSON.stringify(content) } }),
  })

  it('returns the normalized result with the platform name and evidence URLs as sources', async () => {
    const provider = ollamaProvider({
      fetchImpl: reply({ ...good('egal'), topTrends: [' a ', 'a', ''] }),
    })
    const out = await provider.run(PLATFORMS[0], {
      today: '2026-10-10',
      evidence: ['Trend eins https://trends24.in/germany/', 'ohne Link'],
    })
    expect(out.result.platform).toBe('X (Twitter)')
    expect(out.result.topTrends).toEqual(['a'])
    expect(out.sources).toEqual(['https://trends24.in/germany/'])
  })

  it('rejects answers that break the schema and runs without evidence', async () => {
    const provider = ollamaProvider({ fetchImpl: reply({ ...good(), extra: true }) })
    await expect(provider.run(PLATFORMS[0], { today: '', evidence: ['x'] })).rejects.toThrow(
      /Schema/,
    )
    await expect(provider.run(PLATFORMS[0], { today: '', evidence: [] })).rejects.toThrow(
      /keine Daten/,
    )
  })
})

describe('publish payload', () => {
  it('maps evidence lines to deduped source links and keeps the AI labels', async () => {
    const { buildPayload, toSource } = await import('./publish.mjs')
    expect(toSource('Titel – Blog (2026-10-09) https://a.example/x')).toEqual({
      title: 'Titel – Blog',
      url: 'https://a.example/x',
    })
    expect(toSource('ohne Link')).toBeNull()
    const payload = buildPayload({
      results: [
        {
          id: 'x',
          result: good(),
          evidence: 3,
          evidenceSample: ['A https://t.example/', 'B https://t.example/', 'C https://u.example/'],
        },
      ],
      durationMs: 1000,
      model: 'qwen3.5:9b',
      now: new Date('2026-10-10T12:00:00Z'),
    })
    expect(payload).toMatchObject({
      version: 1,
      aiGenerated: true,
      generatedAt: '2026-10-10T12:00:00.000Z',
    })
    expect(payload.platforms[0]).toMatchObject({
      id: 'x',
      name: 'X (Twitter)',
      category: 'social',
      evidence: 3,
    })
    expect(payload.platforms[0]).not.toHaveProperty('platform')
    expect(payload.platforms[0].sources.map((s) => s.url)).toEqual([
      'https://t.example/',
      'https://u.example/',
    ])
  })
})
