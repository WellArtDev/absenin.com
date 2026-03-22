# WhatsApp Multi-Gateway Architecture
**Version:** 1.0
**Last Updated:** 2026-03-22
**Status:** Design Complete - Implementation In Progress

---

## Overview

Multi-provider WhatsApp integration system for attendance and overtime (lembur) commands via WhatsApp messages.

**Providers Supported:**
1. Meta Cloud API (WhatsApp Business API)
2. Fonnte (Indonesia WhatsApp gateway)
3. Wablas (Indonesia WhatsApp gateway)

**Design Principles:**
- Provider agnostic (easy to add new providers)
- Tenant isolation (strict multi-tenancy)
- Idempotent message processing
- Comprehensive audit logging
- Indonesian user-facing messages

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         WhatsApp Service                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────┐ │
│  │  Webhook     │───▶│  Command         │───▶│  Command     │ │
│  │  Receiver    │    │  Dispatcher      │    │  Handlers    │ │
│  └──────────────┘    └──────────────────┘    └──────────────┘ │
│         │                     │                      │          │
│         │                     ▼                      ▼          │
│         │            ┌──────────────┐      ┌──────────────┐   │
│         │            │  Provider     │      │  Attendance  │   │
│         │            │  Selector     │      │  Service     │   │
│         │            └──────────────┘      └──────────────┘   │
│         │                     │                      │          │
│         ▼                     ▼                      ▼          │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────┐ │
│  │  Idempotency │    │  Provider        │    │  Audit       │ │
│  │  Checker     │    │  Adapters        │    │  Logger      │ │
│  └──────────────┘    └──────────────────┘    └──────────────┘ │
│                               │                                  │
│         ┌─────────────────────┼─────────────────────┐          │
│         ▼                     ▼                     ▼          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │  Meta        │    │  Fonnte      │    │  Wablas      │   │
│  │  Adapter     │    │  Adapter     │    │  Adapter     │   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
│         │                     │                     │          │
│         └─────────────────────┴─────────────────────┘          │
│                               │                                  │
│                               ▼                                  │
│                      ┌──────────────┐                           │
│                      │  WhatsApp    │                           │
│                      │  Provider    │                           │
│                      │  APIs        │                           │
│                      └──────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Webhook Receiver

**Purpose:** Receive incoming webhook events from all providers

**Endpoints:**
- `POST /api/whatsapp/meta/webhook` - Meta Cloud API webhook
- `POST /api/whatsapp/fonnte/webhook` - Fonnte webhook
- `POST /api/whatsapp/wablas/webhook` - Wablas webhook

**Responsibilities:**
- Verify webhook signature (provider-specific)
- Parse incoming message
- Extract phone number and message content
- Forward to Command Dispatcher

**Security:**
- Signature verification per provider
- Rate limiting per provider
- IP whitelisting (if available)

---

### 2. Command Dispatcher

**Purpose:** Parse and route WhatsApp commands to appropriate handlers

**Process Flow:**
1. Receive message from Webhook Receiver
2. Check idempotency (prevent duplicate processing)
3. Parse command from message text
4. Lookup tenant by phone number
5. Route to appropriate Command Handler
6. Return response to Provider Adapter
7. Log event to Audit Logger

**Commands Supported:**
- `HADIR` - Check-in
- `PULANG` - Check-out
- `STATUS` - Check attendance status
- `LEMBUR` - Start overtime
- `SELESAI LEMBUR` - End overtime

**Error Handling:**
- Unknown command → Help message
- Missing tenant → Error message
- Unauthorized phone → Error message
- Business logic errors → Indonesian error messages

---

### 3. Provider Selector

**Purpose:** Select appropriate provider adapter for sending messages

**Selection Logic:**
1. Check tenant's active integration
2. Load provider configuration
3. Return appropriate adapter instance

**Configuration:**
- Each tenant can have one integration per provider
- Tenant can have multiple providers (failover)
- Default provider: First active integration

---

### 4. Provider Adapters

**Interface:** `IWhatsAppProvider`

**Methods:**
```typescript
interface IWhatsAppProvider {
  // Send message to phone number
  sendMessage(phoneNumber: string, message: string): Promise<SendMessageResult>;

  // Verify webhook signature
  verifyWebhook(signature: string, payload: string): boolean;

  // Parse incoming webhook event
  parseWebhookEvent(event: any): ParsedMessage;

  // Get provider name
  getProviderName(): string;
}
```

**Implementations:**

