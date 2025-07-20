export const getTheme = (mode) => ({
  palette: {
    mode,
    ...(mode === 'dark'
      ? {
          primary: {
            main: '#6366F1',
            light: '#818CF8',
            dark: '#4F46E5',
          },
          secondary: {
            main: '#EC4899',
            light: '#F472B6',
            dark: '#DB2777',
          },
          background: {
            default: '#0F0F23',
            paper: '#1A1A2E',
          },
          text: {
            primary: '#FFFFFF',
            secondary: '#A0A0A0',
          },
          divider: 'rgba(255, 255, 255, 0.08)',
        }
      : {
          primary: {
            main: '#6366F1',
            light: '#818CF8',
            dark: '#4F46E5',
          },
          secondary: {
            main: '#EC4899',
            light: '#F472B6',
            dark: '#DB2777',
          },
          background: {
            default: '#F8F9FA',
            paper: '#FFFFFF',
          },
          text: {
            primary: '#1F2937',
            secondary: '#6B7280',
          },
          divider: 'rgba(0, 0, 0, 0.08)',
        }),
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: {
      fontSize: '3.5rem',
      fontWeight: 800,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '3rem',
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '2.5rem',
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h4: {
      fontSize: '2rem',
      fontWeight: 600,
    },
    h5: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    h6: {
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '10px 24px',
          fontSize: '0.95rem',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        contained: {
          background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: mode === 'dark' 
            ? '0 8px 32px rgba(0, 0, 0, 0.4)' 
            : '0 8px 32px rgba(0, 0, 0, 0.08)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          border: '1px solid',
          borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: mode === 'dark' ? '#0F0F23' : '#FFFFFF',
          color: mode === 'dark' ? '#FFFFFF' : '#1F2937',
        },
      },
    },
  },
})