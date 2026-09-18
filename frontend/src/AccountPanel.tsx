import { useEffect, useState, type ReactNode } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Alert, Button, Stack, Typography } from '@mui/material';
import type { AuthConfig } from './auth-config';

interface Me { id: string; subject: string }
type State = { kind: 'loading' } | { kind: 'ready'; me: Me } | { kind: 'error'; message: string };

export function AccountPanel({ config, children }: { config: AuthConfig; children: ReactNode }) {
  const { isLoading, isAuthenticated, user, error, loginWithRedirect, logout, getAccessTokenSilently } = useAuth0();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [actionError, setActionError] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setState({ kind: 'loading' });
    if (!isAuthenticated || isLoading || error) return;
    const controller = new AbortController();
    async function loadMe() {
      try {
        const token = await getAccessTokenSilently();
        if (controller.signal.aborted) return;
        const response = await fetch(`${config.apiUrl}/me`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store', signal: controller.signal,
        });
        if (!response.ok) {
          if (response.status === 401) throw new Error('API ไม่ยอมรับการยืนยันตัวตน กรุณาออกจากระบบแล้วเข้าสู่ระบบอีกครั้ง');
          throw new Error('โหลดข้อมูลผู้ใช้ไม่สำเร็จ กรุณาลองใหม่');
        }
        const me: unknown = await response.json();
        if (!me || typeof me !== 'object' || !('id' in me) || !('subject' in me) ||
          typeof me.id !== 'string' || typeof me.subject !== 'string' || me.subject !== user?.sub) {
          throw new Error('ข้อมูลผู้ใช้จาก API ไม่ตรงกับการเข้าสู่ระบบ');
        }
        if (!controller.signal.aborted) setState({ kind: 'ready', me: { id: me.id, subject: me.subject } });
      } catch (failure) {
        if (!controller.signal.aborted) setState({ kind: 'error', message:
          failure instanceof Error && failure.message.startsWith('API ')
            ? failure.message : 'โหลดข้อมูลผู้ใช้ไม่สำเร็จ ตรวจว่า Backend ทำงานอยู่แล้วลองใหม่' });
      }
    }
    void loadMe();
    return () => controller.abort();
  }, [isAuthenticated, isLoading, error, user?.sub, getAccessTokenSilently, config.apiUrl, attempt]);

  const signIn = async () => {
    setActionError(false);
    try { await loginWithRedirect(); } catch { setActionError(true); }
  };
  const signOut = async () => {
    setSigningOut(true);
    setActionError(false);
    try { await logout({ logoutParams: { returnTo: window.location.origin } }); }
    catch { setActionError(true); setSigningOut(false); }
  };

  if (isLoading) return <Typography role="status">กำลังตรวจสอบการเข้าสู่ระบบ…</Typography>;
  if (signingOut) return <Typography role="status">กำลังออกจากระบบ…</Typography>;
  if (error) return <Stack spacing={2}>
    <Alert severity="error">เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง หากยังพบปัญหาให้ตรวจการตั้งค่า Auth0</Alert>
    <Button variant="contained" onClick={() => { window.location.assign('/'); }}>กลับไปลองใหม่</Button>
  </Stack>;

  if (isAuthenticated && state.kind === 'ready' && state.me.subject === user?.sub) return <>
    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
      <div><Typography>สวัสดี {user?.name ?? 'คุณ'}</Typography><Typography variant="caption" color="text.secondary" role="status">เชื่อมต่อบัญชีของคุณแล้ว</Typography></div>
      <Button variant="outlined" onClick={() => void signOut()}>ออกจากระบบ</Button>
    </Stack>
    {actionError && <Alert severity="error">ออกจากระบบไม่สำเร็จ กรุณาลองใหม่</Alert>}
    <div key={user.sub}>{children}</div>
  </>;

  return <Stack spacing={3}>
    {actionError && <Alert severity="error">ดำเนินการไม่สำเร็จ กรุณาลองอีกครั้ง</Alert>}
    {!isAuthenticated ? <>
      <Typography color="text.secondary">เข้าสู่ระบบเพื่อเริ่มใช้งานพื้นที่ส่วนตัวของคุณ</Typography>
      <Button variant="contained" onClick={() => void signIn()}>เข้าสู่ระบบ</Button>
    </> : <>
      <Typography component="h2" variant="h6">สวัสดี {user?.name ?? 'คุณ'}</Typography>
      {state.kind === 'loading' && <Typography role="status">กำลังโหลดข้อมูลผู้ใช้…</Typography>}
      {state.kind === 'error' && <>
        <Alert severity="error">{state.message}</Alert>
        <Button onClick={() => setAttempt((value) => value + 1)}>ลองโหลดอีกครั้ง</Button>
      </>}
      {state.kind === 'ready' && <>
        <Typography role="status">เชื่อมต่อบัญชีของคุณแล้ว</Typography>
      </>}
      <Button variant="outlined" onClick={() => void signOut()}>ออกจากระบบ</Button>
    </>}
  </Stack>;
}
