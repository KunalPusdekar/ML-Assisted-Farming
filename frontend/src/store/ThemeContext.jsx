import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'

const ColorModeContext = createContext({ mode: 'light', toggleColorMode: () => {} })

export function AppThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('color-mode') : null
    if (saved === 'light' || saved === 'dark') return saved
    if (typeof window !== 'undefined') {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      return prefersDark ? 'dark' : 'light'
    }
    return 'light'
  })

  useEffect(() => {
    try { localStorage.setItem('color-mode', mode) } catch {}
    document.documentElement.setAttribute('data-theme', mode)
  }, [mode])

  const toggleColorMode = useCallback(() => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'))
  }, [])

  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      primary: { main: '#2f855a' },
      secondary: { main: '#2b6cb0' },
    },
    shape: { borderRadius: 12 },
    components: {
      MuiPaper: { styleOverrides: { root: { transition: 'background-color 200ms ease, box-shadow 200ms ease' } } },
      MuiAppBar: { styleOverrides: { root: { transition: 'background-color 200ms ease' } } },
      MuiButton: { styleOverrides: { root: { transition: 'background-color 200ms ease, color 200ms ease' } } },
    },
  }), [mode])

  const value = useMemo(() => ({ mode, toggleColorMode }), [mode, toggleColorMode])

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  )
}

export function useColorMode() {
  return useContext(ColorModeContext)
}


