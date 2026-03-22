# Absenin.com — Architecture

## Architecture Goal
Membangun Absenin.com sebagai aplikasi SaaS multi-tenant yang modular, aman, dan gampang dikembangkan bertahap dari MVP ke fitur enterprise.

Prinsip utama:
- tenant-safe by design
- modular by business domain
- frontend dan backend jelas batasnya
- integration-friendly
- maintainable for long-term growth

---

## Recommended Architecture Style

### Overall Style
Gunakan **modular monorepo** dengan pemisahan:
- `apps/web` untuk frontend dashboard/public app
- `apps/api` untuk backend API
- `packages/*` untuk shared logic/config/schema bila perlu

### Why this style
- cocok untuk team kecil sampai growing team
- lebih rapi daripada backend/frontend folder yang liar
- mudah scale ke shared package, worker, atau mobile app nanti
- gampang dipakai Claude Code untuk generate bertahap

---

## System Components

### 1. Web App (`apps/web`)
Tanggung jawab:
- public marketing pages
- auth pages
- dashboard admin perusahaan
- superadmin dashboard (bisa satu app dengan route terpisah)
- form attendance web
- report UI

Recommended stack:
- Next.js 14+
- React
- Tailwind CSS
- component primitives yang konsisten

### 2. API App (`apps/api`)
Tanggung jawab:
- auth
- tenant resolution
- business rules
- attendance processing
- reporting
- file upload endpoint
- billing hooks
- integration adapters

Recommended stack:
- Node.js
- TypeScript (recommended strongly)
- modular HTTP framework (Express/Nest/Fastify — pilih satu, jangan campur)
- PostgreSQL access via ORM/query layer yang konsisten

### 3. Database (`packages/database` or app-level db module)
Tanggung jawab:
- schema
- migrations
- seeders
- constraints
- indexes
- views/materialized helpers jika nanti dibutuhkan

### 4. File Storage
Tanggung jawab:
- selfie uploads
- payment proofs
- blog images
- employee attachments (future)

Abstraction:
- local storage for development
- S3-compatible storage ready for production

### 5. Integrations Layer
Adapter-based integration untuk:
- WhatsApp provider
- geocoding/maps
- notification provider
- QR generator

WhatsApp integration must support multiple gateway providers:
- Official Meta WhatsApp API
- Wablas
- Fonnte

Recommended design:
- define a common WhatsApp gateway interface
- implement one adapter per provider
- choose active provider from tenant/company configuration
- keep webhook parsing and message sending behind provider adapters

Jangan hardcode provider directly ke business logic.

---

## Recommended Backend Internal Structure

```text
apps/api/src/
├── app/
│   ├── server.ts
│   ├── routes.ts
│   ├── config/
│   ├── middleware/
│   └── errors/
├── modules/
│   ├── auth/
│   ├── companies/
│   ├── employees/
│   ├── divisions/
│   ├── positions/
│   ├── attendance/
│   ├── locations/
│   ├── selfies/
│   ├── analytics/
│   ├── reports/
│   ├── leaves/
│   ├── overtime/
│   ├── shifts/
│   ├── payroll/
│   ├── billing/
│   ├── notifications/
│   ├── qr-attendance/
│   └── superadmin/
├── shared/
│   ├── auth/
│   ├── db/
│   ├── utils/
│   ├── constants/
│   └── types/
└── workers/
```

### Suggested per-module structure

```text
modules/attendance/
├── attendance.controller.ts
├── attendance.service.ts
├── attendance.repository.ts
├── attendance.routes.ts
├── attendance.validator.ts
├── attendance.types.ts
└── attendance.mapper.ts
```

This keeps each domain self-contained.

---

## Request Flow Example

### Attendance Check-in Flow
1. Request authenticated
2. Tenant/company context resolved
3. Employee ownership validated under company
4. Input validated
5. Geofence validated
6. Selfie stored / linked
7. Attendance rules applied
8. Attendance record inserted
9. Response returned
10. Optional event emitted for notifications/logging

---

## Multi-Tenant Rules
Every tenant-bound entity must include `company_id`.

Examples:
- employees
- divisions
- positions
- attendance
- office_locations
- shifts
- leaves
- overtime
- payroll_periods
- notifications

### Mandatory protections
- every query scoped by `company_id`
- never trust `company_id` from client blindly
- derive tenant access from authenticated user/session
- superadmin access must be explicitly separated

---

## Authentication & Authorization

### Roles for MVP
- `superadmin`
- `company_admin`

### Future roles
- `manager`
- `employee`

### Auth Strategy
Recommended:
- access token / secure session strategy
- password hashing
- middleware for auth guard
- policy-based access checks per route/module

---

## Frontend Architecture

### App Areas
1. Public pages
2. Auth pages
3. Company dashboard
4. Admin platform dashboard

### Frontend internal proposal

```text
apps/web/
├── app/
│   ├── (public)/
│   ├── (auth)/
│   ├── dashboard/
│   └── admin/
├── components/
├── features/
├── lib/
├── hooks/
├── styles/
└── types/
```

### Why use `features/`
Agar UI logic tidak numpuk di `components/` semua.
Contoh:
- `features/employees`
- `features/attendance`
- `features/reports`

---

## API Design Rules
- RESTful enough, not overcomplicated
- versionable (`/api/v1`) if desired from start
- standard response envelope if team prefers consistency
- request validation near boundary
- business logic only in service/use-case layer
- DB calls only in repository/data layer

---

## File Upload Design

### Upload Use Cases
- attendance selfie
- payment proof
- blog thumbnail/content image

### Rules
- validate mime type
- validate size
- use generated filename
- never trust original filename for storage path
- store metadata in database

---

## Reporting Strategy
Untuk MVP:
- direct query + filtered endpoints cukup

Untuk growth:
- add optimized SQL views
- summary tables if needed
- async export jobs for heavy reports

---

## Notifications/Events Strategy
Untuk MVP tidak perlu event bus besar.
Cukup:
- service method hooks
- log table if required

Untuk phase lanjut:
- domain events
- queue/job worker
- notification dispatcher

---

## Deployment Architecture
Minimal awal:
- web app
- api app
- postgres
- nginx/reverse proxy

Optional later:
- background worker
- object storage
- Redis cache/queue

---

## Recommended Tech Choice Notes
Jika build ulang dari nol, pilihan yang rapi:
- Next.js + TypeScript
- Fastify or Express + TypeScript
- PostgreSQL
- Prisma or Drizzle or SQL-first approach

Yang penting bukan framework paling keren, tapi:
- konsisten
- gampang dirawat
- gampang digenerate dan diperbaiki AI coding tool

---

## Architecture Decisions to Keep
- Single source of truth untuk auth & tenant scope
- Module boundaries jelas
- Naming konsisten English-only di codebase
- Avoid duplicate routes/pages
- Keep integrations behind adapters
- Keep uploads abstracted
- Keep MVP lean
