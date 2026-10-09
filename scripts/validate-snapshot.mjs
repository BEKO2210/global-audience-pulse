import { readFile } from 'node:fs/promises'

const ids = ['us_east', 'us_west', 'eu_central', 'eu_uk', 'latam', 'mena', 'india', 'east_asia']
const snapshot = JSON.parse(
  await readFile(new URL('../public/data/snapshot.json', import.meta.url), 'utf8'),
)
const errors = []

const generated = Date.parse(snapshot.generatedAt)
if (!Number.isFinite(generated)) errors.push('generatedAt fehlt oder ist ungültig')
for (const mode of ['reach', 'value']) {
  const weights = snapshot.weights?.[mode]
  if (!weights || ids.some((id) => !Number.isFinite(weights[id]) || weights[id] < 0)) {
    errors.push(`weights.${mode} ist unvollständig oder ungültig`)
  }
}
for (const [id, profile] of Object.entries(snapshot.profiles ?? {})) {
  if (!ids.includes(id)) errors.push(`Unbekannte Profil-ID: ${id}`)
  for (const kind of ['weekday', 'weekend']) {
    if (
      !Array.isArray(profile?.[kind]) ||
      profile[kind].length !== 24 ||
      !profile[kind].every(Number.isFinite)
    ) {
      errors.push(`profiles.${id}.${kind} muss 24 endliche Werte enthalten`)
    }
  }
}
if (!Object.keys(snapshot.profiles ?? {}).length)
  errors.push('Mindestens ein Messprofil ist erforderlich')

if (errors.length) {
  console.error(`Snapshot ungültig:\n- ${errors.join('\n- ')}`)
  process.exit(1)
}

const ageHours = (Date.now() - generated) / 3_600_000
if (ageHours > 48)
  console.warn(`::warning::Snapshot ist ${ageHours.toFixed(1)} Stunden alt (Warnschwelle: 48 h).`)
if (ageHours > 24 * 7) {
  console.error(`Snapshot ist ${ageHours.toFixed(1)} Stunden alt (Maximum: 7 Tage).`)
  process.exit(1)
}
console.log(`Snapshot gültig; Alter: ${Math.max(0, ageHours).toFixed(1)} Stunden.`)
