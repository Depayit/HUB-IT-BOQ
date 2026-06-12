# HUB IT BOQ Cost Intelligence System (Prototype/MVP)

ระบบจัดการ BOQ Cost Intelligence สำหรับงาน Data Center (ERP-ready BOQ module) พัฒนาด้วย Next.js, TypeScript, และ Prisma.

---

## Governance (Phase A — frozen)

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE_RULES.md](./ARCHITECTURE_RULES.md) | Module boundaries, naming, no unauthorized schema/workflow |
| [WORKFLOW_AUTHORITY.md](./WORKFLOW_AUTHORITY.md) | Engineer / Manager / Director approval transitions |
| [CURSOR_RUNBOOK.md](./CURSOR_RUNBOOK.md) | Execution order, verification, stop conditions |
| [CHECKPOINT_RECOVERY.md](./CHECKPOINT_RECOVERY.md) | Checkpoint naming, rollback, recovery |
| [src/lib/validations/README.md](./src/lib/validations/README.md) | Business validation single source of truth |

---

## 1. วิธีการติดตั้งและรันโปรเจกต์ (Run Instructions)

### การติดตั้ง Dependencies
```bash
npm install
```

### การตั้งค่า Environment
สร้างไฟล์ `.env` ที่ root directory (มีเทมเพลตตัวอย่างด้านล่าง) โดยในช่วงนี้ยังไม่ต้องเชื่อมต่อฐานข้อมูลจริงสำหรับการตรวจสอบ architecture:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/hub_it_boq?schema=public"
DIRECT_URL="postgresql://username:password@localhost:5432/hub_it_boq?schema=public"
```

### การ Generate Prisma Client (สำหรับ Type Checking)
```bash
npm run db:generate
```

### การรัน Development Server
```bash
npm run dev
```
โปรแกรมจะทำงานที่ [http://localhost:3000](http://localhost:3000)

---

## 2. สถานะการดึง/รัน Prompt ตามแผนงาน (Prompt & Module Status)

นี่คือรายการการตรวจสอบตามข้อกำหนดจากไฟล์ `HUB_IT_BOQ_V1.6_V1.7_extract.txt`:

| ลำดับ / Module | Prompt / ข้อกำหนด | สถานะการทำงาน | รายละเอียดเพิ่มเติม |
| :--- | :--- | :--- | :--- |
| **0** | **Master Bootstrap Prompt** | **เสร็จสิ้น (Done)** | โครงสร้างสอดคล้องกับ spec |
| **1** | **Recommended Stack Prompt** | **เสร็จสิ้น (Done)** | ใช้ Next.js 15, TypeScript, TailwindCSS v4, Prisma |
| **2** | **Foundation Prompt** | **เสร็จสิ้น (Done)** | จัดโฟลเดอร์ src/ (app, components, lib) และ prisma/ |
| **3** | **Database Schema Prompt** | **เสร็จสิ้น (Done)** | มีครบทั้ง 17 ตารางตาม spec ใน `schema.prisma` |
| **4** | **Project Setup + Dashboard** | **เสร็จสิ้น (Done)** | หน้าสร้างโครงการ คำนวณ Rack Density อัตโนมัติ แสดงผลแดชบอร์ด |
| **5** | **Design Basis** | **เสร็จสิ้น (Done)** | ระบบเวอร์ชันและฟอร์ม Design Basis และบล็อก BOQ หากยังไม่อนุมัติ |
| **6** | **Document Panel** | **เสร็จสิ้น (Done)** | `/boq/[id]/documents` — documents + boq_version_documents, governance TOR/SLD/Spec |
| **7** | **Discipline Selection** | **เสร็จสิ้น (Done)** | `/boq/[id]/disciplines` — included_flag, exclusion_note, risk_level + validation |
| **8** | **BOQ Line Builder** | **เสร็จสิ้น (Done)** | CRUD ครบใน `boq-line.service` — unit/qty/critical line validation |
| **9** | **Cost Layer Input** | **เสร็จสิ้น (Done)** | มีกลไกการคำนวณ Layer (base * rate * factor) และการทำ override + reason |
| **10** | **BOQ Summary** | **เสร็จสิ้น (Done)** | การคำนวณ Rollup ต้นทุนทุกประเภท มาร์จิ้น และราคาขายปลายทาง |
| **11** | **Validation Panel** | **เสร็จสิ้น (Done)** | การดึงกฎ ตรวจจับ BLOCK / WARNING และหน้าจอ resolve/override |
| **12** | **Approval Workflow** | **เสร็จสิ้น (Done)** | สถานะ Engineer Review -> Manager -> Director -> Final Lock และการตรวจเกต BLOCK |
| **13** | **Handoff + Version + Lock** | **เสร็จสิ้น (Done)** | การ Handoff โครงการที่อนุมัติแล้ว และระบบโคลนเวอร์ชันใหม่เมื่อกดแก้ไข BOQ ที่ Lock |
| **14** | **Vendor Quote & Training** | **เสร็จสิ้น (Done)** | `/boq/[id]/vendor-quotes` และ `/projects/[id]/training` |

---

## 3. Phase A governance (Part B — frozen)

| Item | Location |
|------|----------|
| B1 Validation ownership | `src/lib/validations/` (+ `index.ts` barrel) |
| B2 Workflow authority | `WORKFLOW_AUTHORITY.md` + `workflow-authority.ts` |
| B3 Architecture rules | `ARCHITECTURE_RULES.md` |
| B4 Cursor runbook | `CURSOR_RUNBOOK.md` |
| B5 Checkpoint / recovery | `CHECKPOINT_RECOVERY.md` |

Backend enforces approval role via `advanceApprovalSchema` → `approvalService.advanceStage(..., actorRole)`.

---

## 4. QA Round #1 — Build verification

- `npx tsc --noEmit` — ผ่าน
- `npm run build` — ผ่าน
- ไม่มีการเชื่อม production database ในรอบนี้ (ใช้ Prisma schema + server actions ตามเดิม)

### Validation rules (รันจาก Validation Panel → Run)

| Rule | Gate |
|------|------|
| `DOC_TOR_REQUIRED` | BOQ approval |
| `DOC_SLD_REQUIRED` | BOQ approval (โปรเจกต์ Power/Cooling) |
| `DOC_SPEC_HANDOFF` | Procurement handoff เท่านั้น |
| `DISCIPLINE_NO_LINES` | BOQ approval |
| `CRITICAL_LINE_ZERO_COST` | BOQ approval + handoff |

---

## 5. Sprint 8 Wave 2 simulation

Local PostgreSQL required (`DATABASE_URL` in `.env`). Run:

```bash
node scripts/run-s8-wave2-official.mjs
node scripts/verify-s8-wave2-artifacts.mjs
```

Evidence: `docs/SPRINT_8/WAVE2/`
