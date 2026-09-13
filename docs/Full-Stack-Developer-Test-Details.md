# Personal Bookmark Manager — ข้อกำหนดโปรเจกต์ฝึกและ portfolio

เอกสารนี้เป็นสเปกหลักของโปรเจกต์ส่วนตัว ใช้เวลาประมาณ 1–2 วัน เน้นฝึกพัฒนา ตรวจสอบ และอธิบายงานที่ทำร่วมกับ AI ไม่เกี่ยวข้องกับการส่งข้อสอบหรือการประเมินจากองค์กรภายนอก

คงชื่อไฟล์เดิมเพื่อให้ลิงก์ที่มีอยู่ใช้งานต่อได้ เนื้อหาฉบับนี้แทนคำอธิบายโจทย์เดิมทั้งหมด PDF ที่อยู่ในโฟลเดอร์เป็นต้นฉบับอ้างอิงส่วนตัว ไม่ใช่ข้อกำหนดที่ใช้พัฒนาและไม่รวมในผลงานเผยแพร่

## 1. เป้าหมาย

สร้างแอปบันทึกลิงก์ส่วนตัว ผู้ใช้จัด Bookmarks ใน Collections ได้ ผลลัพธ์ต้องมีทั้งแอป หลักฐานทดสอบ และความเข้าใจของผู้พัฒนา ดู [ภาพรวม](page-1.md) และ [ทักษะที่ฝึก](page-2.md)

## 2. กติกา

ใช้ AI ช่วยโดยแบ่งงานย่อย ตรวจงานก่อนยอมรับ เก็บบทสนทนาจริง ปิดข้อมูลลับ บันทึกการตัดสินใจและข้อผิดพลาดจริง และ commit ตามความคืบหน้า ดู [กติกาฉบับเต็ม](page-3.md)

## 3. ความเป็นส่วนตัว

ผู้ใช้ต้องไม่อ่าน แก้ไข ลบ หรือรับรู้การมีอยู่ของข้อมูลผู้อื่นผ่าน API ไม่มีข้อมูลสาธารณะหรือ shared feed ดู [ข้อกำหนดผลิตภัณฑ์](page-4.md)

## 4. ข้อกำหนดทางเทคนิค

### 4.1 ระบบและข้อมูล

Backend และ Frontend แยกส่วน ใช้บริการ บัญชี และข้อมูลของตนเองทั้งหมด ไม่เชื่อมต่อระบบของโครงการภายนอก

### 4.2 Backend API Server Requirements

- Node.js + TypeScript + NestJS
- SQL persistence ผ่าน Prisma
- OIDC ผ่าน Auth0 tenant ของตนเอง และ Authorization Code + PKCE (S256)
- ยืนยันตัวตนทุก API route เลือกและอธิบาย Bearer credential หลังตรวจ discovery/JWKS ของ tenant ตนเอง
- /collections และ /bookmarks รองรับ get one, list, create, PUT, PATCH, delete และ filtering
- GET /me และ GET /collections/:id/bookmarks
- Collection: id, name, ownerId, createdAt, updatedAt
- Bookmark: id, url, title, notes?, collectionId?, ownerId, createdAt, updatedAt
- Bookmark ไม่จำเป็นต้องอยู่ใน Collection แต่ทั้งสอง resource ต้องมีเจ้าของ
- Seed ผู้ใช้สมมติอย่างน้อยสอง identities พร้อมวิธีพิสูจน์การแยกข้อมูล

ดู [Backend และค่าตั้งค่าตัวอย่าง](page-5.md) ค่าตัวอย่างยังไม่ใช่บริการที่สร้างหรือทดสอบแล้ว

### 4.3 Frontend Website Requirements

React + Vite + TypeScript, React Router ≥ v8 และ MUI ≥ v9 ไม่ใช้ Next.js มี /collections และ /bookmarks สำหรับรายการ รายละเอียด สร้าง ลบ และกรอง Bookmarks ตาม Collection

ขั้น scaffold ติดตั้ง React Router 8.3.1 และ MUI 9.4.0 หลังตรวจ npm metadata แล้ว และผ่าน typecheck/build ดู [Frontend และขอบเขต](page-6.md) กับ [ผลตรวจจริง](../AI_WORKFLOW.md) ก่อนเปลี่ยนเงื่อนไขเวอร์ชันในอนาคตต้องบันทึกเหตุผล

### 4.4 การตัดสินใจที่ต้องบันทึก

เลือกพฤติกรรมเมื่อลบ Collection, วิธีรับมือแนวคิดการแชร์ภายใต้กฎความเป็นส่วนตัว, API errors, validation และความแตกต่างระหว่าง PUT/PATCH บันทึก trade-offs และ tests ที่รองรับ ไม่บังคับทำฟีเจอร์แชร์

### 4.5 ฟีเจอร์เสริม

Docker, CI/CD, /all และ full-text search ทำเมื่อส่วนหลักมั่นคงแล้ว ความสัมพันธ์ข้อมูลและ API รายการย่อยยังเป็นงานหลัก

## 5. หลักฐานสำหรับ portfolio

จัดทำ README, API_DESIGN, DECISIONS, AI_WORKFLOW, agent rules, ความสามารถใช้ซ้ำที่ใช้จริง และ transcripts ที่ปิดข้อมูลลับแล้ว พร้อมโค้ด tests และประวัติ commit ดู [รายละเอียดหลักฐาน](page-7.md)

## 6. เกณฑ์ตรวจงาน

ประเมินตนเองด้านแอป API/ข้อมูล agent setup, verification, การตัดสินใจ และความเข้าใจ ใช้ [รายการตรวจและคำถามทบทวน](page-8.md) แทนคะแนนสอบ

เอกสารนี้กำหนดงานที่จะทำ ไม่ใช่รายงานว่าได้สร้างแอป เชื่อม Auth0 หรือตรวจผ่านแล้ว
