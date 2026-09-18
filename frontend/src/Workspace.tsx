import { lazy, Suspense } from 'react';
import { Box, Button, LinearProgress, Stack, Typography } from '@mui/material';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router';
const ResourcePage = lazy(() => import('./ResourcePage'));
export default function Workspace() {
  const { pathname } = useLocation();
  return <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '176px minmax(0,1fr)' }, gap: { xs: 2, md: 4 }, mt: { xs: 2, md: 3 } }}>
    <Box component="nav" aria-label="เมนูหลัก" sx={{ alignSelf: 'start', position: { md: 'sticky' }, top: { md: 16 } }}><Stack direction={{ xs: 'row', md: 'column' }} spacing={0.5} sx={{ p: 0.5, bgcolor: { xs: 'background.paper', md: 'transparent' }, border: { xs: '1px solid', md: 'none' }, borderColor: 'divider', borderRadius: 2 }}>
      <Button component={Link} to="/bookmarks" variant={pathname === '/bookmarks' ? 'contained' : 'text'} fullWidth aria-current={pathname === '/bookmarks' ? 'page' : undefined}>ลิงก์ที่เก็บไว้</Button>
      <Button component={Link} to="/collections" variant={pathname === '/collections' ? 'contained' : 'text'} fullWidth aria-current={pathname === '/collections' ? 'page' : undefined}>กลุ่มของคุณ</Button>
    </Stack><Typography variant="body2" color="text.secondary" sx={{ mt: 2, display: { xs: 'none', md: 'block' }, lineHeight: 1.7 }}>จัดเก็บลิงก์ส่วนตัวให้กลับมาอ่านได้ง่าย</Typography></Box>
    <Box sx={{ minWidth: 0 }}><Suspense fallback={<LinearProgress aria-label="กำลังเปิดหน้า" />}><Routes>
      <Route path="/" element={<Navigate to="/bookmarks" replace />} />
      <Route path="/callback" element={<Navigate to="/bookmarks" replace />} />
      <Route path="/bookmarks" element={<ResourcePage key="bookmarks" kind="bookmarks" />} />
      <Route path="/collections" element={<ResourcePage key="collections" kind="collections" />} />
      <Route path="*" element={<><Typography component="h1" variant="h4">ไม่พบหน้านี้</Typography><Button component={Link} to="/bookmarks">กลับไปลิงก์ที่เก็บไว้</Button></>} />
    </Routes></Suspense></Box>
  </Box>;
}
