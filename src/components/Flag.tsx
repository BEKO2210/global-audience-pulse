import type { FlagCode } from '../config/flag-codes'
import { FLAG_URLS } from '../config/flags'
import { useMessages } from '../i18n/LocaleProvider'
import type { Messages } from '../i18n/locale'

const DE = { alt: (label: string) => `${label} Flagge` }
const EN: typeof DE = { alt: (label) => `${label} flag` }
const M: Messages<typeof DE> = { de: DE, en: EN }

export function Flag({
  code,
  label,
  size = 20,
}: {
  code: FlagCode
  label: string
  size?: 16 | 20 | 28
}) {
  const t = useMessages(M)
  return (
    <img
      className="flag-image"
      src={FLAG_URLS[code]}
      alt={label ? t.alt(label) : ''}
      width={size}
      height={Math.round((size * 3) / 4)}
    />
  )
}
