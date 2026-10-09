// Vite-only asset imports, kept out of regions.ts (which scripts/fetch-data.mjs loads in plain Node).
import usFlag from 'flag-icons/flags/4x3/us.svg?url'
import euFlag from 'flag-icons/flags/4x3/eu.svg?url'
import gbFlag from 'flag-icons/flags/4x3/gb.svg?url'
import brFlag from 'flag-icons/flags/4x3/br.svg?url'
import aeFlag from 'flag-icons/flags/4x3/ae.svg?url'
import inFlag from 'flag-icons/flags/4x3/in.svg?url'
import jpFlag from 'flag-icons/flags/4x3/jp.svg?url'
import type { FlagCode } from './flag-codes'

export const FLAG_URLS: Record<FlagCode, string> = {
  us: usFlag,
  eu: euFlag,
  gb: gbFlag,
  br: brFlag,
  ae: aeFlag,
  in: inFlag,
  jp: jpFlag,
}
