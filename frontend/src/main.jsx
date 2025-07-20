import { StrictMode, useState, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { getTheme } from './theme.js'

function Root() {
  const [mode, setMode] = useState('dark')

  const theme = useMemo(() => createTheme(getTheme(mode)), [mode])

  return (
    <StrictMode>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App mode={mode} setMode={setMode} />
      </ThemeProvider>
    </StrictMode>
  )
}

createRoot(document.getElementById('root')).render(<Root />)