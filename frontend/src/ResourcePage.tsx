import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, LinearProgress, MenuItem, Pagination, Stack, TextField, Typography } from '@mui/material';
import { Link, useSearchParams } from 'react-router';
import { errorMessage, useApi, type Bookmark, type Collection, type Page } from './api';

type Item = Bookmark | Collection;
const label = (item: Item) => 'title' in item ? item.title : item.name;
const emptyForm = { title: '', url: '', notes: '', collectionId: '', name: '' };

export default function ResourcePage({ kind }: { kind: 'bookmarks' | 'collections' }) {
  const api = useApi();
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
  const [selected, setSelected] = useState<Item | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const detailRequest = useRef<AbortController | null>(null);
  const active = useRef(true);
  const currentPath = useRef('');
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
  const [deleteError, setDeleteError] = useState('');
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
    const submittedPath = path;
    try {
      await api(`/${kind}`, { method: 'POST', body: JSON.stringify(isBookmark ? { title: form.title, url: form.url, notes: form.notes || null, collectionId: form.collectionId || null } : { name: form.name }) });
      if (!active.current) return;
      setForm(emptyForm); setShowForm(false); setNotice(isBookmark ? 'บันทึกลิงก์แล้ว' : 'สร้างกลุ่มแล้ว');
      if (currentPath.current === submittedPath) setParams({});
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

  return <>
    <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', gap: 2, mb: 4 }}>
      <Box><Typography component="h1" variant="h3">{isBookmark ? 'ลิงก์ที่เก็บไว้' : 'กลุ่มของคุณ'}</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>{isBookmark ? 'เก็บเรื่องที่สนใจ แล้วกลับมาอ่านในเวลาของคุณ' : 'จัดลิงก์ที่เกี่ยวข้องไว้ด้วยกัน เพื่อกลับมาหาได้ง่าย'}</Typography></Box>
      <Button variant="contained" disabled={busy} sx={{ alignSelf: 'flex-start' }} onClick={() => { setShowForm(!showForm); setFormError(''); }}>{showForm ? 'ปิดแบบฟอร์ม' : isBookmark ? 'บันทึกลิงก์' : 'สร้างกลุ่ม'}</Button>
    </Stack>
    {notice && <Alert severity="success" onClose={() => setNotice('')} sx={{ mb: 2 }}>{notice}</Alert>}
    {showForm && <Box component="form" onSubmit={submit} sx={{ bgcolor: 'background.paper', p: { xs: 2, sm: 3 }, border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 3 }}>
      <Typography component="h2" variant="h6" sx={{ mb: 2 }}>{isBookmark ? 'เพิ่มลิงก์ใหม่' : 'เพิ่มกลุ่มใหม่'}</Typography>
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
        <Stack direction="row" spacing={1}><Button variant="contained" type="submit" disabled={busy || (isBookmark && groupsLoading)}>{busy ? 'กำลังบันทึก…' : 'บันทึก'}</Button><Button disabled={busy} onClick={() => setShowForm(false)}>ยกเลิก</Button></Stack>
      </Stack>
    </Box>}
    <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2, alignItems: { sm: 'center' }, mb: 2 }}>
      {isBookmark ? <TextField select size="small" label="กรองตามกลุ่ม" value={group} onChange={(e) => changeFilter(e.target.value)} sx={{ minWidth: 220 }} disabled={groupsLoading}>
        <MenuItem value="">ลิงก์ทั้งหมด</MenuItem><MenuItem value="__none">ไม่จัดกลุ่ม</MenuItem>
        {group && group !== '__none' && !groups.some((c) => c.id === group) && <MenuItem value={group}>กลุ่มที่เลือก</MenuItem>}
        {groups.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
      </TextField> : <Stack component="form" direction="row" spacing={1} onSubmit={(e) => { e.preventDefault(); setParams(search.trim() ? { name: search.trim() } : {}); }}><TextField label="กรองชื่อกลุ่ม" size="small" value={search} onChange={(e) => setSearch(e.target.value)} /><Button type="submit" variant="outlined">กรอง</Button></Stack>}
      <Typography color="text.secondary" sx={{ ml: { sm: 'auto' } }}>{data ? `${data.total} รายการ` : loadError ? 'โหลดไม่สำเร็จ' : 'กำลังโหลดรายการ'}</Typography>
    </Stack>
    {groupsError && <Alert severity="warning" action={<Button onClick={refresh}>ลองใหม่</Button>} sx={{ mb: 2 }}>โหลดกลุ่มไม่สำเร็จ — {groupsError}</Alert>}
    {!data && !loadError && <LinearProgress aria-label="กำลังโหลดรายการ" />}
    {loadError && <Alert severity="error" action={<Button onClick={refresh}>ลองใหม่</Button>}>{loadError}</Alert>}
    {data && !data.items.length && <Box sx={{ py: 7, textAlign: 'center', borderTop: '1px solid', borderColor: 'divider' }}>
      <Typography component="h2" variant="h5">{name || group || page > 1 ? 'ไม่พบรายการในมุมมองนี้' : isBookmark ? 'เริ่มเก็บเรื่องที่คุณอยากอ่าน' : 'สร้างกลุ่มแรกของคุณ'}</Typography>
      <Typography color="text.secondary" sx={{ my: 2 }}>{name || group || page > 1 ? 'ลองเปลี่ยนตัวกรองหรือกลับไปดูรายการทั้งหมด' : 'รายการที่คุณสร้างจะปรากฏที่นี่ และมองเห็นได้เฉพาะคุณ'}</Typography>
      <Button onClick={() => name || group || page > 1 ? setParams({}) : setShowForm(true)}>{name || group || page > 1 ? 'ดูทั้งหมด' : isBookmark ? 'เพิ่มลิงก์แรก' : 'เพิ่มกลุ่มแรก'}</Button>
    </Box>}
    <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
      {data?.items.map((item) => <Box component="li" key={item.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, py: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}><Button onClick={() => void detail(item)} sx={{ p: 0, textAlign: 'left', justifyContent: 'flex-start', fontSize: '1.1rem', overflowWrap: 'anywhere' }}>{label(item)}</Button>
          {'url' in item && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, overflowWrap: 'anywhere' }}>{item.url}</Typography>}
          {'notes' in item && item.notes && <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{item.notes.slice(0, 160)}{item.notes.length > 160 ? '…' : ''}</Typography>}
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 1.5 }}><Typography variant="caption" color="text.secondary">{new Date(item.createdAt).toLocaleDateString('th-TH')}</Typography>{'collectionId' in item && <Chip size="small" variant="outlined" label={item.collectionId ? groups.find((g) => g.id === item.collectionId)?.name ?? 'อยู่ในกลุ่ม' : 'ไม่จัดกลุ่ม'} />}</Stack>
        </Box><Button color="error" size="small" onClick={() => { setDeleteTarget(item); setDeleteError(''); }} aria-label={`ลบ ${label(item)}`}>ลบ</Button>
      </Box>)}
    </Box>
    {data && data.total > 10 && <Pagination aria-label="หน้ารายการ" count={Math.ceil(data.total / 10)} page={page} onChange={(_, value) => { const next = new URLSearchParams(params); next.set('page', String(value)); setParams(next); }} sx={{ my: 3 }} />}
    {selected && <Box component="section" aria-label="รายละเอียด" sx={{ p: 3, mt: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}><Typography component="h2" variant="h5" sx={{ overflowWrap: 'anywhere' }}>{label(selected)}</Typography><Button onClick={() => { detailRequest.current?.abort(); setSelected(null); }}>ปิดรายละเอียด</Button></Stack>
      {detailLoading && <LinearProgress />}{detailError && <Alert severity="error">{detailError}</Alert>}
      {!detailError && !detailLoading && <Box sx={{ mt: 2 }}>{'url' in selected ? <><Button component="a" href={selected.url} target="_blank" rel="noopener noreferrer" variant="outlined">เปิดลิงก์ในแท็บใหม่</Button><Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', mt: 2 }}>{selected.notes ?? 'ไม่มีบันทึกเพิ่มเติม'}</Typography></> : <Button component={Link} to={`/bookmarks?collectionId=${encodeURIComponent(selected.id)}`}>ดูลิงก์ในกลุ่มนี้</Button>}<Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>อัปเดต {new Date(selected.updatedAt).toLocaleString('th-TH')}</Typography></Box>}
    </Box>}
    <Dialog open={!!deleteTarget} onClose={() => { if (!busy) setDeleteTarget(null); }} aria-labelledby="delete-title">
      <DialogTitle id="delete-title">{isBookmark ? 'ลบลิงก์นี้?' : 'ลบกลุ่มนี้?'}</DialogTitle>
      <DialogContent><DialogContentText sx={{ overflowWrap: 'anywhere' }}>{deleteTarget && label(deleteTarget)} — {isBookmark ? 'ลบถาวรและกู้คืนไม่ได้' : 'ลิงก์ภายในจะยังอยู่ โดยย้ายไปเป็นรายการไม่จัดกลุ่ม'}</DialogContentText>{deleteError && <Alert severity="error" sx={{ mt: 2 }}>{deleteError}</Alert>}</DialogContent>
      <DialogActions><Button autoFocus disabled={busy} onClick={() => setDeleteTarget(null)}>ยกเลิก</Button><Button variant="contained" color="error" disabled={busy} onClick={() => void remove()}>{busy ? 'กำลังลบ…' : 'ยืนยันลบ'}</Button></DialogActions>
    </Dialog>
  </>;
}
