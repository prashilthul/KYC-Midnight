import React from 'react'
import ReactDOM from 'react-dom/client'
import { Buffer } from 'buffer'
import process from 'process'

// Polyfill Node.js globals for the browser
if (typeof window !== 'undefined') {
  (window as any).global = window
  window.Buffer = Buffer
  window.process = process
}

import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
