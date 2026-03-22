# Meta WhatsApp Test Runbook
**Version:** 1.0
**Last Updated:** 2026-03-22
**Status:** Ready for Testing

---

## Overview

This runbook provides step-by-step instructions for testing the Meta WhatsApp integration end-to-end.

**Prerequisites:**
- Staging environment deployed
- Database migration applied
- Demo tenant seeded
- Meta developer account with WhatsApp Business API access

---

## 1. Setup Meta Developer Account

### Step 1.1: Create Meta App

1. Go to https://developers.facebook.com/apps
2. Click "Create App"
3. Select "Business" type
4. Name: "Absenin WhatsApp - Staging"
5. Contact email: admin@demonusantara.co.id

### Step 1.2: Add WhatsApp Product

1. In your app dashboard, click "Add Product"
2. Select "WhatsApp"
3. Click "Get Started"
4. Choose "Send and receive messages" (WhatsApp Business API)

### Step 1.3: Get Credentials

**Required:**
- `accessToken`: WhatsApp Business API access token
- `phoneNumberId`: WhatsApp phone number ID
- `webhookVerifyToken`: Custom verify token (you define this)

**Generate Access Token:**
1. Go to WhatsApp > API Setup
2. Generate temporary access token (valid for 24 hours for testing)
3. For production: Permanent token requires app review

**Webhook Verify Token:**
- Create a custom token: `absenin-whatsapp-verify-token-2026`
- Save this: will be used in webhook verification

---

## 2. Configure Staging Environment

### Step 2.1: Add Environment Variables

Add to `apps/api/.env`:

```bash
# Meta WhatsApp Configuration
META_WEBHOOK_VERIFY_TOKEN=absenin-whatsapp-verify-token-2026
```

### Step 2.2: Update WhatsApp Integration in Database

```sql
-- Update Meta integration with real credentials
UPDATE whatsapp_integrations
SET api_key = '{
  "accessToken": "<your-meta-access-token>",
  "phoneNumberId": "<your-phone-number-id>",
  "webhookVerifyToken": "absenin-whatsapp-verify-token-2026",
  "apiVersion": "v18.0"
}'
WHERE tenant_id = 'demo-tenant-001' AND provider = 'meta';
```

### Step 2.3: Restart API Server

```bash
pm2 restart absenin-api
```

---

## 3. Setup Webhook

### Step 3.1: Configure Webhook URL

1. In Meta App Dashboard, go to WhatsApp > Configuration
2. Webhook URL: `https://staging.absenin.com/api/webhook/whatsapp/meta`
3. Webhook Verify Token: `absenin-whatsapp-verify-token-2026`
4. Click "Verify and Save"

**Expected Result:** Meta sends GET request with challenge, server responds with challenge

### Step 3.2: Subscribe to Webhook Events

Subscribe to these events:
- `messages`: Incoming messages

---

## 4. Test Scenarios

### Test 4.1: Webhook Verification

**Command:**
```bash
curl -X GET "https://staging.absenin.com/api/webhook/whatsapp/meta?hub.mode=subscribe&hub.verify_token=absenin-whatsapp-verify-token-2026&hub.challenge=test123"
```

**Expected Response:**
```
test123
```

**Status Check:**
- ✅ Status: 200 OK
- ✅ Response: Challenge echoed back

---

### Test 4.2: HADIR Command (Check-In)

**Send WhatsApp Message:**
From: `6281234567801` (Ahmad Pratama)
Message: `HADIR`

**Expected Response:**
```
Berhasil hadir jam 08:05
```

**Database Verification:**
```sql
-- Check attendance record
SELECT record_id, employee_id, checkin_time, verification_type, status
FROM attendance_records
WHERE employee_id = 'demo-emp-001'
ORDER BY created_at DESC
LIMIT 1;
```

