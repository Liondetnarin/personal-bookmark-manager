# บทเรียน Collections — ตรวจตัวตนแล้ว ยังต้องตรวจเจ้าของ

บทนี้มี schema กับ API สำหรับสร้าง อ่านรายการ อ่านหนึ่งกลุ่ม เปลี่ยนชื่อ และลบ Collection หน้าจอยังคงเป็นหน้าล็อกอินเดิม เพราะแผนให้เรียน API และ tests ก่อนเชื่อม UI ส่วน Bookmark schema, routes และความสัมพันธ์ยังเป็นบทถัดไป

## เส้นทางของคำขอ

1. `backend/src/auth/auth.guard.ts` ตรวจ Access Token เพื่อรู้ว่าใครเป็นผู้เรียก
2. `backend/src/auth/owner.service.ts` หา/สร้าง User จาก issuer + subject ที่ตรวจแล้ว คืน id ภายใน ไม่บังคับว่าต้องเรียก `/me` ก่อน
3. `backend/src/collections/collections.controller.ts` รับคำขอ ตรวจ input และส่ง owner ID ที่ได้จาก identity ไป service
4. `backend/src/collections/collections.service.ts` ใส่ ownerId ในทุก read/count/mutation ไม่ใช้ ownerId จาก body หรือ query
5. `backend/prisma/schema.prisma` บังคับ foreign key ไป User และชื่อกลุ่มไม่ซ้ำภายในเจ้าของคนเดียวกัน

ตัวอย่างสำคัญในคำสั่งเปลี่ยนชื่อ:

```ts
this.database.collection.update({
  where: { id, ownerId },
  data,
  select,
});
```

คำสั่งนี้หากลุ่มด้วยทั้ง ID และเจ้าของ หากเป็น ID ของคนอื่นจะหาไม่พบและคืน 404 เช่นเดียวกับ ID ที่ไม่มีจริง การตรวจเจ้าของอยู่ในคำสั่งแก้ไขด้วย ไม่ได้พึ่งเพียงการตรวจครั้งก่อนหน้า

## สิ่งที่ API รองรับในบทนี้

| คำขอ | ผลสำเร็จ |
| --- | --- |
| `POST /collections` body `{ "name": "Reading" }` | 201 กลุ่มที่สร้าง |
| `GET /collections?page=1&pageSize=20&name=read` | 200 `{ items, page, pageSize, total }` |
| `GET /collections/:id` | 200 กลุ่มของผู้เรียก |
| `PUT /collections/:id` body `{ "name": "Study" }` | 200 กลุ่มหลังแทนที่ข้อมูลที่แก้ได้ |
| `PATCH /collections/:id` body `{ "name": "Study" }` | 200 กลุ่มหลังแก้ไข |
| `DELETE /collections/:id` | 204 ไม่มี body |

ทุกคำขอต้องมี `Authorization: Bearer <API Access Token>` ของตัวเอง อย่าใส่ token ลงไฟล์ที่ commit หรือส่งผ่านแชต การเปิด URL API ใน address bar โดยตรงจะไม่ได้แนบ token จึงได้ 401

Collection มีช่องที่แก้ได้เพียง name จึงต้องส่ง name ทั้ง PUT และ PATCH; `{}` ถูกปฏิเสธ ความต่างเมื่อไม่ส่ง optional fields จะเรียนผ่าน Bookmarks ตาม contract

ชื่อถูก trim และนับความยาวตาม Unicode code points ระหว่าง 1–100 ใช้ nameKey ที่แปลงเป็นตัวพิมพ์เล็กสำหรับตรวจชื่อซ้ำ ฐานข้อมูลบังคับ unique `[ownerId, nameKey]` จึงป้องกันชื่อซ้ำจากคำขอพร้อมกันด้วย และไม่ส่ง nameKey ออกใน response

รายการกับ total จำกัดเจ้าของและใช้ตัวกรองเดียวกันใน transaction เรียง createdAt DESC, id DESC ใช้ SQLite `instr` เพื่อค้นชื่อบางส่วนแบบ literal หลังแปลงเป็นตัวพิมพ์เล็ก เพราะ `%` และ `_` มีความหมายพิเศษใน SQL LIKE พารามิเตอร์ใน `$queryRaw` ใช้ tagged template เพื่อ bind ค่า ไม่ต่อ string เป็น SQL

## ลองอ่าน tests แล้วรันเอง

```powershell
npm.cmd test
```

เปิด `backend/test/collections.test.mjs` ดู test `foreign IDs behave like absent IDs...` จะเห็นการสร้าง token ให้ผู้ใช้สองคน ส่งคำขอผ่าน HTTP จริง แล้วเทียบทั้ง response และข้อมูลในฐานข้อมูลก่อน/หลัง ไม่ข้าม auth guard

จากนั้นดู `database uniqueness holds for concurrent creates and renames`: คำขอสร้างชื่อเดียวกัน 5 ครั้งพร้อมกันต้องได้ 201 หนึ่งครั้ง และ 409 อีกสี่ครั้ง

ก่อนทำแบบฝึกต่อ ลองตอบด้วยคำพูดของคุณ:

1. ถ้าตัด ownerId ออกจาก `where` ของคำสั่ง update จะเกิดอะไรขึ้น และ test ใดควรจับได้?
2. ทำไมการตรวจชื่อซ้ำด้วย `findFirst` ก่อนสร้างอย่างเดียวจึงไม่พอเมื่อมีคำขอพร้อมกัน?
3. ทำไม total ต้องใช้เงื่อนไขเจ้าของและตัวกรองเดียวกับ items?

## ขอบเขตหลักฐาน

Automated tests รวม 31 รายการผ่าน รวม auth tests เดิมและ Collections tests ข้อมูลและกุญแจทดสอบแยกจากของจริง ตรวจการสร้าง/แก้ชื่อ/ลบ การกรอง Unicode และอักขระพิเศษ pagination input ผิด และ ownership

ยังไม่ได้ทดสอบ Collections ผ่าน browser หรือ token จาก Auth0 จริง และยังพิสูจน์การลบ Collection แล้วรักษา Bookmarks ไม่ได้ เพราะยังไม่มี Bookmark model ส่วน `GET /collections/:id/bookmarks` จะทำพร้อมบทความสัมพันธ์ ไม่คืนรายการว่างปลอมเพื่ออ้างว่าทำเสร็จแล้ว

อ้างอิง: [NestJS controllers](https://docs.nestjs.com/controllers), [Prisma filtering and sorting](https://docs.prisma.io/docs/orm/v7/prisma-client/queries/filtering-and-sorting)
