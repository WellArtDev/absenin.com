# Absenin.com — Project Summary

## Overview
Absenin.com adalah aplikasi **HRM + Attendance SaaS** berbasis multi-tenant untuk perusahaan, dengan fokus pada absensi, manajemen karyawan, GPS/geofence, selfie verification, WhatsApp attendance, payroll, dan dashboard admin/superadmin.

Project ini akan menjadi rebuild dari project lama `absenin-project-server`, tetapi dengan arsitektur yang lebih rapi, modular, dan scalable.

---

## Existing Project Reference
Sumber referensi lama:
- `/home/wethepeople/.openclaw/workspace/absenin-project-server`

Nama baru project:
- `Absenin.com`

Folder workspace baru:
- `/home/wethepeople/.openclaw/workspace/absenin.com`

---

## Existing App Structure (Reference)
Project lama menggunakan struktur monorepo sederhana:

```text
absenin-project-server/
├── backend/      # Node.js + Express API
├── frontend/     # Next.js 14 app
├── database/     # PostgreSQL schema + migrations
├── nginx/        # Reverse proxy config
├── deploy/       # Deployment scripts
├── docker-compose.yml
├── ecosystem.config.js
└── FEATURE.md
```

### Backend Stack
- Node.js
- Express
- PostgreSQL
- JWT Authentication
- bcrypt
- multer
- sharp
- express-rate-limit
- helmet
- express-validator

### Frontend Stack
- Next.js 14 (App Router)
- React
- Tailwind CSS
- Sass
- Leaflet / react-leaflet
- Tiptap editor

### Infrastructure
- Docker
- Nginx
- PM2

---

## Main Features Identified

### 1. Multi-tenant SaaS
- Company isolation via `company_id`
- Subscription plans
- Feature access by plan
- Company-specific settings

### 2. Authentication & Roles
- Login/register
- JWT-based auth
- Admin and superadmin roles
- Change password / profile access

### 3. Employee Management
- Employee CRUD
- Employee code generation
- Divisions and positions
- Employment status
- Personal/emergency/contact info
- CSV import/export

### 4. Attendance System
- Check-in / check-out
- Attendance statuses
- Daily attendance records
- Late tracking
- Check-in/check-out history

### 5. WhatsApp Attendance
- Attendance via WhatsApp commands
- Old project used Fonnte webhook integration
- New Absenin.com must support multiple WhatsApp gateway providers:
  - Official Meta WhatsApp API
  - Wablas
  - Fonnte
- Commands like check-in, check-out, status, izin, sakit, lembur
- Provider selection should be configurable per tenant/company
- Business logic must not be tightly coupled to a single provider

### 6. Selfie Verification
- Selfie upload
- Watermark/image processing
- Evidence for attendance validation

### 7. GPS / Geofence
- GPS coordinate tracking
- Office radius validation
- Distance calculation
- Multiple office locations
- Map-based display

### 8. Leave Management
- Cuti / izin / sakit / dinas
- Approval workflow
- Leave balance tracking

### 9. Overtime Management
- Overtime requests
- Approval workflow
- Overtime calculation and tracking

### 10. Shift Management
- Multiple shifts
- Shift assignment
- Break configuration
- Shift-specific attendance rules

### 11. QR Attendance
- QR generation
- QR scan for attendance
- Expiration and validation
- Scan logs

### 12. Notifications & Broadcast
- Manager notifications
- Notification logs
- Broadcast WhatsApp messages
- Audience targeting by division/position

### 13. Payroll
- Salary calculation
- Overtime inclusion
- Deduction logic
- Payroll periods
- Payslip generation

### 14. Reports & Analytics
- Attendance dashboard
- Daily/monthly reports
- Export CSV
- Summary per employee/company

### 15. Billing & Subscription
- Subscription plans
- Payment submission
- Bank transfer confirmation
- Proof upload

### 16. Blog / CMS
- Public blog pages
- Tiptap editor
- SEO support
- Sitemap generation

### 17. Superadmin Panel
- Global company management
- Subscription/plan management
- Payment approvals
- Global analytics

---

