import type { FlagCode } from '../config/flag-codes'
import { FLAG_URLS } from '../config/flags'

export function Flag({
  code,
  label,
  size = 20,
}: {
  code: FlagCode
  label: string
  size?: 16 | 20 | 28
}) {
  return (
    <img
      className="flag-image"
      src={FLAG_URLS[code]}
      alt={`${label} Flagge`}
      width={size}
      height={Math.round((size * 3) / 4)}
    />
  )
}
