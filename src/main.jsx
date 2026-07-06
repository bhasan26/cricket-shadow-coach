import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './ThemeContext'
import './index.css'
import App from './App.jsx'

// The service worker is generated and auto-registered by vite-plugin-pwa
// (see vite.config.js), which precaches the hashed build assets for offline launch.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <HelmetProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </HelmetProvider>
    </ThemeProvider>
  </StrictMode>,
)
