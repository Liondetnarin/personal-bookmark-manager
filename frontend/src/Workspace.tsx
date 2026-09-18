import { lazy, Suspense } from 'react';
import { Box, Button, LinearProgress, Stack, Typography } from '@mui/material';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router';
const ResourcePage = lazy(() => import('./ResourcePage'));
export default function Workspace() {
  const { pathname } = useLocation();
  return <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '190px minmax(0,1fr)' }, gap: { xs: 3, md: 5 }, mt: 4 }}>
    <Box component="nav" aria-label="เมนูหลัก"><Stack direction={{ xs: 'row', md: 'column' }} spacing={1}>
      <Button component={Link} to="/bookmarks" variant={pathname === '/bookmarks' ? 'contained' : 'text'} aria-current={pathname === '/bookmarks' ? 'page' : undefined}>ลิงก์ที่เก็บไว้</Button>
      <Button component={Link} to="/collections" variant={pathname === '/collections' ? 'contained' : 'text'} aria-current={pathname === '/collections' ? 'page' : undefined}>กลุ่มของคุณ</Button>
    </Stack><Typography variant="body2" color="text.secondary" sx={{ mt: 3, display: { xs: 'none', md: 'block' } }}>พื้นที่ส่วนตัวสำหรับเรื่องที่คุณอยากกลับมาอ่าน</Typography></Box>
    <Box sx={{ minWidth: 0 }}><Suspense fallback={<LinearProgress aria-label="กำลังเปิดหน้า" />}><Routes>
      <Route path="/" element={<Navigate to="/bookmarks" replace />} />
      <Route path="/callback" element={<Navigate to="/bookmarks" replace />} />
      <Route path="/bookmarks" element={<ResourcePage key="bookmarks" kind="bookmarks" />} />
      <Route path="/collections" element={<ResourcePage key="collections" kind="collections" />} />
      <Route path="*" element={<><Typography component="h1" variant="h4">ไม่พบหน้านี้</Typography><Button component={Link} to="/bookmarks">กลับไปลิงก์ที่เก็บไว้</Button></>} />
    </Routes></Suspense></Box>
  </Box>;
}
