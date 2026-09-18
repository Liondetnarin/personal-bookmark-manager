# แบบฝึก Bookmarks - เริ่มทีละส่วน

สถานะ 2026-09-18: แบบฝึกนี้ดำเนินการครบเป็น portfolio slice แล้ว รวม validation, POST body, schema, owner-scoped routes, tests และ UI ตามขอบเขตที่ยืนยันไว้

ฐานตัวอย่างคือ commit `eef2562` ซึ่งมี Auth/Collections และผ่านการตรวจแล้ว ขั้นนี้ให้ผู้พัฒนาลงมือเอง โดย AI ช่วยอธิบาย ตรวจ และแก้เฉพาะจุด ยังไม่เปิด Bookmark API จนกว่าจะมี auth/ownership พร้อมกัน

## งานแรก: ตรวจชื่อ Bookmark

สร้างไฟล์ `backend/src/bookmarks/bookmark-input.ts` แล้วเขียนฟังก์ชันนี้:

```ts
export function bookmarkTitle(value: unknown): string {
  // เขียนส่วนตรวจและคืนค่าด้วยตัวเอง
}
```

หน้าที่มีเพียงตรวจ title ตาม API_DESIGN.md:

1. รับค่า unknown เพราะข้อมูลจาก HTTP อาจไม่ใช่ข้อความ แม้ TypeScript ในโปรเจกต์จะระบุ type ไว้
2. ถ้าไม่ใช่ string ให้ throw `BadRequestException` จาก `@nestjs/common`
3. ตัดช่องว่างหัวท้าย แล้วตรวจความยาว 1–200 Unicode code points
4. ถ้าผ่าน ให้คืนข้อความที่ trim แล้ว

ดู `collectionName` ใน `backend/src/collections/collection-input.ts` เป็นตัวอย่าง แต่ฟังก์ชันใหม่นี้รับค่าของ title โดยตรง ไม่รับ body ทั้งก้อน และไม่ต้องสร้าง nameKey เพราะ Bookmark title ซ้ำได้

| input | ผลที่ต้องได้ |
| --- | --- |
| `"  NestJS Guide  "` | `"NestJS Guide"` |
| `"เรียน TypeScript"` | ข้อความเดิม |
| `""` หรือ `"   "` | BadRequestException |
| `null`, `undefined`, `42`, `[]`, `{}` | BadRequestException |
| `"😀".repeat(200)` | ผ่าน |
| `"😀".repeat(201)` | BadRequestException |

อย่าใช้ `.length` ของ string เป็นจำนวน Unicode code points เพราะบางตัวอักษรใช้มากกว่าหนึ่ง UTF-16 code unit ลองเทียบ `"😀".length` กับ `[..."😀"].length` ใน Node เพื่อดูผลด้วยตัวเอง

เมื่อเขียนแล้วรันจาก root:

```powershell
npm.cmd run typecheck --workspace backend
```

คำสั่งนี้ตรวจ type ยังไม่พิสูจน์พฤติกรรมตามตาราง แจ้งว่า “เขียน bookmarkTitle แล้ว” เพื่อให้ AI อ่านไฟล์จริง รีวิวร่วมกัน และเพิ่ม/รัน behavioral tests ตามกรณีด้านบน ไม่ต้องส่ง token หรือ password

## ลำดับถัดจากงานแรก

บท URL ที่ทำแล้วอยู่ใน `backend/src/bookmarks/bookmark-input.ts` ชื่อ `bookmarkUrl(value: unknown)`:

1. ตรวจ string และ trim เช่นเดียวกับ title จำกัดไม่เกิน 2,048 Unicode code points
2. ใช้ `new URL(url)` โดยไม่ส่ง base URL เพื่อปฏิเสธ relative URL เช่น `/read`
3. ตรวจ `protocol` ให้เป็น `http:` หรือ `https:` และต้องมี `hostname`
4. ปฏิเสธ `username` หรือ `password` ที่ฝังอยู่ในลิงก์
5. คืน string หลัง trim แทน `parsed.href` เพื่อรักษารูปแบบลิงก์เดิม ไม่เรียกเว็บไซต์หรือทำ DNS lookup

`new URL` ช่วยแยกส่วนของลิงก์ แต่ไม่ได้บังคับกฎของแอปให้ทั้งหมด เช่น `javascript:alert(1)` parse ได้ จึงยังต้องตรวจ protocol เอง ส่วน parser error ถูกแปลงเป็น BadRequestException เพื่อไม่เปิดเผย input ในข้อความผิดพลาด

ตัวอย่าง: `https://example.invalid/read?q=one#part` ผ่าน, `/read` และ `https://user:password@example.invalid` ไม่ผ่าน การตรวจรูปแบบไม่ยืนยันว่าเว็บไซต์เปิดได้หรือเนื้อหาปลอดภัย ใช้ WHATWG URL parser ตาม Node; localhost/IP ยอมรับได้ตาม contract เพราะขั้นนี้เก็บลิงก์ ไม่ได้ดึงเนื้อหา

ขั้นต่อไป:

- ตรวจ URL และ body สำหรับ POST: title/url บังคับ, notes/collectionId เป็น optional, field ที่ไม่รู้จักต้องถูกปฏิเสธ
- ออกแบบ Bookmark schema และความสัมพันธ์กับ User/Collection พร้อม migration และ tests การรักษา Bookmarks เมื่อลบ Collection
- ทำ POST/GET พร้อม owner scope และตรวจ Collection ปลายทางว่าเป็นของผู้เรียก แม้รู้ Collection ID ก็ไม่พอ
- ทำ pagination/filter, PUT/PATCH และ DELETE ทีละส่วน แล้วตรวจสอง identities ก่อนเชื่อม UI

มีเฉพาะ helper ตรวจ title/URL กับ unit tests ยังไม่มี Bookmark API หรือฐานข้อมูล Bookmark และผล tests ไม่ใช่หลักฐานว่าฟีเจอร์บันทึกลิงก์ครบแล้ว

## Implementation result

The exercise is complete as the first portfolio slice. It includes owner-scoped bookmark CRUD, validation, collection and uncategorised filters, pagination, nested collection views, composite ownership protection, and preservation of bookmarks when a collection is deleted. The React workspace includes responsive screens, detail, confirmation, loading, empty, and retry states.

Verification uses 52 isolated backend tests and 8 Playwright tests across desktop and mobile with signed fixture identities and temporary SQLite data. No real Auth0 secrets or application data are used by the test suite.
