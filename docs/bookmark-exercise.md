# แบบฝึก Bookmarks — เริ่มทีละส่วน

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

- ตรวจ URL และ body สำหรับ POST: title/url บังคับ, notes/collectionId เป็น optional, field ที่ไม่รู้จักต้องถูกปฏิเสธ
- ออกแบบ Bookmark schema และความสัมพันธ์กับ User/Collection พร้อม migration และ tests การรักษา Bookmarks เมื่อลบ Collection
- ทำ POST/GET พร้อม owner scope และตรวจ Collection ปลายทางว่าเป็นของผู้เรียก แม้รู้ Collection ID ก็ไม่พอ
- ทำ pagination/filter, PUT/PATCH และ DELETE ทีละส่วน แล้วตรวจสอง identities ก่อนเชื่อม UI

ยังไม่มี Bookmark implementation หรือผลทดสอบฟีเจอร์ Bookmarks ณ ตอนเริ่มแบบฝึกนี้
