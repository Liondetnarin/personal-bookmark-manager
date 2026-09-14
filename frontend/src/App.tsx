import { Container, Typography } from '@mui/material';
import { Route, Routes } from 'react-router';
import { readAuthConfig } from './auth-config';
import { AuthBoundary } from './AuthBoundary';
import { AccountPanel } from './AccountPanel';

const config = readAuthConfig();

export function App() {
  const account = config ? (
    <AuthBoundary config={config}><AccountPanel config={config} /></AuthBoundary>
  ) : <Typography color="text.secondary">ยังไม่ได้ตั้งค่าการเข้าสู่ระบบ กรุณาตั้งค่า frontend/.env แล้วเริ่ม dev server ใหม่</Typography>;

  return (
    <Container component="main" maxWidth="sm" sx={{ py: 8 }}>
      <Typography component="h1" variant="h4" gutterBottom>Personal Bookmark Manager</Typography>
      <Routes>
        <Route path="/" element={account} />
        <Route path="/callback" element={account} />
        <Route path="*" element={
          <>
            <Typography component="h2" variant="h5" gutterBottom>ไม่พบหน้านี้</Typography>
            <Typography component="a" href="/">กลับหน้าแรก</Typography>
          </>
        } />
      </Routes>
    </Container>
  );
}
