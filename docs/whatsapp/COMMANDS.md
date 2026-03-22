# WhatsApp Commands Specification
**Version:** 1.0
**Last Updated:** 2026-03-22
**Language:** Indonesian (User-Facing Messages)

---

## Overview

All WhatsApp commands are case-insensitive and sent as plain text messages.

**Format:** `<COMMAND>`

**Example:** `HADIR`

---

## Command List

### 1. HADIR (Check-In)

**Purpose:** Record employee check-in time

**Usage:**
```
HADIR
```

**Validation:**
- Phone number must be registered to an employee
- Employee must be active
- No duplicate check-in on same day

**Action:**
- Create `AttendanceRecord` with `checkin_time = now()`
- Get GPS location from employee (if available)
- Link to nearest office location (if geofence enabled)

**Success Response:**
```
Berhasil hadir jam 08:05

Lokasi: Kantor Pusat
Koordinat: -6.2088, 106.8456
```

**Error Responses:**

| Error | Response |
|-------|----------|
| Already checked in | Anda sudah check-in hari ini jam 08:00 |
| Employee not found | Nomor telepon Anda tidak terdaftar. Silakan hubungi admin. |
| Employee inactive | Akun Anda dinonaktifkan. Silakan hubungi admin. |
| Outside geofence | Anda berada di luar radius kantor. Jarak: 500m |

---

### 2. PULANG (Check-Out)

**Purpose:** Record employee check-out time

**Usage:**
```
PULANG
```

**Validation:**
- Phone number must be registered to an employee
- Employee must be active
- Must have checked in today
- Cannot check-out twice

**Action:**
- Update `AttendanceRecord` with `checkout_time = now()`
- Get GPS location from employee (if available)
- Calculate work duration

**Success Response:**
```
Berhasil pulang jam 17:05

Durasi kerja: 9 jam 0 menit
Lokasi: Kantor Pusat
```

**Error Responses:**

| Error | Response |
|-------|----------|
| Not checked in | Anda belum check-in hari ini |
| Already checked out | Anda sudah check-out hari ini jam 17:00 |
| Employee not found | Nomor telepon Anda tidak terdaftar. Silakan hubungi admin. |
| Employee inactive | Akun Anda dinonaktifkan. Silakan hubungi admin. |

---

### 3. STATUS (Check Status)

**Purpose:** Check current attendance status

**Usage:**
```
STATUS
```

**Validation:**
- Phone number must be registered to an employee
- Employee must be active

**Action:**
- Query today's `AttendanceRecord`
- Return current status

**Success Responses:**

**Not Checked In:**
```
Anda belum check-in hari ini.

Jam sekarang: 08:30
```

**Checked In (Working):**
```
Anda sedang bekerja.

Check-in: 08:05
Durasi: 2 jam 25 menit
Lokasi: Kantor Pusat
```

**Checked Out:**
```
Anda sudah selesai bekerja hari ini.

Check-in: 08:05
Check-out: 17:05
Durasi: 9 jam 0 menit
```

**Error Responses:**

| Error | Response |
|-------|----------|
| Employee not found | Nomor telepon Anda tidak terdaftar. Silakan hubungi admin. |
| Employee inactive | Akun Anda dinonaktifkan. Silakan hubungi admin. |

---

### 4. LEMBUR (Start Overtime)

**Purpose:** Start overtime (lembur) period

**Usage:**
```
LEMBUR
```

**Validation:**
- Phone number must be registered to an employee
- Employee must be active
- Must have checked out today
- No active overtime period

**Action:**
- Create overtime record with `start_time = now()`
- Link to today's attendance record

**Success Response:**
```
Lembur dimulai jam 17:30

Catatan: Jangan lupa selesaikan lembur dengan command: SELESAI LEMBUR
```

**Error Responses:**

| Error | Response |
|-------|----------|
| Not checked out | Anda belum check-out hari ini. Silakan check-out terlebih dahulu. |
| Overtime already active | Anda memiliki lembur aktif. Gunakan SELESAI LEMBUR untuk mengakhiri. |
| Employee not found | Nomor telepon Anda tidak terdaftar. Silakan hubungi admin. |
| Employee inactive | Akun Anda dinonaktifkan. Silakan hubungi admin. |

---

### 5. SELESAI LEMBUR (End Overtime)

**Purpose:** End overtime (lembur) period

**Usage:**
```
SELESAI LEMBUR
```

**Validation:**
- Phone number must be registered to an employee
- Employee must be active
- Must have active overtime period

**Action:**
- Update overtime record with `end_time = now()`
- Calculate overtime duration

