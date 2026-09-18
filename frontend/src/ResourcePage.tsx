import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, Drawer, IconButton, LinearProgress, MenuItem, Pagination, Stack, TextField, Tooltip, Typography, useMediaQuery, useTheme } from '@mui/material';
import { Link, useSearchParams } from 'react-router';
import { errorMessage, useApi, type Bookmark, type Collection, type Page } from './api';

type Item = Bookmark | Collection;
const label = (item: Item) => 'title' in item ? item.title : item.name;
const emptyForm = { title: '', url: '', notes: '', collectionId: '', name: '' };

export default function ResourcePage({ kind }: { kind: 'bookmarks' | 'collections' }) {
  const api = useApi();
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down('md'));
  const isBookmark = kind === 'bookmarks';
  const [params, setParams] = useSearchParams();
  const rawPage = Number(params.get('page') ?? 1);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const group = params.get('collectionId') ?? (params.get('uncategorised') === 'true' ? '__none' : '');
  const name = params.get('name') ?? '';
  const [search, setSearch] = useState(name);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: Page<Item>; error?: string }>({ key: '' });
  const [groups, setGroups] = useState<Collection[]>([]);
  const [groupsError, setGroupsError] = useState('');
  const [groupsLoading, setGroupsLoading] = useState(isBookmark);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [lastCreated, setLastCreated] = useState<Item | null>(null);
  const [selected, setSelected] = useState<Item | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const detailRequest = useRef<AbortController | null>(null);
  const active = useRef(true);
  const currentPath = useRef('');
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [discardPrompt, setDiscardPrompt] = useState(false);
  const query = new URLSearchParams({ page: String(page), pageSize: '10' });
  if (isBookmark && group) query.set(group === '__none' ? 'uncategorised' : 'collectionId', group === '__none' ? 'true' : group);
  if (!isBookmark && name) query.set('name', name);
  const path = `/${kind}?${query}`;
  currentPath.current = path;
  const key = `${path}|${revision}`;
  const data = result.key === key ? result.data : undefined;
  const loadError = result.key === key ? result.error : undefined;
  const refresh = () => setRevision((v) => v + 1);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);

  useEffect(() => {
    const controller = new AbortController();
    void api<Page<Item>>(path, { signal: controller.signal }).then((value) => {
      if (!controller.signal.aborted) setResult({ key, data: value });
    }).catch((error) => { if (!controller.signal.aborted) setResult({ key, error: errorMessage(error) }); });
    return () => controller.abort();
  }, [api, path, key]);
  useEffect(() => { setSearch(name); }, [name]);
  useEffect(() => {
    if (!isBookmark) return;
    const controller = new AbortController();
    setGroupsLoading(true); setGroupsError('');
    void (async () => {
      const all: Collection[] = [];
      for (let current = 1; ; current++) {
        const response = await api<Page<Collection>>(`/collections?page=${current}&pageSize=100`, { signal: controller.signal });
        all.push(...response.items);
        if (all.length >= response.total || !response.items.length) break;
      }
      if (!controller.signal.aborted) setGroups(all);
    })().catch((error) => { if (!controller.signal.aborted) setGroupsError(errorMessage(error)); })
      .finally(() => { if (!controller.signal.aborted) setGroupsLoading(false); });
    return () => controller.abort();
  }, [api, isBookmark, revision]);
  useEffect(() => {
    setSelected(null); setDetailError(''); setDetailLoading(false);
    detailRequest.current?.abort();
    return () => detailRequest.current?.abort();
  }, [path]);

  const changeFilter = (value: string) => {
    const next = new URLSearchParams();
    if (value) next.set(value === '__none' ? 'uncategorised' : 'collectionId', value === '__none' ? 'true' : value);
    setParams(next);
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setFormError('');
    const title = (isBookmark ? form.title : form.name).trim();
    if (!title || [...title].length > (isBookmark ? 200 : 100)) { setFormError('กรุณากรอกชื่อให้ถูกต้องตามความยาวที่กำหนด'); return; }
    setBusy(true);
    try {
      const created = await api<Item>('/' + kind, { method: 'POST', body: JSON.stringify(isBookmark ? { title: form.title, url: form.url, notes: form.notes || null, collectionId: form.collectionId || null } : { name: form.name }) });
      if (!active.current) return;
      const matchesFilter = !isBookmark || !group || (group === '__none' ? !form.collectionId : form.collectionId === group);
      setForm(emptyForm); setShowForm(false); setLastCreated(created); setNotice(matchesFilter ? (isBookmark ? 'บันทึกลิงก์แล้ว' : 'สร้างกลุ่มแล้ว') : 'บันทึกแล้ว แต่รายการอยู่นอกตัวกรองปัจจุบัน');
      refresh();
    } catch (error) { if (active.current) setFormError(errorMessage(error)); }
    finally { if (active.current) setBusy(false); }
  };
  const detail = async (item: Item) => {
    detailRequest.current?.abort();
    const controller = new AbortController(); detailRequest.current = controller;
    setSelected(item); setDetailLoading(true); setDetailError('');
    try { const value = await api<Item>(`/${kind}/${encodeURIComponent(item.id)}`, { signal: controller.signal }); if (!controller.signal.aborted) setSelected(value); }
    catch (error) { if (!controller.signal.aborted) setDetailError(errorMessage(error)); }
    finally { if (!controller.signal.aborted) setDetailLoading(false); }
  };
  const remove = async () => {
    if (!deleteTarget) return;
    setBusy(true); setDeleteError('');
    const deletedPath = path;
    try {
      await api(`/${kind}/${encodeURIComponent(deleteTarget.id)}`, { method: 'DELETE' });
      if (!active.current) return;
      detailRequest.current?.abort(); setDeleteTarget(null); setSelected(null);
      setNotice(isBookmark ? 'ลบลิงก์แล้ว' : 'ลบกลุ่มแล้ว ลิงก์ภายในยังอยู่ในรายการไม่จัดกลุ่ม');
      if (currentPath.current === deletedPath && data?.items.length === 1 && page > 1) { const next = new URLSearchParams(params); next.set('page', String(page - 1)); setParams(next); }
      refresh();
    } catch (error) { if (active.current) setDeleteError(errorMessage(error)); }
    finally { if (active.current) setBusy(false); }
  };
  const field = (key: keyof typeof form) => ({ value: form[key], onChange: (event: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: event.target.value }) });
  const formDirty = JSON.stringify(form) !== JSON.stringify(emptyForm);
  const requestCloseForm = () => {
    if (busy) return;
    if (formDirty) setDiscardPrompt(true);
    else { setShowForm(false); setFormError(''); }
  };
  const closeForm = () => { setDiscardPrompt(false); setShowForm(false); setForm(emptyForm); setFormError(''); };
  const openForm = () => { setForm(isBookmark ? { ...emptyForm, collectionId: group && group !== '__none' ? group : '' } : emptyForm); setFormError(''); setShowForm(true); };
  const detailContent = selected && <>
    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
      <Box sx={{ minWidth: 0 }}><Typography id="detail-title" component="h2" variant="h5" sx={{ overflowWrap: 'anywhere' }}>{label(selected)}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>รายละเอียดรายการ</Typography></Box>
      <Tooltip title="ปิดรายละเอียด"><IconButton aria-label="ปิดรายละเอียด" onClick={() => { detailRequest.current?.abort(); setSelected(null); }}>ปิด</IconButton></Tooltip>
    </Stack>
    <Divider sx={{ my: 2 }} />
    {detailLoading && <LinearProgress />}{detailError && <Alert severity="error">{detailError}</Alert>}
    {!detailError && !detailLoading && <Box sx={{ mt: 2 }}>{'url' in selected ? <Stack spacing={2}><Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{selected.url}</Typography><Button component="a" href={selected.url} target="_blank" rel="noopener noreferrer" variant="contained">เปิดลิงก์ในแท็บใหม่</Button><Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{selected.notes ?? 'ไม่มีบันทึกเพิ่มเติม'}</Typography></Stack> : <Button component={Link} to={'/bookmarks?collectionId=' + encodeURIComponent(selected.id)} variant="contained">ดูลิงก์ในกลุ่มนี้</Button>}<Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>อัปเดต {new Date(selected.updatedAt).toLocaleString('th-TH')}</Typography></Box>}
  </>;

  return <>
    <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', gap: 2, mb: 4 }}>
      <Box><Typography component="h1" variant="h3">{isBookmark ? 'ลิงก์ที่เก็บไว้' : 'กลุ่มของคุณ'}</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>{isBookmark ? 'เก็บเรื่องที่สนใจ แล้วกลับมาอ่านในเวลาของคุณ' : 'จัดลิงก์ที่เกี่ยวข้องไว้ด้วยกัน เพื่อกลับมาหาได้ง่าย'}</Typography></Box>
      <Button variant="contained" disabled={busy} sx={{ alignSelf: 'flex-start' }} onClick={() => { if (showForm) requestCloseForm(); else openForm(); }}>{showForm ? 'ปิดแบบฟอร์ม' : isBookmark ? 'บันทึกลิงก์' : 'สร้างกลุ่ม'}</Button>
    </Stack>
    {notice && <Alert severity="success" onClose={() => { setNotice(''); setLastCreated(null); }} action={lastCreated ? <Button color="inherit" size="small" onClick={() => { void detail(lastCreated); setNotice(''); setLastCreated(null); }}>ดูรายละเอียด</Button> : undefined} sx={{ mb: 2 }}>{notice}</Alert>}
    <Dialog open={showForm} fullScreen={compact} fullWidth maxWidth="sm" onClose={(_, reason) => { if (reason === 'backdropClick') return; requestCloseForm(); }} aria-labelledby="resource-form-title">
      <Box component="form" onSubmit={submit}>
      <DialogTitle id="resource-form-title">{isBookmark ? 'เพิ่มลิงก์ใหม่' : 'เพิ่มกลุ่มใหม่'}</DialogTitle>
      <DialogContent>
      <Stack spacing={2}>
        <TextField label={isBookmark ? 'ชื่อลิงก์' : 'ชื่อกลุ่ม'} required fullWidth autoFocus disabled={busy} {...field(isBookmark ? 'title' : 'name')} helperText={isBookmark ? 'ไม่เกิน 200 ตัวอักษร' : 'ไม่เกิน 100 ตัวอักษร และไม่ซ้ำกับกลุ่มที่มีอยู่'} />
        {isBookmark && <>
          <TextField label="URL" type="url" required fullWidth disabled={busy} {...field('url')} placeholder="https://example.com/article" helperText="ใช้ http:// หรือ https://" />
          <TextField label="บันทึกเพิ่มเติม" multiline minRows={3} fullWidth disabled={busy} {...field('notes')} helperText="ไม่บังคับ ไม่เกิน 5,000 ตัวอักษร" />
          <TextField select label="เก็บในกลุ่ม" fullWidth disabled={busy || groupsLoading} {...field('collectionId')}>
            <MenuItem value="">ไม่จัดกลุ่ม</MenuItem>{groups.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>
        </>}
        {formError && <Alert severity="error">{formError}</Alert>}
      </Stack>
      </DialogContent>
      <DialogActions><Button disabled={busy} onClick={requestCloseForm}>ยกเลิก</Button><Button variant="contained" type="submit" disabled={busy || (isBookmark && groupsLoading)}>{busy ? 'กำลังบันทึก…' : 'บันทึก'}</Button></DialogActions>
      </Box>
    </Dialog>
    <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2, alignItems: { sm: 'center' }, mb: 2 }}>
      {isBookmark ? <TextField select size="small" label="กรองตามกลุ่ม" value={group} onChange={(e) => changeFilter(e.target.value)} sx={{ minWidth: 220 }} disabled={groupsLoading}>
        <MenuItem value="">ลิงก์ทั้งหมด</MenuItem><MenuItem value="__none">ไม่จัดกลุ่ม</MenuItem>
        {group && group !== '__none' && !groups.some((c) => c.id === group) && <MenuItem value={group}>กลุ่มที่เลือก</MenuItem>}
        {groups.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
      </TextField> : <Stack component="form" direction="row" spacing={1} onSubmit={(e) => { e.preventDefault(); setParams(search.trim() ? { name: search.trim() } : {}); }}><TextField label="กรองชื่อกลุ่ม" size="small" value={search} onChange={(e) => setSearch(e.target.value)} /><Button type="submit" variant="outlined">กรอง</Button></Stack>}
      <Typography color="text.secondary" sx={{ ml: { sm: 'auto' } }}>{data ? `${data.total} รายการ` : loadError ? 'โหลดไม่สำเร็จ' : 'กำลังโหลดรายการ'}</Typography>
    </Stack>
    {groupsError && <Alert severity="warning" action={<Button onClick={refresh}>ลองใหม่</Button>} sx={{ mb: 2 }}>โหลดกลุ่มไม่สำเร็จ - {groupsError}</Alert>}
    {!data && !loadError && <LinearProgress aria-label="กำลังโหลดรายการ" />}
    {loadError && <Alert severity="error" action={<Button onClick={refresh}>ลองใหม่</Button>}>{loadError}</Alert>}
    {data && !data.items.length && <Box sx={{ py: 7, textAlign: 'center', borderTop: '1px solid', borderColor: 'divider' }}>
      <Typography component="h2" variant="h5">{name || group || page > 1 ? 'ไม่พบรายการในมุมมองนี้' : isBookmark ? 'เริ่มเก็บเรื่องที่คุณอยากอ่าน' : 'สร้างกลุ่มแรกของคุณ'}</Typography>
      <Typography color="text.secondary" sx={{ my: 2 }}>{name || group || page > 1 ? 'ลองเปลี่ยนตัวกรองหรือกลับไปดูรายการทั้งหมด' : 'รายการที่คุณสร้างจะปรากฏที่นี่ และมองเห็นได้เฉพาะคุณ'}</Typography>
      <Button onClick={() => name || group || page > 1 ? setParams({}) : openForm()}>{name || group || page > 1 ? 'ดูทั้งหมด' : isBookmark ? 'เพิ่มลิงก์แรก' : 'เพิ่มกลุ่มแรก'}</Button>
    </Box>}
    <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
      {data?.items.map((item) => <Box component="li" key={item.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, py: 2.5, borderTop: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'action.hover' }, '&:focus-within': { bgcolor: 'action.hover' } }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>{'url' in item ? <Typography component="a" href={item.url} target="_blank" rel="noopener noreferrer" sx={{ color: 'text.primary', fontSize: '1.1rem', fontWeight: 700, overflowWrap: 'anywhere', textDecorationThickness: '1px', textUnderlineOffset: '3px' }}>{label(item)}</Typography> : <Button component={Link} to={'/bookmarks?collectionId=' + encodeURIComponent(item.id)} sx={{ p: 0, textAlign: 'left', justifyContent: 'flex-start', fontSize: '1.1rem', overflowWrap: 'anywhere', fontWeight: 700 }}>{label(item)}</Button>}
          {'url' in item && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, overflowWrap: 'anywhere' }}>{(() => { try { return new URL(item.url).hostname; } catch { return item.url; } })()}</Typography>}
          {'notes' in item && item.notes && <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{item.notes.slice(0, 160)}{item.notes.length > 160 ? '…' : ''}</Typography>}
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 1.5 }}><Typography variant="caption" color="text.secondary">{new Date(item.createdAt).toLocaleDateString('th-TH')}</Typography>{'collectionId' in item && <Chip size="small" variant="outlined" label={item.collectionId ? groups.find((g) => g.id === item.collectionId)?.name ?? 'อยู่ในกลุ่ม' : 'ไม่จัดกลุ่ม'} />}</Stack>
        </Box><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}><Button size="small" variant="outlined" onClick={() => void detail(item)}>รายละเอียด</Button><Button color="error" size="small" onClick={() => { setDeleteTarget(item); setDeleteError(''); }} aria-label={'ลบ ' + label(item)}>ลบ</Button></Stack>
      </Box>)}
    </Box>
    {data && data.total > 10 && <Pagination aria-label="หน้ารายการ" count={Math.ceil(data.total / 10)} page={page} onChange={(_, value) => { const next = new URLSearchParams(params); next.set('page', String(value)); setParams(next); }} sx={{ my: 3 }} />}
    {compact ? <Dialog open={!!selected} fullScreen onClose={() => setSelected(null)} aria-labelledby="detail-title"><DialogContent aria-label="รายละเอียด" sx={{ pt: 3 }}>{detailContent}</DialogContent></Dialog> : <Drawer open={!!selected} anchor="right" onClose={() => setSelected(null)} slotProps={{ paper: { component: 'section', 'aria-label': 'รายละเอียด', sx: { width: { md: 440, lg: 520 }, p: 3 } } }}>{detailContent}</Drawer>}
    <Dialog open={discardPrompt} onClose={() => setDiscardPrompt(false)} aria-labelledby="discard-title"><DialogTitle id="discard-title">ทิ้งข้อมูลที่กรอกไว้?</DialogTitle><DialogContent><DialogContentText>ข้อมูลที่กรอกไว้ยังไม่ได้บันทึก หากปิดตอนนี้ข้อมูลจะหาย</DialogContentText></DialogContent><DialogActions><Button onClick={() => setDiscardPrompt(false)}>กลับไปกรอกต่อ</Button><Button color="error" variant="contained" onClick={closeForm}>ทิ้งข้อมูล</Button></DialogActions></Dialog>
    <Dialog open={!!deleteTarget} onClose={() => { if (!busy) setDeleteTarget(null); }} aria-labelledby="delete-title">
      <DialogTitle id="delete-title">{isBookmark ? 'ลบลิงก์นี้?' : 'ลบกลุ่มนี้?'}</DialogTitle>
      <DialogContent><DialogContentText sx={{ overflowWrap: 'anywhere' }}>{deleteTarget && label(deleteTarget)} - {isBookmark ? 'ลบถาวรและกู้คืนไม่ได้' : 'ลิงก์ภายในจะยังอยู่ โดยย้ายไปเป็นรายการไม่จัดกลุ่ม'}</DialogContentText>{deleteError && <Alert severity="error" sx={{ mt: 2 }}>{deleteError}</Alert>}</DialogContent>
      <DialogActions><Button autoFocus disabled={busy} onClick={() => setDeleteTarget(null)}>ยกเลิก</Button><Button variant="contained" color="error" disabled={busy} onClick={() => void remove()}>{busy ? 'กำลังลบ…' : 'ยืนยันลบ'}</Button></DialogActions>
    </Dialog>
  </>;
}