## Backend Modules Found in Old Project
Routes found:
- auth
- employees
- divisions
- positions
- analytics
- report
- overtime
- leaves
- locations
- notifications
- payroll
- selfie
- settings
- broadcast
- payment
- blog
- qr
- slips
- shifts
- superadmin
- webhook
- webhookFonnte

Service layer found:
- attendanceService
- broadcastService
- locationService
- notificationService
- overtimeService
- payrollService
- qrService
- shiftService
- slipService

---

## Frontend Areas Found in Old Project
Main frontend pages found:
- `/`
- `/login`
- `/register`
- `/blog`
- `/scan/[code]`
- `/dashboard/*`
- `/superadmin`

Dashboard sections found:
- employees / karyawan
- divisions / divisi
- positions / jabatan
- attendance / absensi
- overtime / lembur
- leaves / cuti
- locations
- notifications
- broadcast
- payment
- payroll
- reports / laporan
- settings / pengaturan
- qr
- shifts
- slips

Note: ada beberapa route duplikat bilingual (Indonesia + English), jadi rebuild sebaiknya pakai naming yang konsisten.

---

## Rebuild Direction for Absenin.com
Rebuild sebaiknya **tidak menyalin mentah arsitektur lama**, tetapi mengambil domain bisnisnya lalu menyusun ulang menjadi lebih bersih.

### Recommended Principles
- Clean modular architecture
- Consistent English naming for codebase
- Avoid duplicate routes/pages
- Strong separation between domain modules
- Multi-tenant safe by design
- Scalable API and database structure
- MVP-first development

### Suggested Core Modules
- auth
- companies
- users
- employees
- divisions
- positions
- attendance
- geofence-locations
- selfie-upload
- shifts
- qr-attendance
- leaves
- overtime
- payroll
- notifications
- broadcasts
- billing
- plans
- blog
- superadmin

---

## Suggested Build Phases

### Phase 1 — MVP
- Authentication
- Company multi-tenant setup
- Employee management
- Divisions and positions
- Attendance check-in/check-out
- GPS/geofence validation
- Selfie upload
- Basic dashboard

### Phase 2
- Leave management
- Overtime
- Shift management
- Reports
- QR attendance

### Phase 3
- Payroll
- WhatsApp automation
- Manager notifications
- Broadcast system
- Subscription/payment flow
- Superadmin panel
- Blog/CMS

---

## Suggested Claude Code Workflow
Saat mulai build di Claude Code, urutannya sebaiknya:

1. Analyze business requirements
2. Propose clean architecture
3. Design database schema
4. Define API contracts
5. Define frontend pages/navigation
6. Create phased implementation plan
7. Start coding MVP first

---

## Suggested Initial Prompt for Claude Code

```text
I want to rebuild an HRM + attendance SaaS web application called Absenin.com.

The old project includes these business modules:
- Multi-tenant companies
- Auth and role-based access
- Employee management
- Divisions and positions
- Attendance check-in/check-out
- GPS geofencing
- Selfie verification upload
- Leave management
- Overtime management
- Shift management
- QR attendance
- Payroll
- Manager notifications
- WhatsApp integration
- Broadcast messaging
- Subscription plans and payment confirmation
- Superadmin dashboard
- Blog CMS

Please do this in phases:
1. Analyze and propose a clean architecture
2. Design database schema
3. Propose API routes and domain modules
4. Propose frontend pages and dashboard navigation
5. Generate implementation plan for MVP first
6. Then start coding the MVP

Constraints:
- Keep the codebase clean and maintainable
- Avoid duplicated routes/pages
- Use consistent English naming
- Prepare the system for future scaling
- Prioritize modular architecture over quick hacks
```

---

## Goal
Membangun ulang Absenin.com sebagai codebase yang:
- lebih bersih
- lebih modular
- lebih gampang dikembangkan
- lebih siap scale
- tetap membawa value utama dari project lama

---

## Next Suggested Files
Setelah ini, file yang bagus untuk dibuat:
- `BLUEPRINT.md`
- `MVP_SCOPE.md`
- `ARCHITECTURE.md`
- `DATABASE_PLAN.md`
- `CLAUDE_CODE_PROMPT.md`

