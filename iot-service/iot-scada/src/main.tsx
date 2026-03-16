import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { setupSdkClient } from './sdk/client'

// Setup generated SDK client (base URL + auth interceptor)
setupSdkClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