**WhatsApp Event Log:**
```sql
-- Check WhatsApp event
SELECT event_id, phone_number, command, response_text, status
FROM whatsapp_events
WHERE phone_number = '6281234567801'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Results:**
- ✅ Attendance record created with `checkin_time`
- ✅ WhatsApp event logged with `status = 'success'`
- ✅ Response text: "Berhasil hadir jam HH:MM"

---

### Test 4.3: PULANG Command (Check-Out)

**Send WhatsApp Message:**
From: `6281234567801` (Ahmad Pratama)
Message: `PULANG`

**Expected Response:**
```
Berhasil pulang jam 17:05

Durasi kerja: 9 jam 0 menit
```

**Database Verification:**
```sql
-- Check checkout time
SELECT record_id, checkin_time, checkout_time,
  EXTRACT(EPOCH FROM (checkout_time - checkin_time)) / 3600 as work_hours
FROM attendance_records
WHERE employee_id = 'demo-emp-001'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Results:**
- ✅ `checkout_time` updated
- ✅ Work duration calculated
- ✅ Response includes duration

---

### Test 4.4: STATUS Command (Check Status)

**Scenario A: Not Checked In**

**Send WhatsApp Message:**
From: `6281234567802` (Budi Santoso)
Message: `STATUS`

**Expected Response:**
```
Anda belum check-in hari ini.

Jam sekarang: 10:30
```

**Scenario B: Currently Working**

**Send WhatsApp Message:**
From: `6281234567801` (Ahmad Pratama, after HADIR)
Message: `STATUS`

**Expected Response:**
```
Anda sedang bekerja.

Check-in: 08:05
Durasi: 2 jam 25 menit
Jam sekarang: 10:30
```

---

### Test 4.5: Invalid Signature

**Test:**
```bash
curl -X POST https://staging.absenin.com/api/webhook/whatsapp/meta \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: invalid_signature" \
  -d '{"test": "data"}'
```

**Expected Response:**
```
Status: 403 Forbidden
{
  "error": "Invalid signature"
}
```

---

### Test 4.6: Idempotency (Duplicate Prevention)

**Test:** Send same message twice

**First HADIR:**
- ✅ Creates attendance record
- ✅ Sends response

**Second HADIR (same message_id):**
- ✅ Does NOT create duplicate attendance record
- ✅ Returns same response as first

**Verification:**
```sql
-- Should only have 1 record
SELECT COUNT(*) FROM attendance_records
WHERE employee_id = 'demo-emp-001'
  AND DATE(checkin_time) = CURRENT_DATE;
```

---

### Test 4.7: Unknown Phone Number

**Send WhatsApp Message:**
From: `6289999999999` (Unknown number)
Message: `HADIR`

**Expected Response:**
```
Nomor telepon Anda tidak terdaftar. Silakan hubungi admin.
```

**Database Verification:**
```sql
-- Should be logged as failed
SELECT status, error_message FROM whatsapp_events
WHERE phone_number = '6289999999999'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Results:**
- ✅ No attendance record created
- ✅ WhatsApp event logged with `status = 'failed'`
- ✅ Appropriate error message

---

### Test 4.8: Invalid Command

**Send WhatsApp Message:**
From: `6281234567801`
Message: `INVALID_COMMAND`

**Expected Response:**
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

## 5. Functional Test Matrix

| # | Test | Command | Expected | Status |
|---|------|---------|----------|--------|
| 1 | Webhook verification | GET /api/webhook/whatsapp/meta | Challenge echoed | ⬜ |
| 2 | HADIR success | HADIR from registered phone | "Berhasil hadir jam HH:MM" | ⬜ |
| 3 | PULANG success | PULANG after HADIR | "Berhasil pulang jam HH:MM" | ⬜ |
| 4 | STATUS (not checked in) | STATUS before HADIR | "Anda belum check-in" | ⬜ |
| 5 | STATUS (working) | STATUS after HADIR | "Anda sedang bekerja" | ⬜ |
| 6 | STATUS (checked out) | STATUS after PULANG | "Anda sudah selesai" | ⬜ |
| 7 | Invalid signature | POST with bad signature | 403 Forbidden | ⬜ |
| 8 | Idempotency | Duplicate HADIR | No duplicate record | ⬜ |
| 9 | Unknown phone | HADIR from unknown number | Error message | ⬜ |
| 10 | Invalid command | RANDOM_TEXT | Help message | ⬜ |
| 11 | Audit logging | Any command | Event logged | ⬜ |
| 12 | Tenant isolation | Cross-tenant phone | Error/ rejection | ⬜ |

---

## 6. Payload Examples

### Webhook Verification (GET)

**Request:**
```
GET /api/webhook/whatsapp/meta?hub.mode=subscribe&hub.verify_token=absenin-whatsapp-verify-token-2026&hub.challenge=test123
```

**Response:**
```
test123
```

### Incoming Message (POST)

**Headers:**
```
X-Hub-Signature-256: sha256=<hmac-value>
Content-Type: application/json
```

**Body:**
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
      "changes": [
        {
          "field": "messages",
          "value": {
            "messages": [
              {
                "id": "wamid.H4NwUjYcT9CABCDEF123456789o",
                "from": "6281234567801",
                "timestamp": "1711144567",
                "type": "text",
                "text": {
                  "body": "HADIR"
                }
              }
            ]
          },
          "metadata": {
            "display_phone_number": "6281234567890",
            "phone_number_id": "123456789012345"
          }
        }
      ]
    }
  ]
}
```

