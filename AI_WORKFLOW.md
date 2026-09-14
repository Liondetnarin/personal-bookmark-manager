# AI workflow — หลักฐานที่เกิดขึ้นจริง

## วิธีทำงาน

ใช้ Codex ช่วยอ่านสเปกและถามการตัดสินใจผ่าน grill-with-docs (grilling และ domain-modeling) ผู้พัฒนายืนยัน Q1–Q15 ก่อนเริ่มขั้นที่ 1 การตอบและเหตุผลใน DECISIONS.md เป็นบันทึกสรุป ไม่ใช่ transcript ฉบับเต็ม

ขั้นแรกให้ AI ตั้ง workspaces, TypeScript, NestJS และ React/Vite พร้อม README และการตรวจ startup ขั้นถัดไปทำ Auth/Collections ร่วมกันแล้วให้ผู้พัฒนาลอง Bookmarks ด้วยตนเอง

## เครื่องมือและการตรวจเวอร์ชัน

อ่าน package metadata จาก npm registry และเอกสาร NestJS/Vite โดยตรงก่อนติดตั้ง ใช้ Node v24.18.0 และ npm 11.17.0 ในเครื่องนี้ ใช้ npm.cmd ใน PowerShell และ cache ภายใน repo ที่ถูก ignore

Prisma ยังไม่ติดตั้งในขั้นนี้: registry latest ของ prisma ที่ตรวจพบเป็น 8.0.0-rc.14 ขณะที่ @prisma/client เป็น 7.10.0 จึงไม่ติดตั้งตาม latest แบบไม่ตรวจคู่เวอร์ชัน จะเลือกคู่ stable ที่ตรงกันเมื่อเข้าสู่บทฐานข้อมูล

ใช้ impeccable อ่านบริบท UI แต่ขั้นแรกจำกัดเป็น setup screen ชั่วคราว ยังไม่ได้กำหนด visual identity ของหน้าผลิตภัณฑ์

## Reusable capability ที่ใช้จริง

ใช้ .agent/verify-change.md หลังตั้ง scaffold: ตรวจขอบเขตงาน → typecheck/build → smoke → บันทึกข้อจำกัด → ส่งแบบฝึกให้ผู้พัฒนา ไม่มีการข้ามไปสร้าง Bookmarks แทนส่วนฝึก

## ผลตรวจขั้นที่ 1

- npm.cmd install --no-audit --no-fund: สำเร็จ สร้าง lockfile
- npm.cmd run check: ผ่าน TypeScript และ production build ทั้ง backend/frontend
- npm.cmd run smoke: ผ่าน เปิด Nest จริงแล้วตรวจ /me, /collections, /bookmarks ว่ายังตอบ 404 และเปิด Vite preview ตรวจ HTML กับ JavaScript bundle จริง
- npm.cmd run dev: ทั้งสอง workspace เริ่มได้ที่พอร์ต 3000 และ 3001
- พยายามเปิดหน้าผ่านเครื่องมือ browser แล้วได้ “No browser is available” จึงยังไม่มีหลักฐานตรวจภาพหรือ React runtime ใน browser จากเครื่องมือ ไม่อ้างว่า visual QA ผ่าน

ยังไม่ได้ตรวจ auth, privacy, persistence หรือ Auth0 จริง และยังไม่มี feature tests ไม่มีการตรวจช่องโหว่ dependencies ด้วย npm audit ในรอบนี้

## การสะท้อนคิด

สิ่งที่ได้ผลในขั้นนี้คือการแยกขอบเขต scaffold ออกจากฟีเจอร์, ติดตั้งเวอร์ชันที่ตรวจ metadata แล้ว และเปิด process จริงเพื่อตรวจ build แทนการคาดเดาว่าจะรันได้

ข้อจำกัดที่พบจริงคือเครื่องมือ browser ไม่มี session ให้ใช้งาน จึงส่งขั้นตรวจหน้าเว็บให้ผู้พัฒนาลองเอง ไม่มีการแต่งบั๊ก auth หรือเหตุการณ์ recovery ให้ครบจำนวนตัวอย่าง

ไม่มีตัวเลข token/cost ที่ตรวจสอบได้ในบันทึกนี้ จึงไม่ประมาณเป็นยอดใช้จริง ส่วนหลักฐานบทสนทนาใน transcripts/ เป็น excerpt ที่ระบุขอบเขตชัดเจน ไม่ใช่ประวัติครบทุกข้อความ

## ขั้นที่ 2A — เตรียม Auth0 (2026-09-14)

ผู้พัฒนาขอไปต่อและแจ้งว่ายังไม่มี Auth0 tenant จึงเตรียม docs/auth0-setup.md และคำสั่ง auth:inspect เพื่ออ่าน public discovery/JWKS ของ canonical Auth0 domain ที่ระบุเอง โดยยังไม่เลือกค่าตรวจ token ของ tenant ที่ไม่มีข้อมูล

อ่านเอกสาร Auth0 ทางการเรื่อง React SPA, tenants, API registration และ signing algorithms คู่มือระบุ callback/logout/origin ตามพอร์ตโปรเจกต์ และแยก ID-token metadata ออกจากหลักฐาน algorithm ของ Access Token

ตรวจ node --check ของ script และ --help ผ่าน ตรวจ placeholder, HTTP, non-Auth0 domain และ URL ที่มี credentials ว่าถูกปฏิเสธก่อน network request ผ่าน npm.cmd run check และ npm.cmd run smoke ของโครงเดิมผ่าน

ยังไม่ได้รันเส้นทางอ่าน metadata กับ tenant จริง ยังไม่มี auth guard, /me หรือการตรวจ login จริง งาน dependent รอ Domain ของ tenant ที่ผู้พัฒนาสร้างเอง ไม่ถือว่าขั้น Authentication เสร็จ
