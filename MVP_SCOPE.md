# Absenin.com — MVP Scope

## MVP Goal
Deliver versi pertama Absenin.com yang sudah usable untuk operasional absensi inti perusahaan, tanpa langsung membangun semua fitur enterprise.

MVP harus memprioritaskan:
- value paling besar
- alur paling sering dipakai
- fondasi teknis yang rapi

---

## MVP Users

### 1. Company Admin
Bisa:
- register company
- login
- setup data perusahaan
- tambah karyawan
- kelola divisi dan jabatan
- lihat dashboard absensi
- lihat report absensi dasar

### 2. Employee
Bisa:
- melakukan check-in
- melakukan check-out
- upload selfie
- kirim lokasi GPS
- melihat status absensi hari ini (optional MVP+, kalau sempat)

---

## Features Included in MVP

### A. Authentication
- Register company + admin account
- Login
- JWT/session auth
- Current user profile endpoint
- Protected dashboard access

### B. Company Setup
- Company profile basic
- Company settings basic:
  - office name
  - office coordinates
  - office radius
  - work start time
  - work end time
  - late tolerance

### C. Employee Management
- Create employee
- List employees
- Update employee
- Deactivate employee

Recommended fields:
- employee_code
- full_name
- email
- phone
- division_id
- position_id
- employment_status
- join_date

### D. Divisions & Positions
- CRUD divisions
- CRUD positions
- position can store default base salary (optional for future payroll)

### E. Attendance Core
- Check-in
- Check-out
- Attendance status generation
- Mark late if beyond tolerance
- Save source metadata

Required attendance fields:
- employee_id
- company_id
- attendance_date
- check_in_time
- check_out_time
- status
- source
- notes

### F. GPS / Geofence Validation
- Save latitude/longitude on attendance
- Calculate distance to office
- Validate within allowed radius
- Store validation result

### G. Selfie Upload
- Upload selfie file during check-in/check-out
- Store image path/url
- Link selfie to attendance record

### H. Dashboard Overview
- Total employees
- Attendance today
- Present count
- Late count
- Not yet checked in

### I. Basic Reports
- Daily attendance list
- Filter by date
- Filter by employee
- Export CSV (nice-to-have but still reasonable for MVP)

---

## Features Excluded from MVP
These should wait until phase 2 or 3:
- WhatsApp attendance
- leave management
- overtime
- shift assignment engine
- QR attendance
- payroll
- broadcast
- manager notifications
- payment confirmation system
- subscription automation
- superadmin
- blog/CMS

---

## MVP Non-Functional Requirements
- Clean modular codebase
- Tenant-safe queries
- Input validation
- Basic rate limiting
- Basic security headers
- Error handling consistency
- Environment variable based configuration
- Easy local setup

---

## Suggested MVP Screens

### Public
- Landing page
- Login page
- Register page

### Dashboard
- Dashboard home
- Employees page
- Divisions page
- Positions page
- Attendance page
- Settings page
- Reports page

### Optional Employee-facing
- Simple attendance form page

---

## MVP API Modules
- auth
- companies
- employees
- divisions
- positions
- attendance
- locations/settings
- uploads/selfies
- analytics
- reports

---

## MVP Completion Checklist
- [x] Company can register
- [x] Admin can login/logout
- [x] Admin can manage employees
- [x] Admin can manage divisions and positions
- [x] Company can configure office geofence
- [x] Employee attendance can be recorded
- [x] Selfie can be uploaded and attached to attendance
- [x] GPS distance validation works
- [x] Dashboard stats work
- [x] Daily report works
- [x] Basic deployment config exists

> Synced with latest `TASK_LOG.md` and `PROJECT_STATUS.md` on 2026-03-22 08:58 GMT+7.

---

## Definition of Done
MVP selesai kalau:
1. satu company bisa onboarding sendiri
2. admin bisa setup employee master data
3. check-in/check-out bisa jalan dengan selfie + GPS
4. dashboard dan report dasar bisa dipakai harian
5. codebase siap lanjut ke phase 2 tanpa refactor besar-besaran
