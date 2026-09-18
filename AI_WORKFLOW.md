# AI workflow - หลักฐานที่เกิดขึ้นจริง

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

## ขั้นที่ 2A - เตรียม Auth0 (2026-09-14)

ผู้พัฒนาขอไปต่อและแจ้งว่ายังไม่มี Auth0 tenant จึงเตรียม docs/auth0-setup.md และคำสั่ง auth:inspect เพื่ออ่าน public discovery/JWKS ของ canonical Auth0 domain ที่ระบุเอง โดยยังไม่เลือกค่าตรวจ token ของ tenant ที่ไม่มีข้อมูล

อ่านเอกสาร Auth0 ทางการเรื่อง React SPA, tenants, API registration และ signing algorithms คู่มือระบุ callback/logout/origin ตามพอร์ตโปรเจกต์ และแยก ID-token metadata ออกจากหลักฐาน algorithm ของ Access Token

ตรวจ node --check ของ script และ --help ผ่าน ตรวจ placeholder, HTTP, non-Auth0 domain และ URL ที่มี credentials ว่าถูกปฏิเสธก่อน network request ผ่าน npm.cmd run check และ npm.cmd run smoke ของโครงเดิมผ่าน

ยังไม่ได้รันเส้นทางอ่าน metadata กับ tenant จริง ยังไม่มี auth guard, /me หรือการตรวจ login จริง งาน dependent รอ Domain ของ tenant ที่ผู้พัฒนาสร้างเอง ไม่ถือว่าขั้น Authentication เสร็จ

## Step 2B - 2026-09-14 (work summary, not transcript)

Implemented Auth0 React login/logout, a global Nest guard validating RS256 signatures/issuer/audience/claims with jose, and GET /me backed by Prisma/SQLite User identity. No Collections or Bookmarks implementation.

Latest verification: npm.cmd run check passed; npm.cmd test passed 18 tests; npm.cmd run smoke passed. Tests use signed test tokens, a local HTTP JWKS server and isolated SQLite. Smoke checks startup/HTTP only. Vite reports a 599.37 kB chunk (184.78 kB gzip); bundle optimization remains pending.

Actual corrections: MUI Stack alignItems moved into sx after typecheck rejected the prop. Prisma migrate initially returned an unexplained Schema engine error. Database URLs now resolve consistently for CLI/runtime, but an additional failure still occurred. Retry with Rust logging succeeded, and a subsequent normal migration reported no pending migrations. The original failure's cause is unconfirmed.

Tenant discovery/JWKS succeeded. ID-token algorithm metadata does not prove API Access Token settings. The authorization probe initially failed because SPA API access was missing. After the user enabled User-Delegated Access, a sessionless probe returned login_required. This does not prove successful login. Browser tools had no available session; actual browser login/callback/API verification is still pending.

## ขั้นที่ 3 - Collections API (2026-09-15)

บันทึกนี้เป็นสรุป ไม่ใช่ transcript ผู้พัฒนายืนยันว่าลอง login สำเร็จและขอไปขั้นถัดไป จึงอัปเดตสถานะ Auth เป็นผลที่ผู้พัฒนารายงาน ไม่อ้างว่า agent ตรวจ browser เอง

เพิ่ม Collection schema/migration, CRUD controller/service และ input validation แยก OwnerService จาก /me ให้ทุก route ใช้ User identity จาก validated issuer + subject ทุก read/count/mutation จำกัด ownerId และ foreign IDs ตอบ 404 เหมือน absent IDs ใช้ database unique constraint บน ownerId/nameKey เพื่อรับมือ concurrent creates/renames

List ใช้ bound SQL parameters กับ SQLite instr สำหรับ literal substring หลัง lowercase และ transaction สำหรับ page/count ไม่ใช้ LIKE wildcard semantics กับข้อความที่ผู้ใช้กรอก จากนั้นอ่าน resource ผ่าน Prisma โดยยังจำกัดเจ้าของและเลือกเฉพาะ fields ใน contract

ผลจริง: npm.cmd test ผ่าน 31 รายการตามรายงาน Node test runner (รวม auth tests เดิมและ parent tests); npm.cmd run check และ npm.cmd run smoke ผ่าน; npm.cmd run db:migrate ใช้ migration 202609150001_collections สำเร็จกับฐานข้อมูล development เดิม ไม่ล้างข้อมูล ทดสอบ input ผิด, Unicode, literal %/underscore/quote, pagination/tie-breaker, cross-owner read/write/delete, conflict และ concurrent operations ผ่าน HTTP/JWKS/SQLite แยก

Tests รอบแรกของบท Collections ผ่านทั้งหมด ไม่มีบั๊กจาก test failure ให้รายงาน ไม่แต่งเหตุการณ์ผิดพลาดเพิ่ม Vite ยังเตือน bundle 599.37 kB เช่นเดิม Smoke เป็นหลักฐาน startup/HTTP เท่านั้น

เพิ่ม docs/collections.md ให้ผู้พัฒนาอ่านตามเส้นทางคำขอและอธิบาย owner predicate, unique constraint และ scoped total ก่อนแบบฝึก Bookmarks ไม่มีการเพิ่ม frontend UI, Bookmark model/routes, nested bookmarks route หรือ deploy การรักษา Bookmarks เมื่อลบ Collection และการตรวจ Collections ด้วย Auth0 token จริงยังไม่ได้ทำ

