import { useEffect, useId, useRef, useState, type ComponentType } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Desktop, Moon, Sun, SlidersHorizontal, type IconProps } from '@phosphor-icons/react'
import { STYLES, STYLE_IDS, type StyleId } from '../config/styles'
import { useLocale, useMessages } from '../i18n/LocaleProvider'
import type { Messages } from '../i18n/locale'
import './DisplayMenu.css'

export type ThemePreference = 'system' | 'light' | 'dark'

const DE = {
  open: 'Darstellung',
  style: 'Stil',
  mode: 'Modus',
  modes: { system: 'System', light: 'Hell', dark: 'Dunkel' },
}
const EN: typeof DE = {
  open: 'Appearance',
  style: 'Style',
  mode: 'Mode',
  modes: { system: 'System', light: 'Light', dark: 'Dark' },
}
const M: Messages<typeof DE> = { de: DE, en: EN }

const MODE_ICONS: Record<ThemePreference, ComponentType<IconProps>> = {
  system: Desktop,
  light: Sun,
  dark: Moon,
}

/** O-014: one header control for style (three brands) and light/dark – replaces the three theme buttons. */
export function DisplayMenu({
  style,
  onStyle,
  theme,
  activeTheme,
  onTheme,
}: {
  style: StyleId
  onStyle: (style: StyleId) => void
  theme: ThemePreference
  activeTheme: 'light' | 'dark'
  onTheme: (theme: ThemePreference) => void
}) {
  const t = useMessages(M)
  const { locale } = useLocale()
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        trigger.current?.focus()
      }
    }
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  return (
    <div className="display-menu" ref={root}>
      <button
        ref={trigger}
        type="button"
        className="dm-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={t.open}
        title={t.open}
        onClick={() => setOpen((value) => !value)}
      >
        <SlidersHorizontal size={18} aria-hidden="true" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            className="dm-panel"
            role="group"
            aria-label={t.open}
            initial={reduce ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <p className="dm-label" id={`${panelId}-style`}>
              {t.style}
            </p>
            <div className="dm-styles" role="radiogroup" aria-labelledby={`${panelId}-style`}>
              {STYLE_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={style === id}
                  className="dm-style"
                  onClick={() => onStyle(id)}
                >
                  <span className="dm-swatch" aria-hidden="true">
                    {STYLES[id].swatch[activeTheme].map((color, i) => (
                      <i key={i} style={{ background: color }} />
                    ))}
                  </span>
                  <span className="dm-style-text">
                    <strong>{STYLES[id].name[locale]}</strong>
                    <small>{STYLES[id].note[locale]}</small>
                  </span>
                </button>
              ))}
            </div>
            <p className="dm-label" id={`${panelId}-mode`}>
              {t.mode}
            </p>
            <div className="dm-modes" role="radiogroup" aria-labelledby={`${panelId}-mode`}>
              {(['system', 'light', 'dark'] as const).map((value) => {
                const Icon = MODE_ICONS[value]
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={theme === value}
                    className="dm-mode"
                    onClick={() => onTheme(value)}
                  >
                    <Icon size={16} aria-hidden="true" />
                    {t.modes[value]}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
