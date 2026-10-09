import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { REGIONS } from '../src/config/regions.ts'

const output = resolve('public/data/snapshot.json')
const userAgent = 'GlobalAudiencePulse/1.0 (https://github.com/BEKO2210/global-audience-pulse)'
const regions = REGIONS
const wbRoot = 'https://api.worldbank.org/v2/country'
const wikiRoot = 'https://wikimedia.org/api/rest_v1/metrics/pageviews/aggregate'

async function json(url) {
  const response = await fetch(url, { headers: { 'User-Agent': userAgent } })
  if (!response.ok) throw new Error(`${response.status} ${url}`)
  return response.json()
}

async function worldBank(indicator) {
  const countries = [...new Set(regions.flatMap((r) => r.countries))].join(';')
  const url = `${wbRoot}/${countries}/indicator/${indicator}?format=json&mrnev=1&per_page=500`
  const body = await json(url)
  return { url, rows: Array.isArray(body) ? (body[1] ?? []) : [] }
}

const stamp = (date) => date.toISOString().replace(/[-:T]/g, '').slice(0, 10)

export function localParts(timestamp, zone) {
  if (!/^\d{10}$/.test(timestamp)) throw new Error(`Ungültiger Wikimedia-Zeitstempel: ${timestamp}`)
  const date = new Date(
    `${timestamp.slice(0, 4)}-${timestamp.slice(4, 6)}-${timestamp.slice(6, 8)}T${timestamp.slice(8, 10)}:00:00Z`,
  )
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hour: 'numeric',
    weekday: 'short',
    hourCycle: 'h23',
  }).formatToParts(date)
  return {
    hour: Number(parts.find((p) => p.type === 'hour')?.value),
    weekend: ['Sat', 'Sun'].includes(parts.find((p) => p.type === 'weekday')?.value),
  }
}

function profile(items, zone) {
  const sums = { weekday: Array(24).fill(0), weekend: Array(24).fill(0) }
  const counts = { weekday: Array(24).fill(0), weekend: Array(24).fill(0) }
  for (const item of items) {
    const p = localParts(item.timestamp, zone)
    const kind = p.weekend ? 'weekend' : 'weekday'
    sums[kind][p.hour] += item.views
    counts[kind][p.hour] += 1
  }
  const normalize = (kind) => {
    const avg = sums[kind].map((sum, i) => (counts[kind][i] ? sum / counts[kind][i] : 0))
    const max = Math.max(...avg, 1)
    return avg.map((v) => Math.round((v / max) * 1000) / 10)
  }
  return { weekday: normalize('weekday'), weekend: normalize('weekend') }
}

async function main() {
  try {
    let previous = {}
    try {
      previous = JSON.parse(await readFile(output, 'utf8'))
    } catch {
      /* First snapshot. */
    }
    const now = new Date()
    const lastFullHour = new Date(now.getTime() - 3_600_000)
    lastFullHour.setUTCMinutes(0, 0, 0)
    const start = new Date(lastFullHour.getTime() - 28 * 86_400_000)
    const [population, internet, gdp] = await Promise.all([
      worldBank('SP.POP.TOTL'),
      worldBank('IT.NET.USER.ZS'),
      worldBank('NY.GDP.PCAP.CD'),
    ])
    const byCode = (rows) =>
      Object.fromEntries(rows.filter((r) => r.countryiso3code).map((r) => [r.countryiso3code, r]))
    const pop = byCode(population.rows)
    const net = byCode(internet.rows)
    const gdpPerCapita = byCode(gdp.rows)
    const reachRaw = {}
    const valueRaw = {}
    const dataYears = {}
    for (const region of regions) {
      reachRaw[region.id] =
        region.countries.reduce((sum, code) => {
          const populationValue = Number(pop[code]?.value) || 0
          const internetValue = Number(net[code]?.value) || 0
          if (pop[code]?.date) dataYears[`${code}.population`] = Number(pop[code].date)
          if (net[code]?.date) dataYears[`${code}.internet`] = Number(net[code].date)
          return sum + (populationValue * internetValue) / 100
        }, 0) * (region.usShare ?? 1)
      valueRaw[region.id] =
        region.countries.reduce((sum, code) => {
          const populationValue = Number(pop[code]?.value) || 0
          const internetValue = Number(net[code]?.value) || 0
          const gdpValue = Number(gdpPerCapita[code]?.value) || 0
          if (gdpPerCapita[code]?.date)
            dataYears[`${code}.gdpPerCapita`] = Number(gdpPerCapita[code].date)
          return sum + ((populationValue * internetValue) / 100) * gdpValue
        }, 0) * (region.usShare ?? 1)
    }
    const normalize = (raw) => {
      const total = Object.values(raw).reduce((a, b) => a + b, 0)
      if (!Number.isFinite(total) || total <= 0)
        throw new Error('Weltbank lieferte keine gültigen Gewichte')
      return Object.fromEntries(Object.entries(raw).map(([id, value]) => [id, value / total]))
    }
    const weights = { reach: normalize(reachRaw), value: normalize(valueRaw) }
    const profiles = { ...(previous.profiles ?? {}) }
    const wikiUrls = []
    await Promise.all(
      regions
        .filter((r) => r.project)
        .map(async (region) => {
          const url = `${wikiRoot}/${region.project}/all-access/user/hourly/${stamp(start)}/${stamp(lastFullHour)}`
          wikiUrls.push(url)
          try {
            const body = await json(url)
            profiles[region.id] = {
              ...profile(body.items ?? [], region.timeZone),
              lastMeasuredAt: lastFullHour.toISOString(),
            }
          } catch (error) {
            console.warn(`Warnung: ${region.id} konnte nicht aktualisiert werden: ${error.message}`)
          }
        }),
    )
    const fetchedAt = new Date().toISOString()
    const snapshot = {
      generatedAt: fetchedAt,
      sources: {
        worldBank: { fetchedAt, urls: [population.url, internet.url, gdp.url] },
        wikimedia: { fetchedAt, urls: wikiUrls },
      },
      weights,
      weightingMode: 'value',
      profiles,
      dataYears,
    }
    await mkdir(dirname(output), { recursive: true })
    await writeFile(output, `${JSON.stringify(snapshot, null, 2)}\n`)
    console.log(`Snapshot geschrieben: ${output} (${Object.keys(profiles).length} Messprofile)`)
  } catch (error) {
    try {
      await readFile(output, 'utf8')
      console.warn(
        `Warnung: Aktualisierung fehlgeschlagen, bestehender Snapshot bleibt erhalten: ${error.message}`,
      )
    } catch {
      console.warn(
        `Warnung: Aktualisierung fehlgeschlagen und kein Snapshot vorhanden: ${error.message}`,
      )
    }
    process.exitCode = 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
