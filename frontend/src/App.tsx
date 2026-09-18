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
    <Container component="main" maxWidth="lg" sx={{ py: { xs: 2, md: 3 } }}>
      <Box component="header" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', pb: 2, mb: { xs: 2, md: 3 } }}>
        <Box><Typography variant="h6" sx={{ fontWeight: 750, letterSpacing: '-0.02em' }}>Personal Bookmark Manager</Typography><Typography variant="body2" color="text.secondary">พื้นที่ส่วนตัวสำหรับลิงก์ที่อยากกลับมาอ่าน</Typography></Box>
      </Box>
      {account}
    </Container>
  );
}
