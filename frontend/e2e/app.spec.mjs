import { test, expect } from '@playwright/test';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { fixture } from '../../backend/test/fixture.mjs';

let f;
let vite;
let group;
let privateBookmark;
const origin = 'http://127.0.0.1:4178';
test.beforeAll(async () => {
  f = await fixture(origin);
  vite = await createServer({
    configFile: false, envDir: false, root: fileURLToPath(new URL('../', import.meta.url)),
    plugins: [react()], resolve: { alias: [{ find: /^@auth0\/auth0-react$/, replacement: fileURLToPath(new URL('./auth-stub.tsx', import.meta.url)) }] },
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(f.base),
      'import.meta.env.VITE_AUTH0_DOMAIN': JSON.stringify('fixture.auth0.com'),
      'import.meta.env.VITE_AUTH0_CLIENT_ID': JSON.stringify('fixture-spa'),
      'import.meta.env.VITE_AUTH0_AUDIENCE': JSON.stringify('https://isolated-bookmarks.test'),
      __TEST_TOKENS__: JSON.stringify(f.tokens), __TEST_SUBJECTS__: JSON.stringify(f.users.map((u) => u.subject)),
    },
    server: { host: '127.0.0.1', port: 4178, strictPort: true },
  });
  await vite.listen();
});
test.afterAll(async () => { await vite?.close(); await f?.close(); });
test.beforeEach(async () => {
  await f.db.bookmark.deleteMany(); await f.db.collection.deleteMany();
  group = await f.db.collection.create({ data: { name: 'Reading', nameKey: 'reading', ownerId: f.users[0].id } });
  await f.db.bookmark.create({ data: { title: 'Understanding TypeScript', url: 'https://www.typescriptlang.org/docs/', notes: 'อ่านบทพื้นฐานแล้วทดลองด้วยตัวเอง', collectionId: group.id, ownerId: f.users[0].id } });
  privateBookmark = await f.db.bookmark.create({ data: { title: 'Private B note', url: 'https://example.invalid/b', ownerId: f.users[1].id } });
});

test('create, detail, filters, cancel and confirm deletion through real API', async ({ page }, info) => {
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(origin + '/collections');
  await expect(page.getByRole('heading', { name: 'กลุ่มของคุณ', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'สร้างกลุ่ม', exact: true }).click();
  await page.getByRole('textbox', { name: 'ชื่อกลุ่ม', exact: true }).fill('Learning');
  await page.getByRole('button', { name: 'บันทึก', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Learning', exact: true })).toBeVisible();
  await page.getByLabel('กรองชื่อกลุ่ม').fill('learn'); await page.getByRole('button', { name: 'กรอง', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reading', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'ลิงก์ที่เก็บไว้', exact: true }).click();
  await page.getByRole('button', { name: 'บันทึกลิงก์', exact: true }).click();
  await page.getByRole('textbox', { name: 'ชื่อลิงก์', exact: true }).fill('A useful article');
  await page.getByLabel('URL', { exact: false }).fill('https://example.invalid/article');
  await page.getByLabel('บันทึกเพิ่มเติม').fill('<script>alert(1)</script> is plain text');
  await page.getByLabel('เก็บในกลุ่ม').click(); await page.getByRole('option', { name: 'Learning', exact: true }).click();
  await page.getByRole('button', { name: 'บันทึก', exact: true }).click();
  await expect(page.getByRole('button', { name: 'A useful article', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'A useful article', exact: true }).click();
  await expect(page.getByRole('link', { name: 'เปิดลิงก์ในแท็บใหม่' })).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(page.getByRole('region', { name: 'รายละเอียด' })).toContainText('<script>alert(1)</script>');
  await page.getByRole('button', { name: 'ปิดรายละเอียด' }).click();
  await page.getByLabel('กรองตามกลุ่ม').click(); await page.getByRole('option', { name: 'Learning', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Understanding TypeScript', exact: true })).toHaveCount(0);
  await page.screenshot({ path: `test-results/bookmarks-${info.project.name}.png`, fullPage: true });
  const before = await f.db.bookmark.count();
  await page.getByRole('button', { name: 'ลบ A useful article', exact: true }).click();
  await page.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0); expect(await f.db.bookmark.count()).toBe(before);
  await page.getByRole('button', { name: 'ลบ A useful article', exact: true }).click();
  await page.getByRole('button', { name: 'ยืนยันลบ' }).click();
  await expect(page.getByRole('button', { name: 'A useful article', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'ไม่พบรายการในมุมมองนี้' })).toBeVisible();
  expect(await f.db.bookmark.count()).toBe(before - 1);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('deleting a collection keeps its bookmarks and persistence survives reload', async ({ page }, info) => {
  await page.goto(origin + '/collections');
  await page.getByRole('button', { name: 'Reading', exact: true }).click();
  await page.getByRole('link', { name: 'ดูลิงก์ในกลุ่มนี้' }).click();
  await expect(page.getByRole('button', { name: 'Understanding TypeScript', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'กลุ่มของคุณ', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reading', exact: true })).toBeVisible();
  await page.screenshot({ path: `test-results/collections-${info.project.name}.png`, fullPage: true });
  await page.getByRole('button', { name: 'ลบ Reading', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('ลิงก์ภายในจะยังอยู่');
  await page.getByRole('button', { name: 'ยืนยันลบ' }).click();
  await expect(page.getByRole('button', { name: 'Reading', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'ลิงก์ที่เก็บไว้', exact: true }).click();
  await page.getByLabel('กรองตามกลุ่ม').click(); await page.getByRole('option', { name: 'ไม่จัดกลุ่ม', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Understanding TypeScript', exact: true })).toBeVisible();
  await page.reload(); await expect(page.getByRole('button', { name: 'Understanding TypeScript', exact: true })).toBeVisible();
  const kept = await f.db.bookmark.findFirst({where:{ownerId:f.users[0].id}}); expect(kept.collectionId).toBeNull();
});

test('second identity cannot see first identity; logout clears workspace', async ({ page }) => {
  await page.addInitScript(() => { window.__TEST_USER_INDEX__ = 1; });
  await page.goto(origin + '/bookmarks');
  await expect(page.getByRole('button', { name: 'Private B note', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Understanding TypeScript', exact: true })).toHaveCount(0);
  await page.goto(origin + `/bookmarks?collectionId=${group.id}`);
  await expect(page.getByRole('alert')).toContainText('ไม่พบข้อมูลนี้');
  await page.getByRole('button', { name: 'ออกจากระบบ', exact: true }).click();
  await expect(page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'เมนูหลัก' })).toHaveCount(0);
});

test('error recovery retains form values and handles duplicate group names', async ({ page }) => {
  await page.goto(origin + '/collections');
  await page.getByRole('button', { name: 'สร้างกลุ่ม', exact: true }).click();
  await page.getByRole('textbox', { name: 'ชื่อกลุ่ม', exact: true }).fill('reading');
  await page.getByRole('button', { name: 'บันทึก', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('คุณมีกลุ่มชื่อนี้แล้ว');
  await expect(page.getByRole('textbox', { name: 'ชื่อกลุ่ม', exact: true })).toHaveValue('reading');
  await page.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
  await page.route('**/bookmarks?*', (route) => route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }));
  await page.getByRole('link', { name: 'ลิงก์ที่เก็บไว้', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('ดำเนินการไม่สำเร็จ');
  await page.unroute('**/bookmarks?*');
  await page.getByRole('button', { name: 'ลองใหม่', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Understanding TypeScript', exact: true })).toBeVisible();
});
