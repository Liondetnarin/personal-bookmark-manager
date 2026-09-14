# Personal Bookmark Manager

โปรเจกต์ฝึก Full-stack เพื่อเข้าใจการทำงานของแอป ตรวจงาน AI และต่อยอดเป็น portfolio พัฒนาเป็นขั้นเล็ก ๆ ตาม [แผนเรียนรู้](LEARNING_PLAN.md)

## สถานะปัจจุบัน: ขั้นที่ 3 — Collections API

มี Auth0 login/logout, global Access Token guard, `GET /me` และ Collection CRUD API ใน Prisma/SQLite แล้ว ผู้พัฒนารายงานว่าลองล็อกอินสำเร็จเมื่อ 2026-09-15 ยังไม่มีหน้าจอ Collections หรือฟีเจอร์ Bookmarks

ตั้งค่า `backend/.env` และ `frontend/.env` ตาม [คู่มือ Auth0](docs/auth0-setup.md) จากนั้นรัน:

```powershell
npm.cmd ci
npm.cmd run db:migrate
npm.cmd run dev
```

เปิด http://localhost:3000 กดเข้าสู่ระบบ เมื่อ Auth0 ส่งกลับมาที่ `/callback` หน้าเว็บจะเรียก API และแสดง “เชื่อมต่อบัญชีของคุณแล้ว” เมื่อ `/me` สำเร็จ ต้องใช้ localhost ให้ตรงกับ callback ที่ตั้งไว้

ตรวจด้วย `npm.cmd run check`, `npm.cmd test` และ `npm.cmd run smoke` ชุดทดสอบ backend ผ่าน 32 รายการ ใช้ signed test tokens, JWKS server และ SQLite แยกจากข้อมูลจริง ส่วน smoke ตรวจ startup/HTTP เท่านั้น ผล login จริงเป็นรายงานจากผู้พัฒนา ไม่ใช่การตรวจ browser โดย agent

อ่าน [บทเรียน Authentication](docs/authentication.md), [บทเรียน Collections](docs/collections.md) และ [ผลตรวจข้อมูล/ความปลอดภัย](docs/reviews/2026-09-15-auth-collections.md) ขั้นถัดไปเริ่มที่ [แบบฝึก Bookmarks](docs/bookmark-exercise.md) โดยผู้พัฒนาเขียนฟังก์ชันตรวจ title ก่อน
