import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles.css'
import { readStoredStyle } from './config/styles'
import { loadStyleFonts } from './lib/styleFonts'
import { LegalPage } from './components/LegalPage'

// Same style as the main page (O-014): data-style is set by the inline script, fonts follow.
void loadStyleFonts(readStoredStyle())

const kind = document.body.dataset.legalPage
if (kind !== 'impressum' && kind !== 'datenschutz') {
  throw new Error('Unbekannte Rechtsseite')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LegalPage kind={kind} />
  </React.StrictMode>,
)
