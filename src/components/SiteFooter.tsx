import { LEGAL } from '../config/legal'
import { DATA_SOURCES } from '../config/model'

export function SiteFooter({
  worldBankFreshness,
  wikimediaFreshness,
}: {
  worldBankFreshness: string
  wikimediaFreshness: string
}) {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <a
          className="wordmark footer-wordmark"
          href="#top"
          aria-label="Global Audience Pulse Start"
        >
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width="32" height="32" />
          <span>
            Global Audience
            <br />
            Pulse
          </span>
        </a>
        <p>Die Live-Weltuhr für bessere globale Veröffentlichungszeitpunkte.</p>
        <p className="footer-pricing">{LEGAL.pricingNotice}</p>
      </div>
      <div className="footer-columns">
        <nav className="footer-group" aria-labelledby="footer-legal">
          <h2 id="footer-legal">Rechtliches</h2>
          <a href={`${import.meta.env.BASE_URL}impressum/`}>Impressum</a>
          <a href={`${import.meta.env.BASE_URL}datenschutz/`}>Datenschutz</a>
          <a href={`${LEGAL.repository}/blob/main/LICENSE.md`}>Lizenz: PolyForm Noncommercial</a>
        </nav>
        <nav className="footer-group" aria-labelledby="footer-data">
          <h2 id="footer-data">Daten</h2>
          <a href={DATA_SOURCES.wikimedia}>Wikimedia</a>
          <span className="footer-freshness">Stand {wikimediaFreshness}</span>
          <a href={DATA_SOURCES.worldBank}>Weltbank</a>
          <span className="footer-freshness">Stand {worldBankFreshness}</span>
        </nav>
        <nav className="footer-group" aria-labelledby="footer-project">
          <h2 id="footer-project">Projekt</h2>
          <a href={LEGAL.repository}>GitHub-Repository</a>
          <span>Version {__APP_VERSION__}</span>
          <span>Lagebericht: stündlich von einem lokalen KI-Modell</span>
        </nav>
      </div>
    </footer>
  )
}
