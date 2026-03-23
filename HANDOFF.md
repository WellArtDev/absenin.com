# Engineering Handoff Report - Absenin.com

**Date**: 2026-03-23
**Status**: Production & Staging Active
**Repository**: WellArtDev/absenin.com

---

## 1. Status Proyek Saat Ini

**Absenin** adalah Sistem Absensi Online berbasis lokasi (geofence) dengan integrasi WhatsApp. Saat ini:
- ✅ **Production live** di `https://absenin.com`
- ✅ **Staging live** di `https://staging.absenin.com`
- ✅ CI/CD GitHub Actions aktif (auto-deploy ke staging)
- ✅ Multi-tenant architecture (PostgreSQL + Prisma)
- ✅ Backend: Express.js (Node.js), Frontend: Next.js
- ✅ PM2 process management di server

**Environment terakhir di-deploy**:
- Staging terbaru dengan fitur Dashboard baru (employee management, locations dengan geocoding, tenant settings)

---

## 2. Yang Sudah Selesai

### Core Features
- ✅ Authentication system (JWT + refresh tokens, CSRF protection)
- ✅ Multi-tenant isolation (tenant_id di semua query)
- ✅ Role-based access control (RBAC)
- ✅ WhatsApp integration (Meta/Fonnte/Wablas providers)
- ✅ Geofence-based attendance (Haversine formula untuk hitung jarak)
- ✅ Selfie verification saat absensi
- ✅ Overtime records (lembur) dengan command WhatsApp

### Dashboard Baru (Baru Saja Selesai)
- ✅ **Employee Management** (`/dashboard/employees`)
  - CRUD karyawan lengkap
  - Pagination, search (nama/NIP/email)
  - Filter by division, position, status
  - Cascading dropdown (division → position)

- ✅ **Location Management** (`/dashboard/locations`)
  - **OpenStreetMap Nominatim geocoding** (gratis, tanpa API key)
  - Auto-search koordinat dari nama lokasi
  - "Gunakan Lokasi Saya" button (GPS browser)
  - CRUD lokasi kantor dengan radius geofence

- ✅ **Tenant/Company Settings** (`/dashboard/tenant-settings`)
  - Company info (nama, alamat, telepon, email)
  - Working days selector (Mon-Sun toggle)
  - Work hours configuration
  - Data tersimpan di `CompanySettings.whatsapp_config` (JSON field)

### Infrastructure & DevOps
- ✅ GitHub Actions CI/CD workflow (`.github/workflows/deploy.yml`)
- ✅ Automated linting, building, dan migration
- ✅ PM2 ecosystem dengan auto-restart
- ✅ Nginx reverse proxy configuration
- ✅ PostgreSQL dengan Prisma migrations

### API Endpoints
- ✅ `/api/auth/*` - Login, CSRF token, refresh
- ✅ `/api/employees` - CRUD karyawan dengan tenant isolation
- ✅ `/api/locations` - CRUD lokasi + geocoding validation
- ✅ `/api/divisions` - List divisions
- ✅ `/api/positions` - List positions (filterable by division)
- ✅ `/api/settings/company` - Company settings (GET/POST/PATCH)
- ✅ `/api/webhook/whatsapp/*` - WhatsApp webhooks
- ✅ `/api/health` - Health check endpoint

---

## 3. Fondasi yang Harus Dijaga

⚠️ **PRINSIP ARSITEKTUR - JANGAN DIRUSAK**

### Multi-Tenancy
- **SEMUA** query **WAJIB** filter by `tenant_id`
- Middleware `tenantMiddleware` otomatis inject `req.tenant` dari header `X-Tenant-ID`
- **Jangan pernah** query data tanpa tenant filter (risk: data leak)

### Security
- **CSRF Protection** aktif untuk POST/PATCH/DELETE
- Frontend **WAJIB** fetch CSRF token dulu dari `/api/auth/csrf-token`
- Kirim token di header `x-csrf-token` untuk state-changing requests
- Password hashing pakai bcrypt (salt rounds: 10)

### Error Handling
- Pakai `AppError` class untuk consistent error responses
- Format response: `{ success: boolean, data?: any, error?: { type, message } }`
- Logger pakai `Logger` class (bukan `console.log`)

### Database Migrations
- **Jangan pernah** manual edit schema di production
- Selalu buat migration: `npx prisma migrate dev --name <description>`
- Deploy pakai `npx prisma migrate deploy`

### Code Quality
- Linting wajib pass: `pnpm lint` (ESLint + Next.js lint)
- Type checking: TypeScript strict mode
- Format: Prettier (auto-run on save)

---

## 4. Risiko Kecil / Batasan Saat Ini

### Known Issues (Low Priority)
1. **GitHub Actions EACCES Error** (Baru diperbaiki)
   - **Solusi**: Delete `node_modules` sebelum install di deploy script
   - **Status**: Fix sudah di-push, tinggal verifikasi next run

2. **Demo Data Seeding**
   - Ada script `seed_demo_data.sh` tapi belum otomatis di CI/CD
   - Kalau database kosong, jalankan manual di server

3. **Missing Divisions/Positions Management UI**
   - API sudah ada (`/api/divisions`, `/api/positions`)
   - Tapi belum ada dashboard UI untuk CRUD divisions & positions
   - **Workaround**: Insert manual via database atau Prisma Studio

