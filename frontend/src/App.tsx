import { lazy, Suspense } from 'react';
import { Container, Typography, LinearProgress, Box } from '@mui/material';
import { readAuthConfig } from './auth-config';
import { AuthBoundary } from './AuthBoundary';
import { AccountPanel } from './AccountPanel';
import { ApiProvider } from './api';

const Workspace = lazy(() => import('./Workspace'));

const config = readAuthConfig();

export function App() {
  const account = config ? (
    <AuthBoundary config={config}><AccountPanel config={config}><ApiProvider base={config.apiUrl}><Suspense fallback={<LinearProgress aria-label="กำลังเปิดแอป" />}><Workspace /></Suspense></ApiProvider></AccountPanel></AuthBoundary>
  ) : <Typography color="text.secondary">ยังไม่ได้ตั้งค่าการเข้าสู่ระบบ กรุณาตั้งค่า frontend/.env แล้วเริ่ม dev server ใหม่</Typography>;

  return (
    <Container component="main" maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 2, mb: 3 }}><Typography variant="h6" sx={{ fontWeight: 700 }}>Personal Bookmark Manager</Typography></Box>
      {account}
    </Container>
  );
}
