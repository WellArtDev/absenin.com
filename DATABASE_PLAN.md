# Absenin.com — Database Plan

## Goal
Merancang schema database MVP yang cukup kuat untuk absensi inti, employee management, dan multi-tenant foundation, tanpa langsung memasukkan semua fitur phase lanjut.

Database utama: **PostgreSQL**

---

## Database Design Principles
- every tenant-bound table includes `company_id`
- use UUIDs or consistent primary key strategy
- explicit foreign keys
- created/updated timestamps everywhere important
- soft delete only where needed
- attendance records should be auditable
- avoid premature tables for unused phase-3 features

---

## MVP Tables

### 1. companies
Purpose:
- menyimpan data perusahaan/tenant

Suggested fields:
- id
- name
- slug
- email
- phone
- address
- logo_url
- plan_code
- status
- created_at
- updated_at

Notes:
- `slug` unique
- `plan_code` untuk basic gating awal jika belum ada plans table penuh

---

### 2. users
Purpose:
- akun login admin/superadmin

Suggested fields:
- id
- company_id (nullable only for superadmin if needed)
- full_name
- email
- password_hash
- role
- is_active
- last_login_at
- created_at
- updated_at

Notes:
- unique email
- role: `superadmin`, `company_admin`

---

### 3. company_settings
Purpose:
- konfigurasi operasional dasar perusahaan

Suggested fields:
- id
- company_id
- office_name
- timezone
- work_start_time
- work_end_time
- late_tolerance_minutes
- attendance_radius_meters
- default_latitude
- default_longitude
- allow_outside_radius
- created_at
- updated_at

---

### 4. divisions
Purpose:
- master divisi per perusahaan

Suggested fields:
- id
- company_id
- name
- code
- description
- created_at
- updated_at

Constraints:
- unique `(company_id, name)` if desired

---

### 5. positions
Purpose:
- master jabatan per perusahaan

Suggested fields:
- id
- company_id
- division_id (nullable)
- name
- code
- base_salary (nullable for MVP)
- description
- created_at
- updated_at

---

### 6. employees
Purpose:
- data karyawan

Suggested fields:
- id
- company_id
- employee_code
- full_name
- email
- phone
- division_id
- position_id
- employment_status
- join_date
- is_active
- photo_url
- address
- emergency_contact_name
- emergency_contact_phone
- created_at
- updated_at

Notes:
- unique `(company_id, employee_code)`
- email can be nullable if some employees have no email

---

### 7. office_locations
Purpose:
- lokasi kantor/geofence

Suggested fields:
- id
- company_id
- name
- address
- latitude
- longitude
- radius_meters
- is_main
- is_active
- created_at
- updated_at

Notes:
- MVP bisa pakai satu lokasi utama dulu, tapi table ini lebih future-proof

---

### 8. attendance_records
Purpose:
- catatan absensi harian

Suggested fields:
- id
- company_id
- employee_id
- office_location_id (nullable)
- attendance_date
- check_in_time
- check_out_time
- status
- attendance_source
- notes
- was_late
- late_minutes
- check_in_latitude
- check_in_longitude
- check_in_distance_meters
- check_in_within_radius
- check_out_latitude
- check_out_longitude
- check_out_distance_meters
- check_out_within_radius
- check_in_ip_address
- check_out_ip_address
- created_at
- updated_at

Notes:
- unique `(company_id, employee_id, attendance_date)` for one record per day in MVP
- status examples: `present`, `late`, `absent`, `on_leave`, `sick`
- source examples: `web`, `whatsapp`, `qr`

---

### 9. attendance_selfies
Purpose:
- menyimpan file selfie yang terkait absensi

Suggested fields:
- id
- company_id
- attendance_record_id
- selfie_type (`check_in`, `check_out`)
- file_path
- file_url
- mime_type
- file_size
- uploaded_at

Notes:
- bisa dipisah dari attendance_records agar upload metadata tetap bersih

---

### 10. audit_logs (optional MVP+)
Purpose:
- log tindakan admin penting

Suggested fields:
- id
- company_id
- user_id
- action
- entity_type
- entity_id
- metadata_json
- created_at

Jika mau hemat scope, ini bisa ditunda sedikit.

---

## Phase 2/3 Tables (Not Required for MVP)
Nanti bisa ditambah:
- leaves
- leave_balances
- overtime_requests
- shifts
- shift_assignments
- qr_codes
- qr_scan_logs
- payroll_periods
- payroll_records
- notifications_log
- broadcasts
- payments
- plans
- bank_accounts
- blog_posts

---

## Example Relationships
- company has many users
- company has many employees
- company has many divisions
- company has many positions
- company has many office_locations
- employee belongs to division and position
- employee has many attendance_records
- attendance_record has many attendance_selfies (or max 2 logical entries)

---

## Suggested Enum Concepts
Depending on ORM/style, use enums or validated text columns.

### user.role
- superadmin
- company_admin

### employees.employment_status
- permanent
- contract
- internship
- freelance

### attendance_records.status
- present
- late
- absent
- sick
- leave

### attendance_records.attendance_source
- web
- whatsapp
- qr
- manual

### attendance_selfies.selfie_type
- check_in
- check_out

---

## Index Recommendations
Important indexes:
- users(email)
- companies(slug)
- employees(company_id, employee_code)
- employees(company_id, full_name)
- attendance_records(company_id, attendance_date)
- attendance_records(company_id, employee_id, attendance_date)
- office_locations(company_id, is_active)

---

## Data Integrity Rules
- employee must belong to same company as attendance record
- division/position must belong to same company
- office location must belong to same company
- user cannot create employee under another company
- superadmin-only global actions should bypass tenant scope explicitly, not implicitly

---

## Migration Strategy
Suggested order:
1. companies
2. users
3. company_settings
4. divisions
5. positions
6. employees
7. office_locations
8. attendance_records
9. attendance_selfies
10. audit_logs (optional)

---

## Seed Strategy
Seed minimally:
- one superadmin user
- one sample plan code setup if needed
- one demo company
- one company admin
- sample divisions/positions
- sample office location

---

## Open Questions for Implementation
Sebelum coding final, putuskan:
1. pakai UUID atau bigserial?
2. employee punya akun login sendiri di MVP atau belum?
3. satu attendance record per hari atau per shift?
4. company_settings cukup satu lokasi default atau langsung multi-location?
5. selfie disimpan lokal dulu atau object storage abstraction langsung?

Recommended MVP answers:
- UUID if comfortable, otherwise consistent numeric IDs
- employee login belum wajib di MVP
- satu record per hari dulu
- support office_locations table dari awal, tapi UI bisa fokus satu lokasi utama
- local storage abstraction dulu, S3-ready nanti
