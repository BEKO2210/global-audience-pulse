import type { FlagCode } from '../../config/flag-codes'

export interface AnalysisFacts {
  zeitpunkt?: string
  gesamt?: { score: number; status: string; empfehlung: string }
  trendNaechsteStunden?: { inStunden: number; score: number }[]
  regionen?: {
    id: string
    flagge: FlagCode
    ort: string
    region: string
    ortszeit: string
    phase: string
    score: number
    gewichtProzent: number
    beitragPunkte: number
  }[]
  zielgruppen?: {
    name: string
    scoreJetzt: number
    status: string
    besteZeit: string | null
    besteZeitScore: number | null
  }[]
  liveSignale?: {
    ort: string
    letzteStundeOrtszeit: string
    aufrufe: number
    typisch: number
    abweichungProzent: number
  }[]
  gedaechtnis?: {
    gesternGleicheZeit: number | null
    differenzZuGestern: number | null
    wochenmittelGleicheStunde: number | null
    wochenhoch: number | null
    wochentief: number | null
  }
}

export interface AnalysisReportBody {
  schlagzeile: string
  empfehlung: string
  analyse: string
  punkte: string[]
  zielgruppen?: { name: string; urteil: string }[]
}

export interface LiveAnalysisPayload {
  version?: number
  generatedAt: string
  model: string | null
  source: 'llm' | 'template'
  facts?: AnalysisFacts
  report: AnalysisReportBody
}
