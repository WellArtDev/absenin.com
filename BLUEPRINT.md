# Absenin.com — Blueprint

## Product Vision
Absenin.com adalah platform SaaS HRM dan attendance multi-tenant untuk bisnis di Indonesia, dengan fokus pada absensi harian, validasi lokasi, selfie verification, manajemen karyawan, dan otomasi operasional HR.

Produk ini harus:
- mudah dipakai admin perusahaan
- nyaman dipakai karyawan
- modular untuk pengembangan jangka panjang
- aman untuk multi-tenant
- siap berkembang dari MVP ke enterprise features

---

## Core Product Domains

### 1. Identity & Access
- Authentication
- Authorization
- Role-based access
- Session/token management
- Company-scoped access

### 2. Company & Tenant Management
- Company registration
- Company profile
- Subscription plan binding
- Company settings
- Feature gating by plan

### 3. Workforce Management
- Employees
- Divisions
- Positions
- Employment status
- Employee profile & documents

### 4. Attendance Operations
- Check-in
- Check-out
- Attendance status calculation
- Late detection
- Attendance history
- Attendance source (web, WhatsApp, QR)

### 5. Validation Layer
- GPS/geofence validation
- Selfie verification
- IP/device metadata
- Shift validation
- QR validation

### 6. Time & Policy Management
- Shifts
- Work schedule rules
- Late tolerance
- Break rules
- Overtime rules

### 7. HR Operations
- Leaves
- Permissions
- Sick leave
- Overtime requests
- Approval workflows

### 8. Payroll
- Payroll periods
- Attendance-based calculation
- Overtime calculation
- Deduction rules
- Payslips

### 9. Communication Layer
- WhatsApp attendance commands
- Manager notifications
- Broadcast messaging
- Multi-provider WhatsApp gateway support:
  - Official Meta WhatsApp API
  - Wablas
  - Fonnte
- Configurable provider selection at tenant/company level

### 10. Billing & Plans
- Plans
- Feature matrix
- Payment submission
- Payment confirmation
- Upgrade/downgrade support

### 11. Reporting & Analytics
- Dashboard summary
- Daily attendance reports
- Monthly reports
- Employee summaries
- Export support

### 12. Platform Admin
- Superadmin dashboard
- Tenant/company management
- Plan management
- Payment approval
- Global analytics

---

## Recommended High-Level Architecture

## Frontend
- Next.js app for web portal
- Separate route groups for:
  - public marketing pages
  - auth pages
  - company dashboard
  - superadmin dashboard

## Backend
- Modular backend API
- Domain-based modules
- Clear separation between:
  - routes/controllers
  - services/use-cases
  - repositories/data access
  - validation
  - policies/permissions

## Database
- PostgreSQL
- Strong tenant scoping
- Explicit foreign keys
- Audit-friendly attendance records
- Migration-based schema evolution

## Storage
- Local/S3-compatible file storage abstraction for:
  - selfies
  - payment proof
  - blog images
  - optional employee documents

## Integrations
- WhatsApp provider abstraction
- QR service
- notification provider abstraction
- geocoding/map integration abstraction

---

## Recommended Monorepo Structure

```text
absenin.com/
├── apps/
│   ├── web/                # Next.js frontend
│   └── api/                # Backend API
├── packages/
│   ├── database/           # schema, migrations, seeders
│   ├── shared/             # shared utils/types/constants
│   ├── config/             # shared config presets
│   └── ui/                 # optional shared UI components
├── docs/
│   ├── product/
│   ├── architecture/
│   ├── api/
│   └── decisions/
├── scripts/
├── infra/
│   ├── docker/
│   ├── nginx/
│   └── pm2/
├── .env.example
├── package.json
└── README.md
```

---

## Backend Module Proposal

```text
apps/api/src/modules/
├── auth/
├── companies/
├── plans/
├── billing/
├── employees/
├── divisions/
├── positions/
├── attendance/
├── selfies/
├── locations/
├── shifts/
├── qr-attendance/
├── leaves/
├── overtime/
├── payroll/
├── notifications/
├── broadcasts/
├── reports/
├── analytics/
├── blog/
└── superadmin/
```

Each module should ideally contain:
- controller
- service/use-case
- repository
- validator
- routes
- mapper/dto

---

## Frontend Route Proposal

```text
/
/login
/register
/pricing
/blog
/blog/[slug]

/dashboard
/dashboard/employees
/dashboard/divisions
/dashboard/positions
/dashboard/attendance
/dashboard/leaves
/dashboard/overtime
/dashboard/shifts
/dashboard/locations
/dashboard/qr
/dashboard/payroll
/dashboard/slips
/dashboard/reports
/dashboard/notifications
/dashboard/broadcasts
/dashboard/settings
/dashboard/billing

/scan/[code]

/admin
/admin/companies
/admin/plans
/admin/payments
/admin/blog
/admin/analytics
```

Note:
- gunakan naming English yang konsisten
- hindari route duplikat bilingual

---

## Key Design Rules
- Every business record tied to `company_id` unless global
- Never trust frontend for tenant scoping
- Attendance calculation should be service-driven, not scattered
- Approval workflows should be explicit and auditable
- Billing/plan checks should be centralized
- Integrations should be abstracted behind service adapters
- Reports should query denormalized views or optimized queries where needed

---

## MVP Recommendation
MVP sebaiknya fokus pada nilai utama produk:
- multi-tenant auth
- employee management
- divisions and positions
- attendance check-in/check-out
- geofence validation
- selfie upload
- dashboard overview
- basic reports

Tujuan MVP:
- sudah usable untuk satu perusahaan
- flow absensi berjalan end-to-end
- pondasi database dan arsitektur cukup stabil untuk fitur tahap lanjut

---

## Post-MVP Recommendation
Setelah MVP stabil:
- leaves
- overtime
- shifts
- QR attendance
- WhatsApp integration
- notifications
- payroll
- billing
- superadmin
- blog/CMS

---

## Success Criteria
Absenin.com dianggap berhasil jika:
- perusahaan bisa daftar dan login
- admin bisa membuat data karyawan
- karyawan bisa absen dengan validasi lokasi + selfie
- admin bisa melihat status kehadiran dan report dasar
- codebase bersih, modular, dan gampang di-extend
