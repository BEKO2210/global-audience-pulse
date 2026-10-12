import { REGIONS, type RegionId } from '../../src/config/regions'
import type { Snapshot } from '../../src/lib/snapshot'

export type AudienceWeights = Partial<Record<RegionId, number>> & { warnings: string[] }

const ISO2_TO_ISO3: Readonly<Record<string, string>> = {
  US: 'USA',
  DE: 'DEU',
  AT: 'AUT',
  CH: 'CHE',
  FR: 'FRA',
  GB: 'GBR',
  UK: 'GBR',
  IE: 'IRL',
  BR: 'BRA',
  MX: 'MEX',
  AR: 'ARG',
  CO: 'COL',
  CL: 'CHL',
  PE: 'PER',
  VE: 'VEN',
  EC: 'ECU',
  GT: 'GTM',
  BO: 'BOL',
  DO: 'DOM',
  HN: 'HND',
  PY: 'PRY',
  SV: 'SLV',
  NI: 'NIC',
  CR: 'CRI',
  PA: 'PAN',
  UY: 'URY',
  NL: 'NLD',
  BE: 'BEL',
  PL: 'POL',
  IT: 'ITA',
  ES: 'ESP',
  PT: 'PRT',
  CZ: 'CZE',
  DK: 'DNK',
  SE: 'SWE',
  NO: 'NOR',
  FI: 'FIN',
  AE: 'ARE',
  SA: 'SAU',
  EG: 'EGY',
  MA: 'MAR',
  DZ: 'DZA',
  TN: 'TUN',
  JO: 'JOR',
  LB: 'LBN',
  IQ: 'IRQ',
  KW: 'KWT',
  QA: 'QAT',
  OM: 'OMN',
  BH: 'BHR',
  IN: 'IND',
  PK: 'PAK',
  BD: 'BGD',
  LK: 'LKA',
  NP: 'NPL',
  JP: 'JPN',
  KR: 'KOR',
  TW: 'TWN',
}

export function countrySharesToWeights(shares: Record<string, number>): AudienceWeights {
  const weights = { warnings: [] } as unknown as AudienceWeights
  let unassigned = 0
  for (const [rawCode, share] of Object.entries(shares)) {
    if (!Number.isFinite(share) || share < 0) {
      weights.warnings.push(`Ungültiger Anteil für ${rawCode}: ${String(share)}`)
      continue
    }
    const code = rawCode.trim().toUpperCase()
    const iso3 = code.length === 2 ? ISO2_TO_ISO3[code] : code
    const matches = REGIONS.filter((region) => region.countries.includes(iso3))
    if (!matches.length) {
      unassigned += share
      continue
    }
    const configuredTotal = matches.reduce((sum, region) => sum + (region.usShare ?? 0), 0)
    for (const region of matches) {
      const fraction = configuredTotal
        ? (region.usShare ?? 0) / configuredTotal
        : 1 / matches.length
      weights[region.id] = (weights[region.id] ?? 0) + share * fraction
    }
  }
  if (unassigned > 0) weights.warnings.push(`Nicht zuordenbarer Zielgruppenanteil: ${unassigned}`)
  return weights
}

export function withAudience(
  snapshot: Snapshot,
  weights: Partial<Record<RegionId, number>>,
): Snapshot {
  const clean = Object.fromEntries(
    REGIONS.map((region) => [region.id, weights[region.id] ?? 0]),
  ) as Record<RegionId, number>
  return { ...snapshot, weightingMode: 'reach', weights: { ...snapshot.weights, reach: clean } }
}

export function withoutDeviation(snapshot: Snapshot): Snapshot {
  return {
    ...snapshot,
    profiles: Object.fromEntries(
      Object.entries(snapshot.profiles).map(([id, profile]) => [id, { ...profile, deviation: 0 }]),
    ),
  }
}