---

## 7. Troubleshooting

### Issue: Webhook verification fails

**Check:**
- Verify token matches in environment variable
- Check webhook URL is correct
- Ensure server is running

**Solution:**
```bash
# Check environment variable
echo $META_WEBHOOK_VERIFY_TOKEN

# Check webhook is accessible
curl -I https://staging.absenin.com/api/webhook/whatsapp/meta
```

### Issue: Command not recognized

**Check:**
- Message content (case sensitivity)
- Command spelling
- Employee exists in database

**Solution:**
```sql
-- Check employee and WhatsApp phone
SELECT full_name, whatsapp_phone, is_active
FROM employees
WHERE whatsapp_phone = '6281234567801';
```

### Issue: Duplicate attendance records

**Check:**
- Idempotency check is working
- `message_id` unique constraint

**Solution:**
```sql
-- Check WhatsApp events for duplicates
SELECT message_id, command, status, created_at
FROM whatsapp_events
WHERE phone_number = '6281234567801'
ORDER BY created_at DESC
LIMIT 5;
```

### Issue: Response not sent via WhatsApp

**Check:**
- API access token is valid
- Phone number ID is correct
- Sufficient API credits

**Solution:**
```bash
# Check Meta API status
curl -X POST "https://graph.facebook.com/v18.0/<phone-number-id>/messages" \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"messaging_product": "whatsapp", "to": "6281234567801", "type": "text", "text": {"body": "Test message"}}'
```

---

## 8. Success Criteria

All tests must pass:

- ✅ Webhook verification succeeds
- ✅ HADIR creates attendance record
- ✅ PULANG updates checkout time
- ✅ STATUS returns correct status
- ✅ Invalid signature rejected (403)
- ✅ Duplicate messages ignored (idempotency)
- ✅ Unknown phones rejected
- ✅ Invalid commands show help
- ✅ All events logged to WhatsAppEvent
- ✅ Tenant isolation enforced

---

## 9. Next Steps After Testing

1. **Monitor Logs:**
   ```bash
   pm2 logs absenin-api --lines 100
   tail -f /var/log/nginx/staging.absenin.com-error.log
   ```

2. **Check Database:**
   ```sql
   -- Event log summary
   SELECT command, status, COUNT(*)
   FROM whatsapp_events
   GROUP BY command, status;
   ```

3. **Verify Attendance:**
   ```sql
   -- Today's attendance
   SELECT e.full_name, a.checkin_time, a.checkout_time
   FROM attendance_records a
   JOIN employees e ON a.employee_id = e.employee_id
   WHERE DATE(a.checkin_time) = CURRENT_DATE
   ORDER BY a.checkin_time;
   ```

---

**Runbook Version:** 1.0
**Last Updated:** 2026-03-22
**Status:** Ready for Testing
