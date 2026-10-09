export function Flag({
  src,
  label,
  size = 20,
}: {
  src: string
  label: string
  size?: 16 | 20 | 28
}) {
  return (
    <img
      className="flag-image"
      src={src}
      alt={`${label} Flagge`}
      width={size}
      height={Math.round((size * 3) / 4)}
    />
  )
}
