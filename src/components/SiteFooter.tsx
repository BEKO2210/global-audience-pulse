import { LEGAL } from '../config/legal'
import { Wordmark } from './LogoMark'
import { DATA_SOURCES } from '../config/model'
import { useMessages } from '../i18n/LocaleProvider'
import type { Messages } from '../i18n/locale'

const DE = {
  tagline: 'Die Live-Weltuhr für bessere globale Veröffentlichungszeitpunkte.',
  pricing: LEGAL.pricingNotice as string,
  legal: 'Rechtliches',
  imprint: 'Impressum',
  privacy: 'Datenschutz',
  license: 'Lizenz: PolyForm Noncommercial',
  data: 'Daten',
  wikimediaFresh: (ago: string) => `Stundenwerte · abgerufen ${ago}`,
  worldBank: 'Weltbank',
  newestPublished: 'neueste veröffentlichte',
  fetched: (ago: string) => `abgerufen ${ago}`,
  project: 'Projekt',
  repo: 'GitHub-Repository',
  report: 'Lagebericht: stündlich von einem lokalen KI-Modell',
}
const EN: typeof DE = {
  tagline: 'The live world clock for better global posting times.',
  pricing:
    'Global Audience Pulse is currently free to use. Scope, features and terms may change in the future.',
  legal: 'Legal',
  imprint: 'Legal notice',
  privacy: 'Privacy',
  license: 'Licence: PolyForm Noncommercial',
  data: 'Data',
  wikimediaFresh: (ago) => `Hourly values · fetched ${ago}`,
  worldBank: 'World Bank',
  newestPublished: 'latest published',
  fetched: (ago) => `fetched ${ago}`,
  project: 'Project',
  repo: 'GitHub repository',
  report: 'Briefing: hourly from a local AI model',
}
const M: Messages<typeof DE> = { de: DE, en: EN }

export function SiteFooter({
  worldBankFreshness,
  worldBankYears,
  wikimediaFreshness,
}: {
  worldBankFreshness: string
  /** e.g. "Datenjahr 2024–2025": the newest year the World Bank has published, not the fetch time. */
  worldBankYears: string
  wikimediaFreshness: string
}) {
  const t = useMessages(M)
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <Wordmark className="footer-wordmark" intro={false} />
        <p>{t.tagline}</p>
        <p className="footer-pricing">{t.pricing}</p>
      </div>
      <div className="footer-columns">
        <nav className="footer-group" aria-labelledby="footer-legal">
          <h2 id="footer-legal">{t.legal}</h2>
          <a href={`${import.meta.env.BASE_URL}impressum/`}>{t.imprint}</a>
          <a href={`${import.meta.env.BASE_URL}datenschutz/`}>{t.privacy}</a>
          <a href={`${LEGAL.repository}/blob/main/LICENSE.md`}>{t.license}</a>
        </nav>
        <nav className="footer-group" aria-labelledby="footer-data">
          <h2 id="footer-data">{t.data}</h2>
          <a href={DATA_SOURCES.wikimedia}>Wikimedia Pageviews</a>
          <span className="footer-freshness">{t.wikimediaFresh(wikimediaFreshness)}</span>
          <a href={DATA_SOURCES.worldBank}>{t.worldBank}</a>
          <span className="footer-freshness">
            {worldBankYears} · {t.newestPublished}
          </span>
          <span className="footer-freshness">{t.fetched(worldBankFreshness)}</span>
        </nav>
        <nav className="footer-group" aria-labelledby="footer-project">
          <h2 id="footer-project">{t.project}</h2>
          <a href={LEGAL.repository}>{t.repo}</a>
          <span>Version {__APP_VERSION__}</span>
          <span>{t.report}</span>
        </nav>
      </div>
    </footer>
  )
}
