import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { App } from './App';

const root = document.getElementById('root');
const theme = createTheme({
  palette: { primary: { main: '#245c4a' }, background: { default: '#f7f8f4', paper: '#ffffff' }, text: { primary: '#202d27', secondary: '#536158' }, divider: '#d4ddd5' },
  typography: { fontFamily: '"Leelawadee UI", "Segoe UI", sans-serif', h3: { fontSize: '2rem', fontWeight: 650, lineHeight: 1.4 }, button: { textTransform: 'none', fontWeight: 600 } },
  shape: { borderRadius: 8 },
  components: { MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { minHeight: 40 } } }, MuiCssBaseline: { styleOverrides: { '::selection': { backgroundColor: '#cde9d6' }, ':focus-visible': { outline: '3px solid #387e67', outlineOffset: 3 }, body: { caretColor: '#245c4a' } } } },
});
if (!root) throw new Error('Missing root element');

createRoot(root).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
    <CssBaseline />
    <BrowserRouter>
      <App />
    </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
