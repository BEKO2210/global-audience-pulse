import { LEGAL } from '../config/legal'
import { DATA_SOURCES } from '../config/model'

export function SiteFooter() {
  const { contact } = LEGAL
  return (
    <>
      <section className="legal-section" id="impressum" aria-labelledby="impressum-title">
        <p className="eyebrow">Rechtliches</p>
        <h2 id="impressum-title">Impressum</h2>
        <p className="legal-lead">Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG)</p>
        <address>
          <strong>{contact.name}</strong>
          <span>{contact.street}</span>
          <span>{contact.postalCodeCity}</span>
          <span>{contact.country}</span>
          <span>
            E-Mail: <a href={`mailto:${contact.email}`}>{contact.email}</a>
          </span>
          {contact.phone && <span>{contact.phone}</span>}
        </address>
      </section>
      <section className="legal-section" id="datenschutz" aria-labelledby="privacy-title">
        <p className="eyebrow">Transparenz</p>
        <h2 id="privacy-title">Datenschutz</h2>
        <div className="legal-copy">
          <p>
            Verantwortlich für die Datenverarbeitung auf dieser Website ist {contact.name},{' '}
            {contact.street}, {contact.postalCodeCity}, {contact.country} (
            <a href={`mailto:${contact.email}`}>{contact.email}</a>).
          </p>
          <p>
            Diese App wird über GitHub Pages bereitgestellt. Beim Abruf kann GitHub technische
            Zugriffsdaten einschließlich der IP-Adresse protokollieren. Es gilt die{' '}
            <a href={LEGAL.githubPrivacy}>Datenschutzerklärung von GitHub</a>.
          </p>
          <p>
            Der Browser ruft Wikimedia-Seitenaufrufstatistiken direkt von wikimedia.org ab. Dabei
            ist die IP-Adresse für die Wikimedia Foundation sichtbar. Details stehen in der{' '}
            <a href={LEGAL.wikimediaPrivacy}>Datenschutzrichtlinie der Wikimedia Foundation</a>.
          </p>
          <p>
            Schriften werden selbst gehostet; es entstehen keine Anfragen an Google. Die App setzt
            keine Cookies, verwendet keine Analytics und kein Tracking. localStorage speichert nur
            deine Einstellungen zu Darstellung, Zielgruppe und Gewichtung auf diesem Gerät; diese
            Daten verlassen das Gerät nicht. Der PWA-Service-Worker speichert App-Dateien und den
            Daten-Snapshot im Browser-Cache, damit die Anwendung schneller und offline starten kann.
          </p>
          <p>
            Rechtsgrundlage für die technisch notwendige Bereitstellung ist Art. 6 Abs. 1 lit. f
            DSGVO (berechtigtes Interesse an einer sicheren, funktionsfähigen Website); das
            Speichern deiner Einstellungen erfolgt auf deinen Wunsch (§ 25 Abs. 2 Nr. 2 TDDDG). Du
            hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
            Widerspruch und Datenübertragbarkeit sowie das Recht auf Beschwerde bei einer
            Datenschutz-Aufsichtsbehörde, zum Beispiel beim Landesbeauftragten für den Datenschutz
            und die Informationsfreiheit Baden-Württemberg.
          </p>
        </div>
      </section>
      <footer className="site-footer">
        <div className="footer-brand">
          <strong>Global Audience Pulse v{__APP_VERSION__}</strong>
          <p>{LEGAL.pricingNotice}</p>
        </div>
        <nav aria-label="Rechtliche Links">
          <a href="#impressum">Impressum</a>
          <a href="#datenschutz">Datenschutz</a>
        </nav>
        <div className="footer-meta">
          <a href={`${LEGAL.repository}/blob/main/LICENSE.md`}>
            Quellcode: PolyForm Noncommercial 1.0.0 – keine kommerzielle Nutzung ohne Erlaubnis
          </a>
          <span>
            Daten: <a href={DATA_SOURCES.wikimedia}>Wikimedia Foundation</a> ·{' '}
            <a href={DATA_SOURCES.worldBank}>World Bank Open Data</a>
          </span>
          <a href={LEGAL.repository}>GitHub Repository</a>
        </div>
      </footer>
    </>
  )
}
