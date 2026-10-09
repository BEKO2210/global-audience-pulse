import sharp from 'sharp'

const outputs = [
  ['public/favicon.svg', 'public/favicon-32x32.png', 32, 32],
  ['public/icon.svg', 'public/apple-touch-icon.png', 180, 180],
  ['public/icon.svg', 'public/icon-192.png', 192, 192],
  ['public/icon.svg', 'public/icon-512.png', 512, 512],
  ['public/icon-maskable.svg', 'public/icon-maskable-512.png', 512, 512],
  ['public/og-image.svg', 'public/og-image.png', 1200, 630],
]

await Promise.all(
  outputs.map(([input, output, width, height]) =>
    sharp(input).resize(Number(width), Number(height)).png().toFile(output),
  ),
)
console.log(`Generated ${outputs.length} icon assets.`)
