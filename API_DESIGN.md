# API contract — ยืนยันแล้วใน Q15

สถานะ: ผู้พัฒนายืนยัน contract ร่วมกับแผนเริ่มงานใน Q15 แล้ว ขณะนี้กำลังทำ scaffold ยังไม่มี business API ที่ implement ตาม contract นี้

## Resources

Collection มี id, name, ownerId, createdAt, updatedAt ส่วน Bookmark มี id, url, title, notes, collectionId, ownerId, createdAt, updatedAt ค่า notes และ collectionId ที่ไม่มีข้อมูลตอบเป็น null

เวลาใช้ ISO 8601 ใน UTC ส่วน id เป็นค่า opaque ที่ client ไม่ต้องตีความ

| Method | Route | สำเร็จ |
| --- | --- | --- |
| GET | /me | 200 ข้อมูลผู้ใช้ปัจจุบัน |
| GET | /collections, /bookmarks | 200 รายการแบบแบ่งหน้า |
| GET | /collections/:id, /bookmarks/:id | 200 resource |
| POST | /collections, /bookmarks | 201 resource ที่สร้าง |
| PUT | /collections/:id, /bookmarks/:id | 200 resource หลังแทนที่ |
| PATCH | /collections/:id, /bookmarks/:id | 200 resource หลังแก้ไข |
| DELETE | /collections/:id, /bookmarks/:id | 204 ไม่มี body |
| GET | /collections/:id/bookmarks | 200 รายการแบบแบ่งหน้า |

## Identity และความเป็นส่วนตัว

ทุก route ตรวจ Access Token ก่อนเข้าถึงข้อมูล รับเฉพาะ token ที่ issuer และ audience ตรงกับการตั้งค่าของแอปและผ่านการตรวจ signature/เวลา ไม่รับ issuer, JWKS URL หรือ algorithm ตามที่ผู้เรียกเลือกเองในคำขอ ต้องตรวจ tenant ของผู้พัฒนาก่อนกำหนดรายละเอียดจริง

ข้อเสนอ: มี User ใน SQL ใช้คู่ issuer และ subject ที่ตรวจแล้วเชื่อมกับ identity ภายนอก และใช้ id ภายในเป็น ownerId ไม่ใช้ email เป็นตัวบ่งชี้เจ้าของ GET /me คืนเฉพาะ id ภายในและ subject ของผู้เรียก ไม่คาดหวังว่า Access Token จะมีชื่อหรือ email

ไม่รับ ownerId, id หรือ timestamps ใน request body ทุก query, count และ mutation จำกัดด้วยเจ้าของจาก identity ที่ตรวจแล้ว ตรวจ Collection ปลายทางด้วยเมื่อสร้างหรือย้าย Bookmark การเปลี่ยนกลุ่มไม่เปลี่ยนเจ้าของ

ID ที่ไม่มีจริงและ ID ของผู้อื่นตอบ 404 ด้วย code/message เดียวกัน รวมทั้ง nested route และ collection filter ไม่ส่งชื่อ เจ้าของ หรือจำนวนข้อมูลของผู้อื่นออกมา ขอบเขต tests ตรวจ response และผลต่อฐานข้อมูล ไม่อ้างว่าพิสูจน์การป้องกัน timing side-channel ทุกชนิด

## Input ที่เสนอ

