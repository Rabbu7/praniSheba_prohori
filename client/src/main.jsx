import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { LanguageProvider } from './context/LanguageContext.jsx'
import { PreferencesProvider } from './context/PreferencesContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { DeviceProvider } from './context/DeviceContext.jsx'
import ErrorBoundary from './components/common/ErrorBoundary.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <PreferencesProvider>
        <ErrorBoundary>
          <AuthProvider>
            <DeviceProvider>
              <App />
            </DeviceProvider>
          </AuthProvider>
        </ErrorBoundary>
      </PreferencesProvider>
    </LanguageProvider>
  </StrictMode>,
)
