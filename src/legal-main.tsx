import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource/instrument-serif/400.css'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import './styles.css'
import { LegalPage } from './components/LegalPage'

const kind = document.body.dataset.legalPage
if (kind !== 'impressum' && kind !== 'datenschutz') {
  throw new Error('Unbekannte Rechtsseite')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LegalPage kind={kind} />
  </React.StrictMode>,
)
