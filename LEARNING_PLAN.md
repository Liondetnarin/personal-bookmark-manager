# แผนลงมือเรียนรู้ — ยืนยันแล้วใน Q15

สถานะล่าสุด 2026-09-15: ผู้พัฒนายืนยันว่า login สำเร็จ (รายงานจากผู้พัฒนา) และร่วมทบทวน owner scope, unique constraint และ scoped total แล้ว ตรวจข้อมูล/ความปลอดภัยและ commit Auth/Collections เป็น eef2562 เริ่มขั้นที่ 4 ที่ docs/bookmark-exercise.md โดยให้ผู้พัฒนาเขียน bookmarkTitle ก่อน ยังไม่มี Bookmark implementation หรือ UI การทบทวนบทสนทนาไม่ใช่หลักฐานว่าผู้พัฒนาทำแบบฝึกได้แล้ว

## สิ่งที่ยืนยันแล้ว

อัปเดต 2026-09-17: ทำ bookmarkTitle และต่อ bookmarkUrl ตามคำขอ พร้อม tests ตรวจชนิดข้อมูล รูปแบบ URL ข้อมูลล็อกอินที่ฝังใน URL และขอบเขต Unicode ผ่าน ขั้นถัดไปคือ POST body validation ก่อนความสัมพันธ์ฐานข้อมูล ยังไม่มี Bookmark API

ยึดสเปกส่วนตัวใน docs และข้อสรุป Q1–Q14 ใน DECISIONS.md: สองหน้าหลัก, NestJS/TypeScript, Prisma/SQLite, React/Vite/React Router/MUI, Auth0 ของตนเอง และการแยกข้อมูลส่วนตัว ใช้ 1–2 วันเป็นเป้าหมายรอบแรก ยืดเพื่อเรียนรู้ได้โดยไม่เพิ่มฟีเจอร์

## ข้อเสนอด้านการจัดโปรเจกต์

- Monorepo ใช้ npm workspaces มี backend และ frontend ใช้ TypeScript ทั้งสองส่วน
- Frontend พอร์ต 3000 ตาม callback ที่ระบุ Backend พอร์ต 3001 ใช้ origin ที่กำหนดสำหรับการเชื่อมต่อ
- แยกฐานข้อมูล development กับ tests; ไม่ใช้ข้อมูลจริงของผู้พัฒนาใน tests
- เก็บค่าบริการจริงใน env ที่ไม่ commit มี .env.example เป็น placeholders ไม่มี client secret ใน frontend
- เก็บ spec Markdown ที่เขียนใหม่และ ADR ใน Git โดยปรับ ignore เฉพาะที่จำเป็น คง PDF ต้นฉบับและข้อมูลลับออกจากส่วนเผยแพร่
- หน้าหลักรุ่นแรกมีรายการ รายละเอียด สร้าง ลบ และตัวกรองตามสเปก ส่วน PUT/PATCH เรียนผ่าน API และ tests ก่อน ไม่เพิ่มหน้าแก้ไขหรือฟีเจอร์เสริมโดยอัตโนมัติ

## ขั้นการเรียนรู้

1. ตั้งโครงโปรเจกต์ คำสั่งรัน/ตรวจ กฎ agent และวิธีเก็บหลักฐาน อธิบายว่า frontend, backend และฐานข้อมูลเชื่อมกันอย่างไร
2. ผู้พัฒนาตั้ง Auth0 tenant/application/API ของตนเองพร้อมบัญชีทดสอบ ตรวจ discovery/JWKS และทำ auth guard กับ GET /me ร่วมกัน ไม่ส่ง password หรือ token ผ่านแชต
3. ทำ Collection schema, API และ tests เป็นตัวอย่างร่วมกัน แล้วให้ผู้พัฒนาอธิบายว่า ownership ถูกบังคับตรงไหน
4. ผู้พัฒนาลองทำ Bookmarks ทีละส่วนจากตัวอย่าง AI ช่วยชี้แนะและรีวิว หากติดขัดให้ช่วยเฉพาะจุดแล้วลองใหม่ ไม่เขียนส่วนฝึกทั้งหมดแทนโดยไม่ถาม
5. เชื่อมสองหน้า UI กับ API พร้อม auth, loading, empty และ error states ตรวจตัวกรองและการยืนยันลบ
6. ตรวจกรณีข้ามผู้ใช้, token ผิด, PUT/PATCH, constraints และการลบ เชื่อม Auth0 จริงให้ครบเส้นทาง เก็บผลที่ทำจริงพร้อมข้อจำกัด
7. เขียน README และ workflow reflection พร้อมภาพสาธิตที่ไม่มีข้อมูลลับ ให้ผู้พัฒนาลองอธิบายและแก้พฤติกรรมเล็ก ๆ แล้วรัน tests เอง

บันทึกแผนเริ่มต้น: ขั้นที่ 1 เริ่มได้ก่อนมี Auth0 ส่วนขั้นเชื่อมต่อจริงใช้ tenant ของผู้พัฒนาเอง ปัจจุบันตั้งค่าแล้วและมีรายงาน login สำเร็จตามสถานะล่าสุดด้านบน

## หลักฐานจบรอบแรก

- รันจากขั้นตอนที่บันทึกไว้ได้และผ่าน typecheck, build กับชุดทดสอบที่กำหนด
- Automated tests ใช้ signed test tokens ผ่าน validation จริง พร้อม SQLite แยกและสองผู้ใช้
- มีผลตรวจ Auth0 จริงแยกจาก tests ที่จำลองแหล่งกุญแจ หากยังทำไม่ได้ต้องระบุว่างานส่วนนี้ยังไม่ครบ
- API contract ตรงกับโค้ด; ผู้พัฒนาอธิบาย token, ownership และความต่าง PUT/PATCH ได้
- ประวัติ commit และบทสนทนาเป็นหลักฐานจริง ไม่สร้างย้อนหลัง ไม่เผยแพร่หรือ deploy ในรอบนี้

## สถานะเริ่มงาน

ผู้พัฒนายืนยันใน Q15 แล้ว ไม่ต้องเปิดคำถามที่ตกลงแล้วซ้ำ ปัจจุบัน Auth/Collections implement แล้ว ขั้นถัดไปคือแบบฝึก Bookmarks ของผู้พัฒนา

## Current status (2026-09-18)

Stages 1-6 are complete for this learning slice: Auth0 integration, owner-scoped Collections, Bookmark validation/API/schema, responsive React UI, and browser verification. The project is ready for review, portfolio write-up, and optional polish within the existing feature boundary.
