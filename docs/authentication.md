# บทเรียน Authentication

ขอบเขตนี้เชื่อม React → Auth0 → NestJS → Prisma/SQLite เพื่อระบุผู้ใช้ ยังไม่สร้าง Collections หรือทำแบบฝึก Bookmarks แทนผู้พัฒนา

## อ่านโค้ดตามเส้นทางคำขอ

1. `frontend/src/AuthBoundary.tsx` ตั้ง Auth0 SDK ให้ใช้ Authorization Code + PKCE และขอ Access Token สำหรับ API audience ของเรา เก็บ token ใน memory
2. `frontend/src/AccountPanel.tsx` จัดการ login/logout และส่ง Access Token ใน Authorization header ไป `GET /me`
3. `backend/src/auth/auth.guard.ts` เป็น global guard บังคับตรวจ credential ก่อนเข้า controller
4. `backend/src/auth/access-token.verifier.ts` ตรวจลายเซ็น RS256 ผ่าน JWKS จาก issuer ที่ตั้งไว้ ตรวจ issuer, audience, expiry, issued-at และ subject ไม่ใช้ ID Token ของ SPA เป็น credential ของ API
5. `backend/src/me.controller.ts` ใช้ issuer + subject ที่ผ่านการตรวจแล้ว upsert User และคืน id ภายในกับ subject ไม่รับ owner identity จาก query
6. `backend/prisma/schema.prisma` บังคับคู่ issuer/subject ไม่ซ้ำ เพื่อให้ผู้ใช้เดิมได้ id เดิม แม้ส่งคำขอแรกพร้อมกัน

`file:./dev.db` resolve จาก backend workspace ทั้ง migration และ runtime เป็นไฟล์เดียวกัน ฐานข้อมูลจริงไม่เข้า Git ส่วน tests สร้างฐานข้อมูลชั่วคราวแยกต่างหาก

## ลองด้วยตัวเอง

รัน `npm.cmd run db:migrate` แล้ว `npm.cmd run dev` เปิด http://localhost:3000 กดเข้าสู่ระบบและทำขั้นตอนบน Auth0 ด้วยบัญชีของคุณ เมื่อกลับมาควรแสดง “เชื่อมต่อบัญชีของคุณแล้ว” ลอง refresh และ logout จากนั้นเข้าสู่ระบบอีกครั้ง

เปิด http://localhost:3001/me โดยตรงจะได้ 401 เพราะการเปิด URL ไม่ได้แนบ Bearer token อย่าส่ง token หรือ password ลงแชต

ลองอธิบายว่าเหตุใด login ที่ Auth0 สำเร็จจึงยังไม่พอ และ API ต้องตรวจ audience อีกครั้ง คำถามนี้เชื่อมไปสู่บท Collections ที่ต้องตรวจเจ้าของข้อมูลต่อจากการยืนยันตัวตน

## หลักฐานและข้อจำกัด

Backend tests ผ่าน 18 รายการ ครอบคลุม token ผิด/หมดอายุ/ลายเซ็นผิด ผู้ใช้ต่างคน id ต่างกัน ผู้ใช้เดิม id คงเดิม และ concurrent first requests ไม่สร้าง identity ซ้ำ ใช้ลายเซ็นและ HTTP JWKS จริงในสภาพแวดล้อมทดสอบ แต่ไม่ใช่ token จาก Auth0 จริง

ตรวจ tenant discovery/JWKS แล้ว และ authorization request แบบไม่มี session ตอบ `login_required` หลังผู้พัฒนาอนุญาต User-Delegated Access แล้ว วันที่ 2026-09-15 ผู้พัฒนายืนยันว่าลอง login สำเร็จและขอไปขั้นถัดไป ผลนี้เป็นรายงานจากผู้พัฒนา ไม่ใช่การสังเกต browser โดย agent