## ตรวจข้อมูล ความปลอดภัย และเตรียม commit - 2026-09-15

ผู้พัฒนาขอให้ตรวจข้อมูล/ความปลอดภัยก่อน commit แล้วไปขั้นถัดไป ใช้ code-review skill แยก Standards กับ Spec ในสอง reviewer โดยเทียบ working tree กับ fb7a884 พบข้อเสนอปรับ startup log และข้อความสถานะเก่าในแผนเรียนรู้ แก้ทั้งสองแล้ว Main agent ตรวจ SQLite แบบ read-only ได้ integrity ok และไม่พบ orphan/foreign-key violation/ชื่อซ้ำ/migration ค้าง

npm audit พบ affected package entries ระดับ high 6 รายการ จึงอัปเดต Nest เป็น 12.0.2 และ scoped overrides ของ Prisma tooling ตามรายละเอียดใน docs/reviews/2026-09-15-auth-collections.md หลังแก้ npm audit เป็น 0, npm ls ไม่พบ invalid dependency, check/test/smoke/migration ผ่าน Tests เพิ่มเป็น 32 รายการ รวม regression ที่ไม่ให้ log ค่า env ที่ผิดรูปแบบ ไม่ใช้ audit 0 แทนข้ออ้างว่าระบบปลอดภัยทุกกรณี

Commit eef2562 บันทึก Auth/Collections และผลตรวจแล้ว ก่อน commit สแกน staged files 43 ไฟล์ด้วยชื่อไฟล์ต้องห้าม, ค่าตั้ง Auth0 จริงที่ทราบจาก local env และรูปแบบ JWT/private key ไม่พบรายการตรงเงื่อนไข สแกนนี้มีขอบเขตตามกฎดังกล่าว ไม่ใช่การรับประกันว่าจะตรวจพบความลับทุกชนิด

หลัง commit เริ่มขั้นที่ 4 ด้วย docs/bookmark-exercise.md ให้ผู้พัฒนาเขียน bookmarkTitle ด้วยตนเองจากตัวอย่าง Collections มีตารางผลคาดหวังและคำสั่ง typecheck แต่ยังไม่มีโค้ดหรือ tests ของ Bookmark และไม่กล่าวอ้างว่าผู้พัฒนาทำสำเร็จแล้ว

## bookmarkTitle - 2026-09-17

ผู้พัฒนาเขียนฟังก์ชันตรวจ string และคืนค่าเดิมไว้แล้ว พร้อม throw Error สำหรับชนิดอื่น จากนั้นขอให้ช่วยทำและอธิบาย จึงเติม trim, ตรวจความยาว 1–200 Unicode code points และใช้ BadRequestException แทน Error ทั่วไป โค้ดเดิมยังไม่ปฏิเสธชื่อว่าง/ยาวเกิน ไม่มีการกล่าวอ้างว่าเป็น test failure เพราะพบจากการอ่านโค้ด

เพิ่ม behavioral tests 4 รายการใน backend/test/bookmark-input.test.mjs ครอบคลุม trimming/preservation, non-string, whitespace-only และขอบเขต 1/200/201 รวม emoji หลังแก้ npm.cmd run check ผ่าน และ npm.cmd test ผ่านรวม 36 รายการ Vite ยังมี bundle warning เดิม ไม่มี scaffold change จึงไม่รัน smoke ซ้ำ ยังไม่มี Bookmark model/routes หรือการบันทึกข้อมูล และยังไม่ได้ commit งานรอบนี้

## bookmarkUrl - 2026-09-17

ผู้พัฒนาขอดำเนินการต่อจากบท title จึงทำ helper bookmarkUrl ตาม API contract: trim, จำกัด 2,048 code points, parse ด้วย URL แบบไม่มี base, รับ HTTP(S) ที่มี hostname และไม่มี username/password คืนข้อความหลัง trim โดยไม่เรียกปลายทาง เพิ่ม tests 5 รายการ รวม literal URL preservation, malformed/relative/non-string, schemes/credentials, Unicode boundary และ generic parser error

npm.cmd run check ผ่าน (ยังมี Vite bundle warning เดิม) npm.cmd test รอบแรกพบ SyntaxError ในไฟล์ test เพราะ AI ลืมปิด test callback เพิ่มวงเล็บปิดแล้วรัน `node --test test/*.test.mjs` จาก backend กับ build ที่เพิ่งผ่าน ได้ 41 tests ผ่านทั้งหมด ไม่รัน build ซ้ำเพราะแก้เฉพาะไฟล์ test .mjs ยังไม่มี Bookmark routes/schema หรือการตรวจ ownership ของ Bookmark และไม่ได้ commit รอบนี้

## Bookmark portfolio slice - 2026-09-18

Implemented the planned Bookmark slice after explicit developer authorization. Added Prisma Bookmark relations/migration, owner-scoped API contract and validation, composite ownership safeguards, collection-delete preservation, React/MUI workspace flows, and isolated Playwright coverage. Verification: `npm.cmd run check`, `npm.cmd test` (52 passing), `npm.cmd run smoke`, and `npm.cmd run test:e2e` (8 passing across desktop/mobile).
