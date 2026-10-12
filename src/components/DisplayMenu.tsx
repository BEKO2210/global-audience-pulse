import { useEffect, useId, useRef, useState, type ComponentType } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Check, Desktop, Moon, Sun, SlidersHorizontal, type IconProps } from '@phosphor-icons/react'
import { STYLES, STYLE_IDS, type StyleId } from '../config/styles'
import { track } from '../lib/analytics'
import { rovingKey } from '../lib/roving'
import { useLocale, useMessages } from '../i18n/LocaleProvider'
import type { Locale, Messages } from '../i18n/locale'
import './DisplayMenu.css'

export type ThemePreference = 'system' | 'light' | 'dark'

const DE = {
  open: 'Darstellung',
  language: 'Sprache',
  style: 'Stil',
  mode: 'Modus',
  modes: { system: 'System', light: 'Hell', dark: 'Dunkel' },
}
const EN: typeof DE = {
  open: 'Appearance',
  language: 'Language',
  style: 'Style',
  mode: 'Mode',
  modes: { system: 'System', light: 'Light', dark: 'Dark' },
}
const M: Messages<typeof DE> = { de: DE, en: EN }

const LANGUAGES: { id: Locale; name: string }[] = [
  { id: 'de', name: 'Deutsch' },
  { id: 'en', name: 'English' },
]
const LANGUAGE_IDS = LANGUAGES.map((language) => language.id)
const MODES = ['system', 'light', 'dark'] as const

const MODE_ICONS: Record<ThemePreference, ComponentType<IconProps>> = {
  system: Desktop,
  light: Sun,
  dark: Moon,
}

/**
 * One header control for language, style (three brands) and light/dark. A quiet sheet: three labelled groups,
 * style rows with a swatch and a check mark instead of tinted boxes.
 */
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
  const { locale, setLocale } = useLocale()
  const chooseLocale = (id: Locale) => {
    track('Sprache', { wert: id })
    setLocale(id)
  }
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
        onClick={() => setOpen((value) => !value)}
      >
        <SlidersHorizontal size={18} aria-hidden="true" />
        <span className="dm-trigger-label">{t.open}</span>
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
            transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <section className="dm-group" aria-labelledby={`${panelId}-lang`}>
              <h2 className="dm-label" id={`${panelId}-lang`}>
                {t.language}
              </h2>
              <div
                className="dm-segments"
                role="radiogroup"
                aria-labelledby={`${panelId}-lang`}
                onKeyDown={(event) => rovingKey(event, LANGUAGE_IDS, locale, chooseLocale)}
              >
                {LANGUAGES.map(({ id, name }) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    lang={id}
                    aria-checked={locale === id}
                    tabIndex={locale === id ? 0 : -1}
                    className="dm-segment"
                    onClick={() => chooseLocale(id)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </section>

            <section className="dm-group" aria-labelledby={`${panelId}-style`}>
              <h2 className="dm-label" id={`${panelId}-style`}>
                {t.style}
              </h2>
              <div
                className="dm-rows"
                role="radiogroup"
                aria-labelledby={`${panelId}-style`}
                onKeyDown={(event) => rovingKey(event, STYLE_IDS, style, onStyle)}
              >
                {STYLE_IDS.map((id) => {
                  const checked = style === id
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={checked}
                      tabIndex={checked ? 0 : -1}
                      className="dm-row"
                      onClick={() => onStyle(id)}
                    >
                      <span className="dm-dots" aria-hidden="true">
                        {STYLES[id].swatch[activeTheme].map((color, i) => (
                          <i key={i} style={{ background: color }} />
                        ))}
                      </span>
                      <span className="dm-row-text">
                        <strong>{STYLES[id].name[locale]}</strong>
                        <small>{STYLES[id].note[locale]}</small>
                      </span>
                      <Check className="dm-check" size={16} weight="bold" aria-hidden="true" />
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="dm-group" aria-labelledby={`${panelId}-mode`}>
              <h2 className="dm-label" id={`${panelId}-mode`}>
                {t.mode}
              </h2>
              <div
                className="dm-segments is-three"
                role="radiogroup"
                aria-labelledby={`${panelId}-mode`}
                onKeyDown={(event) => rovingKey(event, MODES, theme, onTheme)}
              >
                {MODES.map((value) => {
                  const Icon = MODE_ICONS[value]
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={theme === value}
                      tabIndex={theme === value ? 0 : -1}
                      className="dm-segment"
                      onClick={() => onTheme(value)}
                    >
                      <Icon size={16} aria-hidden="true" />
                      {t.modes[value]}
                    </button>
                  )
                })}
              </div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