#### Meta Adapter
- **Webhook:** `/api/whatsapp/meta/webhook`
- **Verification:** X-Hub-Signature-256 header
- **API:** WhatsApp Cloud API
- **Rate Limits:** Per WhatsApp Business API limits

#### Fonnte Adapter
- **Webhook:** `/api/whatsapp/fonnte/webhook`
- **Verification:** Fonnte signature (if available)
- **API:** Fonnte REST API
- **Rate Limits:** Fonnte limits

#### Wablas Adapter
- **Webhook:** `/api/whatsapp/wablas/webhook`
- **Verification:** Wablas token
- **API:** Wablas REST API
- **Rate Limits:** Wablas limits

---

### 5. Command Handlers

**Base Interface:** `ICommandHandler`

**Methods:**
```typescript
interface ICommandHandler {
  // Get command name
  getCommandName(): string;

  // Validate command parameters
  validate(params: CommandParams): ValidationResult;

  // Execute command
  execute(params: CommandParams): Promise<CommandResult>;

  // Format response message
  formatResponse(result: CommandResult): string;
}
```

**Implementations:**

#### HadirCommand
- **Command:** `HADIR`
- **Validation:** None required
- **Action:** Create attendance record with check-in time
- **Response:** "Berhasil hadir jam HH:MM"

#### PulangCommand
- **Command:** `PULANG`
- **Validation:** Must have checked in today
- **Action:** Update attendance record with check-out time
- **Response:** "Berhasil pulang jam HH:MM"

#### StatusCommand
- **Command:** `STATUS`
- **Validation:** None required
- **Action:** Query today's attendance
- **Response:** "Anda belum check-in hari ini" or "Anda hadir jam HH:MM"

#### LemburCommand
- **Command:** `LEMBUR`
- **Validation:** Must have checked out
- **Action:** Create overtime record
- **Response:** "Lembur dimulai jam HH:MM"

#### SelesaiLemburCommand
- **Command:** `SELESAI LEMBUR`
- **Validation:** Must have active overtime
- **Action:** End overtime record
- **Response:** "Lembur selesai jam HH:MM"

---

### 6. Idempotency Checker

**Purpose:** Prevent duplicate processing of same message

**Implementation:**
- Use `message_id` from provider as idempotency key
- Check `whatsapp_events` table for existing record
- If exists, return previous response
- If not, proceed with processing

**Table:** `whatsapp_events.message_id` (unique index)

---

### 7. Audit Logger

**Purpose:** Log all WhatsApp commands for audit trail

**Implementation:**
- Insert record into `whatsapp_events` table
- Log: tenant_id, phone_number, command, request, response, status
- Store full request payload (JSON)
- Store response text
- Track processing status

**Table:** `whatsapp_events`

---

## Data Models

### WhatsAppIntegration

```prisma
model WhatsAppIntegration {
  integration_id   String   @id @default(dbgenerated("gen_random_uuid()"))
  tenant_id        String
  provider         String   // 'meta', 'fonnte', 'wablas'
  phone_number     String   // WhatsApp business number
  api_key          String   @default("")
  webhook_url      String   @default("")
  is_active        Boolean  @default(true)
  created_at       DateTime @default(now())
  updated_at       DateTime @updatedAt

  tenant           Tenant   @relation(fields: [tenant_id], references: [tenant_id], onDelete: Cascade)
  events           WhatsAppEvent[]

  @@unique([tenant_id, provider])
  @@index([provider])
  @@index([is_active])
  @@map("whatsapp_integrations")
}
```

### WhatsAppEvent

```prisma
model WhatsAppEvent {
  event_id         String   @id @default(dbgenerated("gen_random_uuid()"))
  tenant_id        String
  phone_number     String
  message_id       String   @unique // Provider message ID for deduplication
  command          String   // 'HADIR', 'PULANG', 'STATUS', 'LEMBUR', 'SELESAI_LEMBUR'
  request_payload  Json
  response_text    String?
  status           String   // 'processing', 'success', 'failed'
  error_message    String?
  processed_at     DateTime?
  created_at       DateTime @default(now())

  integration      WhatsAppIntegration @relation(fields: [integration_id], references: [integration_id], onDelete: SetNull)

  @@index([tenant_id, phone_number])
  @@index([message_id])
  @@index([status])
  @@index([created_at])
  @@map("whatsapp_events")
}
```

### Employee Phone Mapping

**Note:** Add `phone_number` to `Employee` model if not exists

