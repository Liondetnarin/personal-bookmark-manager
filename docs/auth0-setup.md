# บทที่ 2A — เตรียม Auth0 ของเราเอง

สถานะ: เริ่มเตรียมการ ยังไม่มี tenant ของผู้พัฒนาใน configuration ยังไม่ได้ตรวจ discovery/JWKS จริง และยังไม่เพิ่ม auth guard หรือ /me

## เข้าใจสามส่วนก่อน

- Tenant: พื้นที่ของคุณใน Auth0 ใช้แยกการตั้งค่า Applications, APIs และบัญชีผู้ใช้
- Application: ตัว React frontend ที่พาผู้ใช้ไปล็อกอิน เป็น Single Page Application
- API: ตัว NestJS backend ที่รับ Access Token มี Identifier หรือ audience ของตนเอง

Client ID ระบุ Application ส่วน audience ระบุ API ทั้งสองมีหน้าที่ต่างกัน และไม่ใช่รหัสผ่าน

## 1. สร้าง tenant ส่วนตัว

เปิด [Auth0 Dashboard](https://manage.auth0.com/) สมัครหรือล็อกอินด้วยบัญชีของคุณเอง สร้าง tenant สำหรับ development ตั้งชื่อที่จำได้และจด Domain ที่แสดงจริง เช่น your-tenant.us.auth0.com ตัวอย่างนี้ไม่ใช่โดเมนที่ให้ใช้งาน

การสร้างบัญชี การตั้งรหัสผ่าน และการยอมรับเงื่อนไขให้ผู้พัฒนาทำด้วยตนเอง ไม่ใช้บัญชีของแบบทดสอบภายนอก

## 2. สร้าง Application สำหรับ React

ไป Applications → Applications → Create Application ชื่อ Personal Bookmark Manager Web เลือก Single Page Web Application จากนั้นตั้งค่าหน้า Settings:

| ช่อง | ค่าโปรเจกต์ |
| --- | --- |
| Allowed Callback URLs | http://localhost:3000/callback |
| Allowed Logout URLs | http://localhost:3000 |
| Allowed Web Origins | http://localhost:3000 |

บันทึกการตั้งค่า จด Domain และ Client ID ไม่คัดลอก Client Secret มาใช้ใน frontend เมื่อทดสอบล็อกอินให้เปิด localhost:3000 เพื่อให้ origin ตรงกัน ไม่สลับกับ 127.0.0.1

แนวทางที่เราจะ implement คือ Authorization Code + PKCE (S256) ไม่ใช้ implicit flow การตั้ง URLs อย่างเดียวไม่ได้พิสูจน์ว่า flow ทำงานแล้ว

## 3. สร้าง API ของ NestJS

ไป Applications → APIs → Create API:

| ช่อง | ค่าที่ใช้/เสนอสำหรับโปรเจกต์ |
| --- | --- |
| Name | Personal Bookmark Manager API |
| Identifier | https://personal-bookmark-manager-api |
| Signing Algorithm | เสนอ RS256 ตามแนวทาง Auth0; จดค่าที่เลือกจริงไว้ตรวจร่วมกับ JWKS |

Identifier ไม่ใช่ URL ที่ Backend ต้องเปิดให้เรียกจริง Backend ยังรันที่ localhost:3001 ส่วน audience เป็นชื่อเป้าหมายของ token ที่ต้องตรงกัน

ตรวจการอนุญาตให้ SPA ของเราเรียก API ในนามผู้ใช้ตาม API access policy ใน Dashboard ด้วย ไม่ต้องสร้าง Machine-to-Machine application หรือขอ Management API token สำหรับแอปนี้ หากหน้าจอมีตัวเลือกที่ไม่ตรงคู่มือ ให้บอกชื่อช่องเพื่อช่วยตรวจ ไม่เปลี่ยนเป็นการเปิดสิทธิ์ให้ทุกแอปโดยอัตโนมัติ

## 4. ตั้งค่าเฉพาะในเครื่อง

คัดลอก backend/.env.example เป็น backend/.env และ frontend/.env.example เป็น frontend/.env เฉพาะเมื่อไฟล์ปลายทางยังไม่มี เพื่อไม่เขียนทับค่าที่ตั้งไว้เอง ใส่ค่าต่อไปนี้:

| ไฟล์ | ตัวแปร | ใส่อะไร |
| --- | --- | --- |
| backend/.env | AUTH0_ISSUER | https://โดเมนจริงของคุณ/ มี slash ท้าย |
| backend/.env | AUTH0_AUDIENCE | https://personal-bookmark-manager-api |
| frontend/.env | VITE_AUTH0_DOMAIN | โดเมนจริง ไม่ใส่ https:// หรือ slash |
| frontend/.env | VITE_AUTH0_CLIENT_ID | Client ID ของ SPA ที่สร้าง |
| frontend/.env | VITE_AUTH0_AUDIENCE | https://personal-bookmark-manager-api |

คง PORT, FRONTEND_ORIGIN และ VITE_API_URL ตามตัวอย่าง ห้ามใส่ password, Client Secret หรือ Access Token ลง frontend env ไฟล์ env จริงถูก ignore แล้ว ค่าเหล่านี้ยังไม่ถูกนำไปใช้โดย scaffold จนถึงบท implementation

## 5. ตรวจหลักฐานก่อนเขียนตัวตรวจ token

จาก root ของโปรเจกต์ รันโดยแทน Domain ด้วยของคุณเอง:

```powershell
npm.cmd run auth:inspect -- YOUR_TENANT.us.auth0.com
```

คำสั่งรับเฉพาะ canonical domain ที่ลงท้าย .auth0.com และอ่าน public discovery/JWKS เท่านั้น ไม่ล็อกอิน ไม่สร้างบัญชี และไม่เปลี่ยนการตั้งค่า ไม่มีการบันทึกผลลงไฟล์ให้อัตโนมัติ หากใช้ custom domain ให้แจ้งก่อนเพื่อปรับวิธีตรวจให้ตรงกับ issuer จริง

อ่าน issuer, response types, PKCE methods และ public key metadata พร้อมข้อความ limits ในผลลัพธ์ ฟิลด์ id_token_signing_alg_values_supported กล่าวถึง ID Token จึงไม่ใช่หลักฐานยืนยัน algorithm ของ Access Token สำหรับ API ของเรา ต้องเทียบกับค่าของ API ใน Dashboard อีกส่วน

หลังได้ข้อมูลนี้ จึง implement ตัวตรวจ Access Token, global guard และ /me พร้อม tests ที่ใช้ signed test tokens การคืน id ภายในของ /me ต้องทำ User persistence ผ่าน Prisma/SQLite ตาม contract จึงต้องสอนส่วน User schema ที่จำเป็นด้วย ไม่สร้าง ID ชั่วคราวที่อ้างว่าเป็นข้อมูลในฐานข้อมูล

## ส่งกลับมาเพื่อไปต่อ

บอก Domain ของ tenant ของคุณ และเมื่อพร้อมให้บอก Client ID ของ SPA กับ API Identifier หรือแจ้งว่าใส่ลง env ในเครื่องแล้ว ไม่ต้องส่ง Client Secret, password หรือ token ถ้ายังไม่มี tenant ให้เริ่มข้อ 1–2 ก่อนแล้วส่งเฉพาะ Domain ได้

## เอกสารอ้างอิง

สถานะล่าสุด 2026-09-14: ตั้ง env และตรวจ discovery/JWKS แล้ว ผู้พัฒนาเปิด User-Delegated Access สำหรับ SPA แล้ว ผล authorization probe แบบไม่มี session คือ login_required ยังต้องลอง login จริง ดู [บทเรียน Authentication](authentication.md)

หาก SPA ไม่ได้รับสิทธิ์เรียก API ให้ไป Applications → APIs → API ของเรา → Application Access → SPA → Edit → Grant Access เฉพาะ User-Delegated Access แล้ว Save โดยใช้ Per-app authorization ดู [เอกสาร Application Access](https://auth0.com/docs/get-started/applications/application-access-to-apis-client-grants)

- [Create tenants](https://auth0.com/docs/get-started/auth0-overview/create-tenants)
- [React quickstart](https://auth0.com/docs/quickstart/spa/react)
- [Register APIs](https://auth0.com/docs/get-started/auth0-overview/set-up-apis)
- [Signing algorithms](https://auth0.com/docs/get-started/applications/signing-algorithms)
- [Validate Access Tokens](https://auth0.com/docs/secure/tokens/access-tokens/validate-access-tokens)
