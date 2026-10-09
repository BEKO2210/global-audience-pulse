import { Briefcase, Fire, Moon, MoonStars, SunHorizon } from '@phosphor-icons/react'

const icons = {
  moon: Moon,
  sunrise: SunHorizon,
  briefcase: Briefcase,
  fire: Fire,
  'moon-stars': MoonStars,
}

export function PhaseIcon({ icon, size = 15 }: { icon: keyof typeof icons; size?: number }) {
  const Icon = icons[icon]
  return <Icon size={size} weight="regular" aria-hidden="true" />
}