4. **Employee Page React Hooks Warnings**
   - useEffect missing dependencies warnings
   - **Impact**: Tidak mempengaruhi fungsi, hanya ESLint warning
   - **Fix**: Tambah dependency array atau useCallback (low priority)

5. **WhatsApp Config in Company Settings**
   - Company info disimpan di `whatsapp_config` JSON field
   - **Ini temporary hack** karena schema `CompanySettings` tidak punya field company_name dll
   - **Future**: Buat migration untuk tambah field dedicated

---

## 5. Next TODO (Urut Prioritas)

### Priority 1 - Immediate (Production Ready)
1. **Verifikasi GitHub Actions Fix**
   - Cek apakah deploy workflow sekarang sukses
   - Pastikan staging deploy otomatis jalan setiap push ke main

2. **Production Deploy Dashboard Baru**
   - Merge latest changes ke production
   - Pastikan semua fitur baru jalan di production (`absenin.com`)

3. **User Testing & Feedback**
   - Test fitur geocoding (OSM Nominatim)
   - Test employee CRUD
   - Test tenant settings save/load

### Priority 2 - Short Term (Next Sprint)
4. **Divisions & Positions Management UI**
   - Buat `/dashboard/divisions` page
   - Buat `/dashboard/positions` page
   - Integrasi dengan employee management (dropdowns)

5. **Fix React Hooks Warnings**
   - Resolve ESLint warnings di employee page
   - Add `useCallback` untuk `fetchEmployees`, `fetchDivisionsAndPositions`

6. **Add Employee Import/Export**
   - CSV import untuk bulk add employees
   - Export employee data ke CSV/Excel

### Priority 3 - Medium Term (Future Enhancements)
7. **Improve Company Settings Schema**
   - Buat migration: tambah field `company_name`, `company_address`, dll ke `CompanySettings` table
   - Move data dari `whatsapp_config` JSON ke dedicated columns
   - Update API & frontend accordingly

8. **Add Attendance Report**
   - `/api/reports/attendance` endpoint sudah ada
   - Buat UI `/dashboard/reports` untuk view attendance history
   - Filter by date range, employee, division

9. **WhatsApp Command Improvements**
   - Command `/lembur` sudah ada, tambahkan command lain
   - `/status` - cek status absensi hari ini
   - `/riwayat` - lihat riwayat absensi

---

## 6. Verifikasi / Quality Gate

### Commands yang Sudah Lolos
```bash
# Linting (PASS)
pnpm lint

# Build (PASS)
pnpm build

# Database Generate (PASS)
pnpm --filter @absenin/api db:generate

# Database Migrate (PASS)
cd apps/api && npx prisma migrate deploy
```

### Staging Verification
```bash
# Staging URL
https://staging.absenin.com

# Test Credentials
Email: admin@demonusantara.co.id
Password: Demo123!Absenin

# Health Check
curl https://staging.absenin.com/health

# API Test (Authenticated)
# 1. Login untuk dapat token
curl -X POST https://staging.absenin.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demonusantara.co.id","password":"Demo123!Absenin"}'

# 2. Test employee list (gunakan token dari step 1)
curl https://staging.absenin.com/api/employees \
  -H "Authorization: Bearer <TOKEN>" \
  -H "X-Tenant-ID: <TENANT_ID>"

# 3. Test location list
curl https://staging.absenin.com/api/locations \
  -H "Authorization: Bearer <TOKEN>" \
  -H "X-Tenant-ID: <TENANT_ID>"
```

### Production URLs
- **App**: https://absenin.com
- **Login**: https://absenin.com/login
- **Dashboard**: https://absenin.com/dashboard

### PM2 Status (Server)
```bash
# Cek process status
pm2 status

# Cek logs
pm2 logs absenin-api --lines 50
pm2 logs absenin-web --lines 50

# Restart manual (kalau perlu)
pm2 restart absenin-api
pm2 restart absenin-web
```

---

## 7. Kontak & Resources

### Important Files
- **Deploy Config**: `.github/workflows/deploy.yml`
- **Database Schema**: `apps/api/prisma/schema.prisma`
- **Environment Variables**: `apps/api/.env` (jangan commit!)
- **PM2 Ecosystem**: `ecosystem.config.js` (if exists)

### Documentation
- **Commands Documentation**: `docs/whatsapp/COMMANDS.md`
- **Project Status**: `PROJECT_STATUS.md` (if exists)

### SSH Access (Staging)
```bash
ssh -p <PORT> <USER>@staging.absenin.com
cd /var/www/absenin
```

---

## 8. Quick Start untuk Developer Baru

```bash
# 1. Clone & Install
git clone https://github.com/WellArtDev/absenin.com.git
cd absenin.com
pnpm install

# 2. Setup Environment
cp apps/api/.env.example apps/api/.env
# Edit DATABASE_URL, JWT_SECRET, dll

# 3. Database Setup
pnpm --filter @absenin/api db:generate
pnpm --filter @absenin/api db:push  # development only

# 4. Run Development
pnpm dev
# API: http://localhost:3001
# Web: http://localhost:3000

# 5. Run Linting (Sebelum Commit)
pnpm lint

# 6. Build (Test Production Build)
pnpm build
```

---

**Handoff Complete** 🚀

Next developer: Silakan lanjutkan dari **Priority 1** di atas. Kalau ada yang kurang jelas, cek git history atau tanya team lead.

**Last Updated**: 2026-03-23 by Claude (Sonnet 4.6)
