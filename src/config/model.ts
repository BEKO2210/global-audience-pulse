export const MODEL_CONFIG = {
  measuredBlend: 0.6,
  baselineBlend: 0.4,
  windowMinutes: 90,
  scanStepMinutes: 15,
  liveRefreshMinutes: 1,
  runtimeCacheMinutes: 30,
} as const

export const PHASES = [
  { id: 'sleep', name: 'Nachtruhe', emoji: '◌', from: 0, to: 6, color: 'var(--soft)' },
  { id: 'morning', name: 'Morgen', emoji: '◒', from: 6, to: 9, color: 'var(--series-3)' },
  { id: 'day', name: 'Aktiver Tag', emoji: '●', from: 9, to: 18, color: 'var(--series-2)' },
  { id: 'prime', name: 'Primetime', emoji: '✦', from: 18, to: 22, color: 'var(--accent)' },
  { id: 'late', name: 'Spätabend', emoji: '◐', from: 22, to: 24, color: 'var(--series-4)' },
] as const

export const STATUS_LEVELS = [
  { min: 78, label: 'Hochphase', verdict: 'Jetzt posten', tone: 'strong' },
  { min: 62, label: 'Gutes Momentum', verdict: 'Guter Moment', tone: 'good' },
  { min: 42, label: 'Im Aufbau', verdict: 'Noch etwas warten', tone: 'medium' },
  { min: 0, label: 'Ruhephase', verdict: 'Später posten', tone: 'quiet' },
] as const

export const DATA_SOURCES = {
  worldBank: 'https://api.worldbank.org/v2/country',
  worldBankPopulation: 'https://data.worldbank.org/indicator/SP.POP.TOTL',
  worldBankInternet: 'https://data.worldbank.org/indicator/IT.NET.USER.ZS',
  wikimedia: 'https://wikimedia.org/api/rest_v1/metrics/pageviews/aggregate',
  diagramDesign: 'https://github.com/cathrynlavery/diagram-design',
} as const

export const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--series-5)', '#8f8b77', '#9c76a8', '#62a39b'] as const