- Collection name: trim หัวท้าย ความยาว 1–100 Unicode code points; ชื่อซ้ำต่อเจ้าของตรวจหลัง trim และแปลงตัวพิมพ์เล็ก ต้องใช้กฎเดียวกันตอนสร้างและเปลี่ยนชื่อ รวมถึงมีข้อจำกัดในฐานข้อมูลรองรับคำขอพร้อมกัน
- Bookmark title: trim หัวท้าย ความยาว 1–200 Unicode code points
- URL: trim หัวท้าย ความยาวไม่เกิน 2,048 Unicode code points ต้องเป็น absolute http/https URL มี hostname และไม่มี username/password ฝังใน URL เก็บลิงก์โดยไม่เรียกเว็บไซต์ปลายทาง
- notes: ข้อความธรรมดาความยาวไม่เกิน 5,000 Unicode code points หรือ null ยอมรับข้อความว่างและเก็บตามที่ส่ง ไม่ render เป็น HTML
- collectionId: ID แบบ non-empty string หรือ null
- ปฏิเสธ field ที่ไม่รู้จัก, ชนิดผิด และ PATCH body ว่างด้วย 400
- POST ที่ไม่ส่ง notes หรือ collectionId กำหนดเป็น null
- PUT ต้องมี name สำหรับ Collection หรือ url/title สำหรับ Bookmark; optional fields ที่ไม่ส่งกลายเป็น null
- PATCH เปลี่ยนเฉพาะ field ที่ส่งมา ส่ง null ได้เฉพาะ notes/collectionId
- URL ซ้ำเป็นคนละ Bookmark ได้ แต่ Collection name ซ้ำในเจ้าของเดียวกันตอบ 409

## รายการและตัวกรองที่เสนอ

- ใช้ page เริ่มที่ 1 และ pageSize เริ่มที่ 20 สูงสุด 100 ต้องเป็นจำนวนเต็มบวก
- เรียง createdAt จากใหม่ไปเก่าและใช้ id เป็นตัวตัดสินเมื่อเวลาเท่ากัน เพื่อให้ลำดับแน่นอนบนชุดข้อมูลที่ไม่เปลี่ยนระหว่างอ่านแต่ละหน้า
- ตอบ { items, page, pageSize, total } โดย total นับหลังจำกัดเจ้าของและใช้ตัวกรอง
- /collections รับ name เป็นการค้นหาบางส่วนแบบไม่แยกตัวพิมพ์ใหญ่–เล็ก; trim ก่อนค้นหาและชื่อค้นหาว่างหมายถึงไม่กรอง
- /bookmarks ไม่ส่ง filter = ทั้งหมดของตนเอง; collectionId=<id> = เฉพาะ Collection; uncategorised=true = ไม่จัดกลุ่ม
- ไม่รับ collectionId พร้อม uncategorised และไม่รับ uncategorised ค่าอื่นนอกจาก true
- collectionId ที่ไม่มีจริงหรือไม่ใช่ของผู้เรียกตอบ 404 เหมือนกัน
- /collections/:id/bookmarks รับเฉพาะ pagination และตรวจเจ้าของ Collection ก่อน
- ปฏิเสธ query parameter ที่ไม่รองรับหรือส่งซ้ำอย่างกำกวมด้วย 400

## การลบ

ลบ Collection และปลดความสัมพันธ์ของ Bookmarks เป็นงานที่ต้องสำเร็จร่วมกัน เจ้าของ เนื้อหา และตัว Bookmark คงอยู่ ลบ Bookmark เป็นการลบถาวร UI ต้องมีการยืนยันก่อนส่งคำขอ ลบ ID ที่ไม่มีแล้วตอบ 404

## Errors ที่เสนอ

ใช้ { error: { code, message } } โดย message เป็นข้อความทั่วไป ไม่ส่ง stack trace, token, SQL หรือรายละเอียดผู้ใช้อื่น

| Status | Code | กรณี |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | Input ไม่ตรง contract |
| 401 | UNAUTHENTICATED | ไม่มีหรือใช้ token ที่ยอมรับไม่ได้ |
| 404 | NOT_FOUND | ไม่พบ resource ในขอบเขตเจ้าของ |
| 409 | COLLECTION_NAME_CONFLICT | ชื่อซ้ำในเจ้าของเดียวกัน |
| 500 | INTERNAL_ERROR | ความผิดพลาดภายในที่ไม่เปิดรายละเอียด |

## หลักฐานและข้อผิดพลาดจริง

ยังไม่มีโค้ดหรือผล tests จึงยังไม่มีเหตุการณ์ผิดพลาดจาก implementation ให้รายงาน จะบันทึกเฉพาะเหตุการณ์ที่เกิดขึ้นจริง พร้อมตำแหน่งโค้ดและวิธีตรวจพบเมื่อเริ่มพัฒนา
