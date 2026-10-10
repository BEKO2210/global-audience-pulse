import { LEGAL } from '../config/legal'
import { DATA_SOURCES } from '../config/model'

type LegalPageKind = 'impressum' | 'datenschutz'

function LegalHeader() {
  return (
    <header className="legal-header">
      <a
        className="wordmark"
        href={import.meta.env.BASE_URL}
        aria-label="Global Audience Pulse, Startseite"
      >
        <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width="32" height="32" />
        <span>
          Global Audience
          <br />
          Pulse
        </span>
      </a>
      <a className="legal-home-link" href={import.meta.env.BASE_URL}>
        Zur Startseite
      </a>
    </header>
  )
}

function LegalFooter() {
  return (
    <footer className="legal-page-footer">
      <span>Global Audience Pulse · Version {__APP_VERSION__}</span>
      <nav aria-label="Rechtliches">
        <a href={`${import.meta.env.BASE_URL}impressum/`}>Impressum</a>
        <a href={`${import.meta.env.BASE_URL}datenschutz/`}>Datenschutz</a>
      </nav>
    </footer>
  )
}

function Impressum() {
  const { contact } = LEGAL
  return (
    <>
      <p className="eyebrow">Rechtliches</p>
      <h1>Impressum</h1>
      <section aria-labelledby="provider-heading">
        <h2 id="provider-heading">Angaben gemäß § 5 DDG</h2>
        <address>
          <strong>{contact.name}</strong>
          <span>{contact.street}</span>
          <span>{contact.postalCodeCity}</span>
          <span>{contact.country}</span>
        </address>
      </section>
      <section aria-labelledby="contact-heading">
        <h2 id="contact-heading">Kontakt</h2>
        <p>
          E-Mail: <a href={`mailto:${contact.email}`}>{contact.email}</a>
          {contact.phone && (
            <>
              <br />
              Telefon: {contact.phone}
            </>
          )}
        </p>
      </section>
      <section aria-labelledby="license-heading">
        <h2 id="license-heading">Lizenz</h2>
        <p>
          Der Quellcode steht unter der{' '}
          <a href={`${LEGAL.repository}/blob/main/LICENSE.md`}>
            PolyForm Noncommercial License 1.0.0
          </a>
          . Eine kommerzielle Nutzung ist ohne gesonderte Erlaubnis nicht gestattet.
        </p>
      </section>
    </>
  )
}

