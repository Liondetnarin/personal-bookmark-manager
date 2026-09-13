import { Container, Typography } from '@mui/material';
import { Route, Routes } from 'react-router';

// Temporary setup screen. The product screens are a later learning step.
export function App() {
  return (
    <Container component="main" maxWidth="sm" sx={{ py: 8 }}>
      <Routes>
        <Route path="/" element={
          <>
            <Typography component="h1" variant="h4" gutterBottom>
              Personal Bookmark Manager
            </Typography>
            <Typography color="text.secondary">
              กำลังเตรียมพื้นที่เก็บลิงก์ส่วนตัว ขณะนี้ยังไม่เปิดให้เข้าสู่ระบบหรือบันทึกข้อมูล
            </Typography>
          </>
        } />
        <Route path="*" element={
          <>
            <Typography component="h1" variant="h4" gutterBottom>ไม่พบหน้านี้</Typography>
            <Typography component="a" href="/">กลับหน้าแรก</Typography>
          </>
        } />
      </Routes>
    </Container>
  );
}