**Success Response:**
```
Lembur selesai jam 20:30

Durasi lembur: 3 jam 0 menit
Terima kasih atas kerja keras Anda!
```

**Error Responses:**

| Error | Response |
|-------|----------|
| No active overtime | Anda tidak memiliki lembur aktif. |
| Employee not found | Nomor telepon Anda tidak terdaftar. Silakan hubungi admin. |
| Employee inactive | Akun Anda dinonaktifkan. Silakan hubungi admin. |

---

## Help Command

### Unsupported/Unknown Command

**Response:**
```
Command tidak dikenali.

Command yang tersedia:
• HADIR - Check-in (absen masuk)
• PULANG - Check-out (absen pulang)
• STATUS - Cek status kehadiran
• LEMBUR - Mulai lembur
• SELESAI LEMBUR - Selesai lembur

Ketik command sesuai yang tertera di atas.
```

---

## Message Formatting

### Time Format

**Indonesian Format:**
- `HH:MM` (24-hour format)
- Examples: 08:05, 17:30

**Examples:**
```
Berhasil hadir jam 08:05
Berhasil pulang jam 17:05
```

### Date Format (if needed)

**Indonesian Format:**
- `DD MMMM YYYY`
- Example: 22 Maret 2026

### Duration Format

**Indonesian Format:**
- `X jam Y menit`
- Examples: 9 jam 0 menit, 2 jam 30 menit

---

## Special Cases

### Weekend/Holiday Handling

**If checking in on weekend/holiday:**
```
Hari ini adalah hari libur.

Anda yakin ingin check-in? Ketik HADIR lagi untuk konfirmasi.
```

**Second HADIR confirms:**
```
Berhasil hadir jam 08:05 (Hari Libur)
```

### Late Check-In

**If checking in late (after work start time):**
```
Berhasil hadir jam 09:30

⚠️ Anda terlambat 90 menit.
Jam kerja: 09:00
```

### Early Check-Out

**If checking out early (before work end time):**
```
Berhasil pulang jam 16:00

⚠️ Anda pulang 1 jam lebih awal.
Jam kerja: 17:00
```

---

## Admin Commands (Future)

Not implemented in first version. Planned for future:

### LAPORAN (Report)

**Usage:** `LAPORAN [bulan]`

**Example:** `LAPORAN MARET`

**Response:** Monthly attendance summary

### REKAP (Summary)

**Usage:** `REKAP`

**Response:** Today's team attendance summary

---

## Error Handling

### Generic Error

If unexpected error occurs:
```
Maaf, terjadi kesalahan sistem.

Silakan coba lagi nanti atau hubungi admin jika masalah berlanjut.
```

### Maintenance Mode

If system is under maintenance:
```
Sistem sedang dalam perbaikan.

Silakan coba lagi dalam beberapa menit.
```

---

## Implementation Notes

### Command Parsing

**Rules:**
1. Trim whitespace
2. Convert to uppercase
3. Match against command list
4. Extract parameters (if any)

**Example:**
```typescript
const rawMessage = "  hadir  "; // "  hadir  "
const command = rawMessage.trim().toUpperCase(); // "HADIR"
```

### Response Formatting

**All responses must:**
- Be in Indonesian
- Be clear and concise
- Use proper capitalization
- Include relevant details
- Provide helpful error messages

### Throttling

**Per User:**
- Max 1 command per second
- Max 10 commands per minute

**Per Tenant:**
- Max 100 commands per minute

**Exceeded Response:**
```
Anda terlalu cepat. Silakan tunggu beberapa detik sebelum mencoba lagi.
```

---

## Testing Checklist

### HADIR Command
- [ ] Normal check-in
- [ ] Duplicate check-in (same day)
- [ ] Unregistered phone
- [ ] Inactive employee
- [ ] Outside geofence
- [ ] Weekend/holiday
- [ ] Late check-in

### PULANG Command
- [ ] Normal check-out
- [ ] Without check-in
- [ ] Duplicate check-out
- [ ] Unregistered phone
- [ ] Inactive employee
- [ ] Early check-out

### STATUS Command
- [ ] Not checked in
- [ ] Currently working
- [ ] Already checked out
- [ ] Unregistered phone
- [ ] Inactive employee

### LEMBUR Command
- [ ] Normal overtime start
- [ ] Without check-out
- [ ] Duplicate start
- [ ] Unregistered phone
- [ ] Inactive employee

### SELESAI LEMBUR Command
- [ ] Normal overtime end
- [ ] Without active overtime
- [ ] Unregistered phone
- [ ] Inactive employee

---

**Command Specification Version:** 1.0
**Last Updated:** 2026-03-22
**Status:** Ready for Implementation
