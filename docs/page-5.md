# 5. ข้อกำหนด Backend API

## Stack

- Node.js และ TypeScript
- NestJS สำหรับ HTTP layer
- Prisma เป็น ORM และใช้ฐานข้อมูล SQL
- OIDC กับ Auth0 tenant ที่ผู้พัฒนาสร้างและดูแลเอง

## Authentication

ทุก API route ต้องยืนยันตัวตน ใช้ Authorization Code flow with PKCE (S256) ไม่ใช้ implicit flow

ค่าด้านล่างเป็นตัวอย่างสำหรับตั้งค่าภายหลัง ยังไม่มีการสร้างหรือเชื่อมต่อบริการจริง:

| ค่า | ค่าตัวอย่าง |
| --- | --- |
| Discovery endpoint | https://<YOUR_AUTH0_DOMAIN>/.well-known/openid-configuration |
| Client ID | <YOUR_AUTH0_CLIENT_ID> |
| Callback URL | http://localhost:3000/callback |
| Logout URL | http://localhost:3000 |
| Scope | openid profile email |
| API audience | https://personal-bookmark-manager-api |

ลงทะเบียน audience ให้ตรงกับ API ใน tenant ของตนเอง ค่า audience เป็น identifier ไม่จำเป็นต้องเป็นเว็บไซต์ที่ deploy แล้ว ตั้งค่า frontend ให้ใช้พอร์ต 3000 เพื่อให้ตรงกับ callback

สร้างบัญชีทดสอบของตนเอง ห้ามใช้ tenant, Client ID หรือบัญชีของโครงการภายนอก ไม่ใส่รหัสผ่านหรือ token จริงในเอกสาร seed หรือ transcript ที่เผยแพร่

ก่อนเลือกวิธีตรวจ token ให้ตรวจ discovery document และ JWKS ของ tenant ของตนเอง บันทึกสิ่งที่พบและเหตุผลการเลือก Bearer credential ใน README.md อย่าอ้างว่าได้ตรวจแล้วหากยังไม่ได้ตรวจ

## Resources และ routes

ทั้ง /collections และ /bookmarks รองรับ:

| วิธี | Route | หน้าที่ |
| --- | --- | --- |
| GET | /resource | List และ filtering |
| GET | /resource/:id | อ่านหนึ่งรายการ |
| POST | /resource | สร้าง |
| PUT | /resource/:id | แทนที่ข้อมูลที่แก้ไขได้ตาม contract |
| PATCH | /resource/:id | แก้ไขบางส่วน |
| DELETE | /resource/:id | ลบ |

/resource ในตารางหมายถึง /collections หรือ /bookmarks เพิ่ม GET /me สำหรับข้อมูลผู้ใช้ปัจจุบัน และ GET /collections/:id/bookmarks สำหรับ Bookmarks ใน Collection ของผู้ใช้

## ข้อมูลและความสัมพันธ์

- Collection: id, name, ownerId, createdAt, updatedAt
- Bookmark: id, url, title, notes?, collectionId?, ownerId, createdAt, updatedAt
- Bookmark อาจไม่อยู่ใน Collection ได้
- Collection และ Bookmark ต้องมีเจ้าของ ความสัมพันธ์ต้องไม่เชื่อมข้อมูลข้ามเจ้าของ
- ใช้ SQL persistence ผ่าน Prisma สำหรับข้อมูลของ API และบันทึกวิธีจัดการข้อมูลผู้ใช้ของ /me
- Seed ข้อมูลสมมติอย่างน้อยสองผู้ใช้ที่มี identity ต่างกัน ไม่ใช่เพียงเปลี่ยนชื่อแสดงผล
- ระบุวิธีจับคู่ test identities กับเจ้าของข้อมูล รวมทั้งข้อจำกัดของ mocks และการทดสอบด้วย Auth0 จริง

กำหนด validation, status codes, error shape, list/filter parameters, ความหมายของ PUT/PATCH และพฤติกรรมเมื่อลบ Collection ใน API_DESIGN.md ก่อนนำไปใช้