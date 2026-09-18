import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}
export type Api = <T>(path: string, options?: RequestInit) => Promise<T>;
const Context = createContext<Api | null>(null);
export function ApiProvider({ base, children }: { base: string; children: ReactNode }) {
  const { getAccessTokenSilently } = useAuth0();
  const api = useMemo<Api>(() => async <T,>(path: string, options: RequestInit = {}) => {
    let token: string;
    try { token = await getAccessTokenSilently(); }
    catch { throw new ApiError(401, 'กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่'); }
    const response = await fetch(base + path, { ...options, cache: 'no-store', headers: {
      ...options.headers, Authorization: `Bearer ${token}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    } });
    if (!response.ok) {
      const messages: Record<number, string> = { 400: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจช่องที่กรอก', 401: 'กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่', 404: 'ไม่พบข้อมูลนี้ อาจถูกลบแล้ว กรุณาโหลดรายการใหม่', 409: 'คุณมีกลุ่มชื่อนี้แล้ว กรุณาใช้ชื่ออื่น' };
      throw new ApiError(response.status, messages[response.status] ?? 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่');
    }
    return (response.status === 204 ? undefined : await response.json()) as T;
  }, [base, getAccessTokenSilently]);
  return <Context.Provider value={api}>{children}</Context.Provider>;
}
export function useApi() { const api = useContext(Context); if (!api) throw new Error('Missing API provider'); return api; }
export const errorMessage = (error: unknown) => error instanceof ApiError ? error.message : 'เชื่อมต่อไม่สำเร็จ ตรวจการเชื่อมต่อแล้วลองใหม่';
export interface Collection { id: string; name: string; ownerId: string; createdAt: string; updatedAt: string }
export interface Bookmark { id: string; title: string; url: string; notes: string | null; collectionId: string | null; ownerId: string; createdAt: string; updatedAt: string }
export interface Page<T> { items: T[]; page: number; pageSize: number; total: number }
