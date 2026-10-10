#!/usr/bin/env node
// T-033: hourly GitHub Action that watches the local-LLM report job via health.json and keeps exactly one
// GitHub issue open while it is broken. Runs in the cloud, so it also notices when pop-os is off.
//
// Alert when (a) the PC is on but the last FAILED_RUNS runs failed, or (b) no report for OFFLINE_HOURS
// (longer than any night). The issue closes itself on the next successful report.
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

export const FAILED_RUNS = 3
export const OFFLINE_HOURS = 24
const HEALTH_URL =
  'https://raw.githubusercontent.com/BEKO2210/global-audience-pulse/live-analysis/health.json'
const LABEL = 'lagebericht-alarm'

/** Pure decision: null = healthy, otherwise a German reason for the issue. */
export function decide(health, now = new Date()) {
  if (!health) return `health.json nicht erreichbar (${HEALTH_URL}).`
  const runs = health.runs ?? []
  const last = runs.slice(-FAILED_RUNS)
  if (last.length === FAILED_RUNS && last.every((r) => r.outcome === 'failed'))
    return `Die letzten ${FAILED_RUNS} Läufe sind fehlgeschlagen (zuletzt ${last.at(-1).endedAt}). Der Rechner läuft, der Job ist kaputt – Log: \`journalctl --user -u gap-analysis.service -n 80\`.`
  const lastSuccess = health.summary24h?.lastSuccess
  const ageHours = lastSuccess ? (now.getTime() - Date.parse(lastSuccess)) / 3_600_000 : Infinity
  if (ageHours > OFFLINE_HOURS)
    return `Seit ${Number.isFinite(ageHours) ? Math.round(ageHours) + ' Stunden' : 'Beginn'} kein erfolgreicher Lagebericht (letzter: ${lastSuccess ?? '–'}). pop-os aus oder Timer gestoppt? \`systemctl --user status gap-analysis.timer\``
  return null
}

function gh(...args) {
  return execFileSync('gh', args, { encoding: 'utf8' }).trim()
}

async function main() {
  let health = null
  try {
    const res = await fetch(`${HEALTH_URL}?t=${Date.now()}`)
    if (res.ok) health = await res.json()
  } catch {
    health = null
  }
  const reason = decide(health)
  const open = JSON.parse(
    gh('issue', 'list', '--label', LABEL, '--state', 'open', '--json', 'number'),
  )
  if (reason && !open.length) {
    gh(
      'label',
      'create',
      LABEL,
      '--color',
      'B60205',
      '--description',
      'Lokaler Lagebericht ausgefallen',
      '--force',
    )
    gh(
      'issue',
      'create',
      '--title',
      'Lagebericht ausgefallen',
      '--label',
      LABEL,
      '--body',
      `${reason}\n\nAutomatisch von report-watch; schließt sich beim nächsten erfolgreichen Bericht.`,
    )
    console.log('Issue geöffnet:', reason)
  } else if (reason) {
    console.log('Weiterhin ausgefallen (Issue offen):', reason)
  } else if (open.length) {
    for (const { number } of open)
      gh(
        'issue',
        'close',
        String(number),
        '--comment',
        `Wieder in Ordnung – letzter Bericht ${health.summary24h.lastSuccess}.`,
      )
    console.log('Issue geschlossen.')
  } else {
    console.log('Lagebericht gesund, letzter Erfolg', health.summary24h.lastSuccess)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
