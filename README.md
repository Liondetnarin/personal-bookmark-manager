# Personal Bookmark Manager

## Current implementation

The first portfolio slice is complete: Auth0-protected `/me`, Collections CRUD, and owner-scoped Bookmarks CRUD are backed by Prisma/SQLite. The React/Vite workspace supports collection management, bookmark create/detail/delete, collection and uncategorised filters, responsive layouts, and recovery states.

Run the app with:

```powershell
npm.cmd ci
npm.cmd run db:migrate
npm.cmd run dev
```

Verification commands:

```powershell
npm.cmd run check
npm.cmd test
npm.cmd run smoke
npm.cmd run test:e2e
```

`npm.cmd test` runs 52 isolated backend tests. `npm.cmd run test:e2e` runs 8 Playwright tests across desktop and mobile against a temporary SQLite database and signed fixture identities. Real Auth0 values remain local in `.env` files.

โปรเจกต์ฝึก Full-stack เพื่อเข้าใจการทำงานของแอป ตรวจงาน AI และต่อยอดเป็น portfolio พัฒนาเป็นขั้นเล็ก ๆ ตาม [แผนเรียนรู้](LEARNING_PLAN.md)

## สถานะปัจจุบัน: Bookmark portfolio slice

มี Auth0 login/logout, global Access Token guard, `GET /me`, Collection CRUD และ Bookmark CRUD แบบจำกัดเจ้าของใน Prisma/SQLite แล้ว UI รองรับสร้าง/ดูรายละเอียด/ลบลิงก์, ตัวกรองกลุ่มและไม่จัดกลุ่ม, หน้าจอ responsive และสถานะ loading/empty/error/retry

ตั้งค่า `backend/.env` และ `frontend/.env` ตาม [คู่มือ Auth0](docs/auth0-setup.md) จากนั้นรัน:

```powershell
npm.cmd ci
npm.cmd run db:migrate
npm.cmd run dev
```

เปิด http://localhost:3000 กดเข้าสู่ระบบ เมื่อ Auth0 ส่งกลับมาที่ `/callback` หน้าเว็บจะเรียก API และแสดง “เชื่อมต่อบัญชีของคุณแล้ว” เมื่อ `/me` สำเร็จ ต้องใช้ localhost ให้ตรงกับ callback ที่ตั้งไว้

ตรวจด้วย `npm.cmd run check`, `npm.cmd test`, `npm.cmd run smoke` และ `npm.cmd run test:e2e` โดย backend ผ่าน 52 tests และ browser ผ่าน 8 tests บน desktop/mobile ใช้ signed fixture identities กับ SQLite ชั่วคราวแยกจากข้อมูลจริง ผล login Auth0 จริงยังเป็นรายงานจากผู้พัฒนา ไม่ใช่หลักฐานจาก browser agent

อ่าน [บทเรียน Authentication](docs/authentication.md), [บทเรียน Collections](docs/collections.md) และ [ผลตรวจข้อมูล/ความปลอดภัย](docs/reviews/2026-09-15-auth-collections.md) ขั้นถัดไปเริ่มที่ [แบบฝึก Bookmarks](docs/bookmark-exercise.md) โดยผู้พัฒนาเขียนฟังก์ชันตรวจ title ก่อน