function Datenschutz() {
  const { contact } = LEGAL
  return (
    <>
      <p className="eyebrow">Transparenz</p>
      <h1>Datenschutz</h1>
      <p className="legal-intro">
        Diese Hinweise erklären, welche technischen Daten beim Besuch von Global Audience Pulse
        verarbeitet werden. Die Anwendung setzt keine Cookies, verfolgt dich nicht über Websites
        hinweg und verwendet eine anonyme Reichweitenmessung.
      </p>
      <section>
        <h2>Verantwortlicher</h2>
        <address>
          <strong>{contact.name}</strong>
          <span>{contact.street}</span>
          <span>{contact.postalCodeCity}</span>
          <span>{contact.country}</span>
          <span>
            E-Mail: <a href={`mailto:${contact.email}`}>{contact.email}</a>
          </span>
        </address>
      </section>
      <section>
        <h2>Hosting (GitHub Pages)</h2>
        <p>
          Diese Website wird über GitHub Pages bereitgestellt. Beim Abruf verarbeitet GitHub
          technisch notwendige Zugriffsdaten, insbesondere die IP-Adresse, Browserinformationen,
          Zeitpunkt und angeforderte Datei. Weitere Angaben enthält die{' '}
          <a href={LEGAL.githubPrivacy}>Datenschutzerklärung von GitHub</a>.
        </p>
      </section>
      <section>
        <h2>Direkte Abrufe (Wikimedia)</h2>
        <p>
          Die Anwendung ruft Seitenaufrufstatistiken direkt von Wikimedia ab. Dabei sieht die
          Wikimedia Foundation die IP-Adresse und die üblichen technischen Abrufdaten. Details
          stehen in der{' '}
          <a href={LEGAL.wikimediaPrivacy}>Datenschutzrichtlinie der Wikimedia Foundation</a>.
        </p>
      </section>
      <section>
        <h2>Lokaler Lagebericht</h2>
        <p>
          Die Seite lädt den stündlich erstellten Lagebericht als <code>analysis.json</code> von{' '}
          <a href={DATA_SOURCES.liveAnalysis}>raw.githubusercontent.com</a> aus dem Repository
          dieses Projekts. Bei diesem Abruf erhält GitHub insbesondere die IP-Adresse und technische
          Verbindungsdaten.
        </p>
      </section>
      <section>
        <h2>Reichweitenmessung (Plausible)</h2>
        <p>
          Zur Verbesserung der App nutzen wir Plausible Community Edition auf einer vom Betreiber
          selbst gehosteten Statistik-Instanz in Deutschland. Plausible setzt keine Cookies,
          speichert nichts auf deinem Gerät und speichert keine IP-Adressen. Die IP-Adresse wird nur
          kurzfristig zusammen mit einem täglich neu erzeugten und anschließend gelöschten Salt zu
          einem Tages-Hash verarbeitet. Dadurch können Besuche gezählt, aber nicht über verschiedene
          Tage hinweg wiedererkannt werden.
        </p>
        <p>
          Erfasst werden die besuchte Seite, die verweisende Seite (Referrer), das Land sowie grobe
          Angaben zu Gerätetyp, Browser und Betriebssystem. Zusätzlich messen wir Bedienereignisse
          für Zeitwahl und Horizont, Gewichtung und Zielgruppe, Presets, Planer-Tabs,
          Kalender-Downloads, Kopieren und Teilen, aufgeklappte Berichte, Darstellung,
          Regionsdetails und Rechtsseiten sowie gerundete technische Web-Vitals-Werte. Freie Texte
          und personenbezogene Inhalte werden nicht übermittelt.
        </p>
        <p>
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Unser berechtigtes Interesse besteht
          darin, Nutzung und technische Qualität der App aggregiert zu verstehen und sie zu
          verbessern. Die Ergebnisse werden ausschließlich aggregiert und ohne feste Löschfrist
          gespeichert; eine Zuordnung zu einzelnen Personen ist nicht möglich. Der Verarbeitung
          kannst du jederzeit formlos per E-Mail an{' '}
          <a href={`mailto:${contact.email}`}>{contact.email}</a> widersprechen.
        </p>
        <p>
          Die Statistik-Instanz wird durch Cloudflare als Proxy ausgeliefert und geschützt. Dabei
          verarbeitet Cloudflare, Inc. in den USA insbesondere die IP-Adresse und technische
          Verbindungsdaten. Die Übermittlung in die USA stützt sich auf die Zertifizierung von
          Cloudflare nach dem EU-US Data Privacy Framework. Weitere Informationen enthält die{' '}
          <a href={LEGAL.cloudflarePrivacy}>Datenschutzerklärung von Cloudflare</a>; die
          Zertifizierung ist in der{' '}
          <a href={LEGAL.dataPrivacyFramework}>Data Privacy Framework List</a> dokumentiert.
        </p>
      </section>
      <section>
        <h2>Automatische AI-Analyse (Transparenz nach Art. 50 KI-Verordnung)</h2>
        <p>
          Der Lagebericht wird stündlich automatisch von einem KI-Sprachmodell erzeugt, das lokal
          auf dem Rechner des Betreibers läuft. Es erhält ausschließlich die aggregierten Zahlen
          dieser Seite (Aktivitätswerte, Ortszeiten, öffentliche Wikimedia- und
          Weltbank-Statistiken) und keine personenbezogenen Daten von Besuchenden. Der Text wird
          nicht von Menschen redigiert; jede Zahl wird automatisch gegen die Daten geprüft, ein
          zweites Modell prüft die Aussagen. Auf der Seite ist der Text sichtbar als „Automatische
          AI-Analyse“ gekennzeichnet und im Quelltext maschinenlesbar markiert (
          <code>data-ai-generated</code>, IPTC <code>trainedAlgorithmicMedia</code>). Die Analyse
          ist eine Einschätzung, keine Beratung.
        </p>
      </section>
      <section>
        <h2>Schriften (self-hosted)</h2>
        <p>
          Alle verwendeten Schriften werden zusammen mit der Website ausgeliefert. Es entstehen
          keine Schrift-Abrufe bei Google oder anderen externen Schriftanbietern.
        </p>
      </section>
      <section>
        <h2>Speicher im Browser (localStorage, Service Worker)</h2>
        <p>
          <code>localStorage</code> speichert ausschließlich deine Einstellungen zu Darstellung,
          Zielgruppe und Gewichtung auf deinem Gerät. Der Service Worker legt App-Dateien und den
          Daten-Snapshot im Browser-Cache ab, damit die Anwendung schneller und offline starten
          kann. Du kannst beides über die Website-Daten deines Browsers löschen.
        </p>
      </section>
      <section>
        <h2>Keine Cookies/kein Tracking</h2>
        <p>
          Global Audience Pulse setzt keine Cookies, betreibt kein Tracking über Websites hinweg und
          verwendet keine personalisierte Werbung. Die anonyme Reichweitenmessung ist auf diese App
          beschränkt.
        </p>
      </section>
      <section>
        <h2>Rechtsgrundlagen</h2>
        <p>
          Rechtsgrundlage der technisch notwendigen Bereitstellung ist Art. 6 Abs. 1 lit. f DSGVO.
          Das berechtigte Interesse besteht in einer sicheren, stabilen und funktionsfähigen
          Website. Die lokale Speicherung deiner gewählten Einstellungen erfolgt auf deinen Wunsch
          gemäß § 25 Abs. 2 Nr. 2 TDDDG.
        </p>
      </section>
      <section>
        <h2>Deine Rechte + Aufsichtsbehörde BW</h2>
        <p>
          Du hast nach Maßgabe der DSGVO insbesondere Rechte auf Auskunft, Berichtigung, Löschung,
          Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Außerdem kannst du
          dich beim{' '}
          <a href="https://www.baden-wuerttemberg.datenschutz.de/">
            Landesbeauftragten für den Datenschutz und die Informationsfreiheit Baden-Württemberg
          </a>{' '}
          oder einer anderen zuständigen Datenschutz-Aufsichtsbehörde beschweren.
        </p>
      </section>
    </>
  )
}

export function LegalPage({ kind }: { kind: LegalPageKind }) {
  return (
    <div className="legal-page-shell">
      <LegalHeader />
      <main className="legal-page">{kind === 'impressum' ? <Impressum /> : <Datenschutz />}</main>
      <LegalFooter />
    </div>
  )
}
