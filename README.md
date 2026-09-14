# Personal Bookmark Manager

โปรเจกต์ฝึก Full-stack เพื่อเข้าใจการทำงานของแอป ตรวจงาน AI และต่อยอดเป็น portfolio พัฒนาเป็นขั้นเล็ก ๆ ตาม [แผนเรียนรู้](LEARNING_PLAN.md)

## สถานะปัจจุบัน: ขั้นที่ 1 — โครงโปรเจกต์

มี NestJS server, React/Vite หน้าตั้งต้น, npm workspaces, TypeScript และคำสั่งตรวจ build/startup แล้ว **ยังไม่มีการล็อกอิน API ข้อมูล หรือฐานข้อมูล** หน้าเว็บไม่แสดงข้อมูลจำลองเสมือนใช้งานได้

Bearer credential ที่ตกลงใช้ในขั้นถัดไปคือ Access Token ที่ออกสำหรับ API ของเรา เพราะ API ต้องตรวจสิทธิ์ของ token สำหรับ audience ของตนเอง ไม่ใช้ ID Token เป็น credential ของ API

## เริ่มรัน

ใช้ Node.js 24 (อย่างน้อย 24.15) และ npm 11 ขึ้นไป ใน PowerShell ใช้ npm.cmd หาก npm.ps1 ถูก execution policy บล็อก ไม่ต้องแก้ policy ของเครื่อง

```powershell
npm.cmd ci
npm.cmd run dev
```

เปิด http://localhost:3000 หรือ http://127.0.0.1:3000 จะพบชื่อโปรเจกต์และข้อความว่ายังไม่เปิดให้ล็อกอินหรือบันทึกข้อมูล Backend อยู่ที่ http://127.0.0.1:3001 และตอบ 404 เพราะยังไม่มี routes ข้อมูล ใช้ Ctrl+C เพื่อหยุดทั้งสองส่วน

Vite ตั้ง strictPort: หากพอร์ตถูกใช้งานจะหยุดพร้อม error ไม่ย้ายพอร์ตเงียบ ๆ เพราะ callback ของ Auth0 ในขั้นถัดไปต้องตรงกับพอร์ตจริง เมื่อต่อ Auth0 ให้ใช้ localhost:3000 เป็น origin หลักตาม config ที่ตกลงไว้

ไม่ต้องสร้าง .env เพื่อรันขั้นแรก ไฟล์ .env.example มี placeholders สำหรับขั้นถัดไป ยังไม่ใช่การตั้งค่าที่ใช้งานจริง ห้ามใส่ client secret หรือ password ในตัวแปร VITE_ เพราะค่าฝั่ง frontend ถูกส่งไปยัง browser

## คำสั่งตรวจงาน

```powershell
npm.cmd run check
npm.cmd run smoke
```

check ตรวจ TypeScript และสร้าง production build ของทั้งสอง workspace ส่วน smoke ใช้ build ที่มีอยู่ เปิด server บนพอร์ตชั่วคราว ตรวจว่า Nest ทำงานและยังไม่เปิด business routes แล้วตรวจ HTML/JavaScript ของ Vite preview จากนั้นหยุด process ที่เปิดเอง

Smoke check ไม่ใช่ automated tests ด้าน auth/privacy หรือการตรวจการ render ใน browser ยังไม่มีชุดทดสอบฟีเจอร์ในขั้นนี้ เราจะเพิ่มพร้อมฟีเจอร์และไม่ใช้ผล scaffold แทนหลักฐานความปลอดภัย

รันแยกได้ด้วย npm.cmd run dev --workspace backend และ npm.cmd run dev --workspace frontend

## อ่านโค้ดตามลำดับนี้

| ไฟล์ | หน้าที่ |
| --- | --- |
| package.json | คำสั่งจาก root ที่เรียกสอง workspace |
| frontend/index.html | เอกสารที่ browser โหลดและจุดติดตั้ง React |
| frontend/src/main.tsx | เริ่ม React และ router |
| frontend/src/App.tsx | หน้าตั้งต้นชั่วคราวและกรณีไม่พบหน้า |
| frontend/vite.config.ts | พอร์ต dev server และเครื่องมือ build |
| backend/src/main.ts | เริ่ม HTTP server ของ NestJS |
| backend/src/app.module.ts | จุดรวม modules; ยังไม่มี controllers |
| scripts/smoke.mjs | ตรวจ process/HTTP ของ build จริง |

ตอนนี้ browser โหลด React จาก Vite เท่านั้น **ยังไม่มีคำขอจาก React ไป Nest หรือฐานข้อมูล** เส้นทางเป้าหมายในบทถัดไปคือ React → API พร้อม Access Token → ตรวจ token/เจ้าของ → Prisma → SQLite โดย frontend ไม่เข้าฐานข้อมูลตรง

## ลองทำก่อนบทถัดไป

1. รัน dev และเปิดหน้าแรก เปลี่ยนข้อความชั่วคราวใน frontend/src/App.tsx แล้วสังเกตว่า browser อัปเดตโดยไม่ต้องสั่ง build เอง
2. เปิด http://localhost:3000/unknown แล้วใช้ลิงก์กลับหน้าแรก เพื่อดูว่า route ฝั่ง React ต่างจากไฟล์บน server อย่างไร
3. เปิด http://127.0.0.1:3001/me แล้วสังเกต 404: server ทำงานได้โดยที่ endpoint ยังไม่มี
4. ลองอธิบายด้วยคำพูดตนเองว่า TypeScript ตรวจอะไร และเหตุใด build ผ่านยังไม่พิสูจน์ว่าผู้ใช้ A อ่านข้อมูล B ไม่ได้

## Stack และขอบเขตถัดไป

เริ่มบทถัดไปที่ [เตรียม Auth0 ของเราเอง](docs/auth0-setup.md) และใช้ npm.cmd run auth:inspect -- YOUR_TENANT.us.auth0.com เพื่ออ่าน public metadata ของ tenant ก่อน implementation คำสั่งนี้ไม่ใช่การทดสอบ auth

ติดตั้งแล้ว: TypeScript 5.9.3, NestJS 12, React 19, Vite 8, React Router 8 และ MUI 9 เวอร์ชันที่ติดตั้งจริงล็อกใน package-lock.json เลือก TypeScript 5.9.3 เป็นฐานเริ่มต้นเพื่อไม่รวมการย้าย major compiler ในบทตั้งโครง

ยืนยันแต่ยังไม่ติดตั้ง/เชื่อมต่อ: Prisma + SQLite และ Auth0 ของผู้พัฒนาเอง จากนั้นทำ Collections ร่วมกันและให้ผู้พัฒนาฝึก Bookmarks ตามแผน ยังไม่ทำ deploy, sharing, ถังขยะ, full-text search หรือหน้า /all

อ่าน [สเปก](docs/Full-Stack-Developer-Test-Details.md), [API contract](API_DESIGN.md), [การตัดสินใจ](DECISIONS.md), [คำศัพท์](CONTEXT.md) และ [หลักฐานการทำงาน](AI_WORKFLOW.md) ประกอบ

เอกสารต้นฉบับภายนอกและไฟล์ข้อมูลจริงถูกยกเว้นจาก Git เฉพาะเอกสารโปรเจกต์ที่เขียนใหม่ใช้ประกอบ portfolio

อ้างอิงสำหรับบทเริ่มต้น: [NestJS first steps](https://docs.nestjs.com/first-steps), [Vite getting started](https://vite.dev/guide/)