```prisma
model Employee {
  // ... existing fields
  phone_number    String?  @unique // WhatsApp phone number
  // ... rest of model
}
```

---

## Message Flow

### Incoming Message Flow

```
1. User sends WhatsApp message: "HADIR"
   ↓
2. Provider sends webhook to: /api/whatsapp/{provider}/webhook
   ↓
3. Webhook Receiver verifies signature
   ↓
4. Parse message: extract phone, message content
   ↓
5. Command Dispatcher checks idempotency (message_id)
   ↓
6. Lookup tenant by phone number → Employee → Tenant
   ↓
7. Parse command: "HADIR"
   ↓
8. Route to HadirCommand handler
   ↓
9. Handler validates and executes
   ↓
10. Create attendance record (check-in)
    ↓
11. Format response: "Berhasil hadir jam 08:05"
    ↓
12. Send response via Provider Adapter
    ↓
13. Log to WhatsAppEvent
    ↓
14. Return 200 OK to webhook
```

### Outgoing Message Flow

```
1. Application needs to send WhatsApp message
   ↓
2. Provider Selector selects active provider
   ↓
3. Provider Adapter.sendMessage()
   ↓
4. Call provider API
   ↓
5. Provider sends message to user
   ↓
6. Return message_id and status
   ↓
7. Log to WhatsAppEvent
```

---

## Security Considerations

### Webhook Verification

**Meta:**
- Verify X-Hub-Signature-256 header
- Use app secret from Meta
- Compare HMAC-SHA256 hash

**Fonnte:**
- Verify token (if available)
- IP whitelisting (if available)

**Wablas:**
- Verify token from Wablas
- IP whitelisting (if available)

### Tenant Isolation

**Phone Number Mapping:**
- Phone number linked to Employee
- Employee linked to Tenant
- Cross-tenant access prevented

**Integrations:**
- Each tenant has own integrations
- Cannot use other tenant's integrations

**Audit Logs:**
- All events tagged with tenant_id
- Cross-tenant queries prevented

### Rate Limiting

**Per Provider:**
- Meta: WhatsApp Business API limits
- Fonnte: Fonnte plan limits
- Wablas: Wablas plan limits

**Per Tenant:**
- Limit messages per minute
- Limit commands per hour
- Prevent abuse

---

## Error Handling

### Provider Errors

**Timeout:**
- Retry with exponential backoff
- Log error
- Return error to user

**Invalid Credentials:**
- Mark integration as inactive
- Alert admin
- Log error

**Rate Limit Exceeded:**
- Queue message for retry
- Return error to user
- Log warning

### Business Logic Errors

**Employee Not Found:**
- Response: "Nomor telepon Anda tidak terdaftar. Silakan hubungi admin."

**Already Checked In:**
- Response: "Anda sudah check-in hari ini jam HH:MM."

**Not Checked In:**
- Response: "Anda belum check-in hari ini."

**No Active Overtime:**
- Response: "Anda tidak memiliki lembur aktif."

---

## Monitoring and Observability

### Metrics to Track

**Per Provider:**
- Messages sent
- Messages received
- Webhook latency
- Error rate
- Success rate

**Per Tenant:**
- Commands executed
- Command types distribution
- Error rate
- Response time

**Per Command:**
- Execution count
- Success rate
- Average duration
- Error distribution

### Logging

**Audit Log:**
- All commands to `whatsapp_events`
- Full request/response
- Timestamps
- Status tracking

**Application Log:**
- Provider API calls
- Errors and exceptions
- Performance metrics

---

## Next Steps

### Phase 1: Meta Adapter (Current)
1. ✅ Architecture design
2. ✅ Data models defined
3. ⏳ Implement Meta adapter
4. ⏳ Create webhook endpoint
5. ⏳ Implement command handlers (HADIR, PULANG, STATUS)
6. ⏳ Add phone-to-tenant mapping
7. ⏳ Test end-to-end

### Phase 2: Fonnte Adapter
1. Implement Fonnte adapter
2. Create Fonnte webhook
3. Test with Fonnte API
4. Document differences

### Phase 3: Wablas Adapter
1. Implement Wablas adapter
2. Create Wablas webhook
3. Test with Wablas API
4. Document differences

### Phase 4: Advanced Features
1. Overtime commands (LEMBUR, SELESAI LEMBUR)
2. Multi-provider failover
3. Message queue for high volume
4. Analytics dashboard
5. Template messages

---

**Architecture Version:** 1.0
**Last Updated:** 2026-03-22
**Status:** Design Complete - Implementation In Progress
