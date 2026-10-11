import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles.css'
import { readStoredStyle } from './config/styles'
import { loadStyleFonts } from './lib/styleFonts'
import App from './App'
import { LocaleProvider } from './i18n/LocaleProvider'

// The static shell already set data-style; fetch that style's fonts before React renders.
void loadStyleFonts(readStoredStyle())

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LocaleProvider>
      <App />
    </LocaleProvider>
  </React.StrictMode>,
)
