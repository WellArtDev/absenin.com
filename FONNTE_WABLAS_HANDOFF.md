# Fonnte + Wablas Handoff Documentation
**Version:** 1.0
**Last Updated:** 2026-03-22
**Purpose:** Actionable handoff for next phase providers

---

## Overview

Meta adapter is complete. This document provides:
1. Adapter skeletons for Fonnte and Wablas
2. Provider configuration fields
3. Auth verification strategy
4. Implementation roadmap
5. Effort/risk assessment

---

## Fonnte Provider

### Provider Information

**Website:** https://fonnte.com
**Type:** Indonesia WhatsApp Gateway
**Pricing:** Pay-per-message
**Documentation:** https://docs.fonnte.com

### Configuration Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `apiKey` | string | YES | Fonnte API key from dashboard |
| `webhookToken` | string | NO | Optional webhook verification token |

**API Key Format:**
```
token_<your_token>
```

**Get API Key:**
1. Login to https://fonnte.com
2. Go to Dashboard
3. Copy API token

### Webhook Setup

**Webhook URL:**
```
https://staging.absenin.com/api/webhook/whatsapp/fonnte
```

**Webhook Verification:**
- Fonnte may not provide signature verification
- Optional token verification if available
- IP whitelisting recommended (if available)

### Adapter Skeleton

```typescript
/**
 * Fonnte Provider Adapter
 * Indonesia WhatsApp gateway
 */

import {
  IWhatsAppProvider,
  SendMessageResult,
  ParsedMessage,
  WhatsAppProvider,
  FonnteProviderConfig
} from '../types';

export class FonnteProviderAdapter implements IWhatsAppProvider {
  private config: FonnteProviderConfig;
  private baseUrl: string = 'https://api.fonnte.com';

  constructor(config: FonnteProviderConfig) {
    this.config = config;
  }

  getProviderName(): WhatsAppProvider {
    return WhatsAppProvider.FONNTE;
  }

  async sendMessage(phoneNumber: string, message: string): Promise<SendMessageResult> {
    try {
      const formattedPhone = phoneNumber.replace(/^\+/, '');

      const response = await fetch(`${this.baseUrl}/send`, {
        method: 'POST',
        headers: {
          'Authorization': this.config.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          target: formattedPhone,
          message: message,
          countryCode: '62'
        })
      });

      const data = await response.json() as any;

      if (data.status) {
        return {
          success: true,
          messageId: data.id,
          status: 'sent',
          provider: WhatsAppProvider.FONNTE
        };
      }

      return {
        success: false,
        status: 'error',
        error: data.reason || 'Send failed',
        provider: WhatsAppProvider.FONNTE
      };
    } catch (error: any) {
      return {
        success: false,
        status: 'error',
        error: error.message,
        provider: WhatsAppProvider.FONNTE
      };
    }
  }

  verifyWebhook(signature: string, payload: string): boolean {
    // Fonnte may not have signature verification
    // Implement token verification if available
    if (this.config.webhookToken) {
      try {
        const data = JSON.parse(payload);
        return data.token === this.config.webhookToken;
      } catch {
        return false;
      }
    }
    // Accept all webhooks if no token configured (security risk)
    return true;
  }

  parseWebhookEvent(event: any): ParsedMessage {
    return {
      provider: WhatsAppProvider.FONNTE,
      messageId: event.id,
      phoneNumber: event.sender,
      content: event.message,
      metadata: {
        device: event.device,
        url: event.url
      },
      timestamp: new Date()
    };
  }

  formatWebhookResponse(): any {
    return { status: 'ok' };
  }
}
```

### Webhook Endpoint

**Already Created:** `POST /api/webhook/whatsapp/fonnte`

**Current Status:** Returns 501 Not Implemented

### Implementation Steps

1. **Create Fonnte account** (30 min)
   - Sign up at https://fonnte.com
   - Get API key
   - Top up credits for testing

2. **Complete adapter implementation** (2 hours)
   - Copy skeleton above
   - Implement sendMessage with Fonnte API
   - Implement parseWebhookEvent
   - Test with Fonnte sandbox

3. **Create webhook handler** (1 hour)
   - Update `handleFonnteWebhook` in whatsappController.ts
   - Add Fonnte-specific logic if needed

4. **Testing** (2 hours)
   - Test HADIR/PULANG/STATUS commands
   - Verify idempotency
   - Verify audit logging

**Total Effort:** ~5 hours

### Risks

| Risk | Level | Mitigation |
|------|-------|------------|
| API changes | LOW | Fonnte API is stable |
| Rate limits | MEDIUM | Implement retry logic |
| No signature verification | HIGH | IP whitelisting required |
| Documentation quality | MEDIUM | May need trial and error |

---

## Wablas Provider

### Provider Information

**Website:** https://wablas.com
**Type:** Indonesia WhatsApp Gateway
**Pricing:** Pay-per-message
**Documentation:** https://doc.wablas.com

### Configuration Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `apiKey` | string | YES | Wablas API key from dashboard |
| `webhookToken` | string | NO | Optional webhook verification token |

**API Key Format:**
```
<your_api_key>
```

**Get API Key:**
1. Login to https://wablas.com
2. Go to Dashboard
3. Copy API key

### Webhook Setup

**Webhook URL:**
```
https://staging.absenin.com/api/webhook/whatsapp/wablas
```

**Webhook Verification:**
- Wablas provides token verification
- Implement token check in webhook handler

### Adapter Skeleton

```typescript
/**
 * Wablas Provider Adapter
 * Indonesia WhatsApp gateway
 */

import {
  IWhatsAppProvider,
  SendMessageResult,
  ParsedMessage,
  WhatsAppProvider,
  WablasProviderConfig
} from '../types';

export class WablasProviderAdapter implements IWhatsAppProvider {
  private config: WablasProviderConfig;
  private baseUrl: string = 'https://solo.wablas.com';

  constructor(config: WablasProviderConfig) {
    this.config = config;
  }

  getProviderName(): WhatsAppProvider {
    return WhatsAppProvider.WABLAS;
  }

  async sendMessage(phoneNumber: string, message: string): Promise<SendMessageResult> {
    try {
      const formattedPhone = phoneNumber.replace(/^\+/, '');

      const response = await fetch(`${this.baseUrl}/api/v2/send-message`, {
        method: 'POST',
        headers: {
          'Authorization': this.config.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: formattedPhone,
          message: message
        })
      });

      const data = await response.json() as any;

      if (data.status) {
        return {
          success: true,
          messageId: data.data.id,
          status: 'sent',
          provider: WhatsAppProvider.WABLAS
        };
      }

      return {
        success: false,
        status: 'error',
        error: data.message || 'Send failed',
        provider: WhatsAppProvider.WABLAS
      };
    } catch (error: any) {
      return {
        success: false,
        status: 'error',
        error: error.message,
        provider: WhatsAppProvider.WABLAS
      };
    }
  }

  verifyWebhook(signature: string, payload: string): boolean {
    // Wablas uses token verification
    if (this.config.webhookToken) {
      try {
        const data = JSON.parse(payload);
        return data.token === this.config.webhookToken;
      } catch {
        return false;
      }
    }
    return true;
  }

  parseWebhookEvent(event: any): ParsedMessage {
    return {
      provider: WhatsAppProvider.WABLAS,
      messageId: event.id,
      phoneNumber: event.phone,
      content: event.message,
      metadata: {
        status: event.status,
        device: event.device
      },
      timestamp: new Date()
    };
  }

  formatWebhookResponse(): any {
    return { status: 'ok' };
  }
}
```

### Webhook Endpoint

**Already Created:** `POST /api/webhook/whatsapp/wablas`

**Current Status:** Returns 501 Not Implemented

### Implementation Steps

1. **Create Wablas account** (30 min)
   - Sign up at https://wablas.com
   - Get API key
   - Top up credits for testing

2. **Complete adapter implementation** (2 hours)
   - Copy skeleton above
   - Implement sendMessage with Wablas API
   - Implement parseWebhookEvent
   - Test with Wablas sandbox

3. **Create webhook handler** (1 hour)
   - Update `handleWablasWebhook` in whatsappController.ts
   - Add Wablas-specific logic if needed

4. **Testing** (2 hours)
   - Test HADIR/PULANG/STATUS commands
   - Verify idempotency
   - Verify audit logging

**Total Effort:** ~5 hours

### Risks

| Risk | Level | Mitigation |
|------|-------|------------|
| API changes | LOW | Wablas API is stable |
| Rate limits | MEDIUM | Implement retry logic |
| Documentation quality | MEDIUM | May need trial and error |
| Webhook payload format | HIGH | May differ from docs |

---

## Comparison: Provider Features

| Feature | Meta | Fonnte | Wablas |
|---------|------|--------|--------|
| **Verification** | HMAC-SHA256 | Token (optional) | Token (optional) |
| **Webhook Security** | ✅ High | ⚠️ Low/Medium | ⚠️ Low/Medium |
| **API Stability** | ✅ Enterprise | ⚠️ Startup | ⚠️ Startup |
| **Documentation** | ✅ Excellent | ⚠️ Fair | ⚠️ Fair |
| **Pricing** | Pay-per-conversation | Pay-per-message | Pay-per-message |
| **Setup Complexity** | High (app review) | Low (instant) | Low (instant) |
| **Reliability** | ✅ 99.9% | ⚠️ Unknown | ⚠️ Unknown |
| **Rate Limits** | High limits | Medium limits | Medium limits |

---

## Implementation Priority

### Sprint 2: Fonnte Adapter

**Timeline:** 1 week

**Tasks:**
1. ✅ Adapter skeleton created
2. ⏳ Sign up for Fonnte account
3. ⏳ Complete implementation
4. ⏳ Update webhook handler
5. ⏳ Test with demo tenant
6. ⏳ Document Fonnte-specific quirks

**Entry Criteria:** Meta adapter fully tested

**Exit Criteria:** Fonnte adapter working for HADIR/PULANG/STATUS

**Risk Level:** MEDIUM

---

### Sprint 3: Wablas Adapter

**Timeline:** 1 week

**Tasks:**
1. ✅ Adapter skeleton created
2. ⏳ Sign up for Wablas account
3. ⏳ Complete implementation
4. ⏳ Update webhook handler
5. ⏳ Test with demo tenant
6. ⏳ Document Wablas-specific quirks

**Entry Criteria:** Fonnte adapter fully tested

**Exit Criteria:** Wablas adapter working for HADIR/PULANG/STATUS

**Risk Level:** MEDIUM

---

## Multi-Provider Strategy

### Phase 1: Meta Only (Current)
- Single provider for all tenants
- Simple configuration
- Easy testing and debugging

### Phase 2: Meta + Fonnte
- Tenants can choose provider
- Failover if primary provider down
- Load balancing across providers

### Phase 3: Meta + Fonnte + Wablas
- All providers available
- Automatic failover
- Provider health monitoring
- Cost optimization

---

## Common Patterns

### Provider Factory (Already Designed)

```typescript
class WhatsAppProviderFactory {
  static createProvider(provider: WhatsAppProvider, config: any): IWhatsAppProvider {
    switch (provider) {
      case WhatsAppProvider.META:
        return new MetaProviderAdapter(config);
      case WhatsAppProvider.FONNTE:
        return new FonnteProviderAdapter(config);
      case WhatsAppProvider.WABLAS:
        return new WablasProviderAdapter(config);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
}
```

### Command Dispatcher (Already Implemented)

The CommandDispatcher works with all providers uniformly:
1. Parses command from message
2. Looks up employee by phone
3. Routes to appropriate command handler
4. Logs event to WhatsAppEvent
5. Sends response via provider

No provider-specific logic in command handlers.

---

## Testing Strategy

### Unit Tests

Each adapter needs:
```typescript
describe('FonnteAdapter', () => {
  it('should send message successfully', async () => {
    const adapter = new FonnteProviderAdapter(config);
    const result = await adapter.sendMessage('6281234567801', 'Test');
    expect(result.success).toBe(true);
  });

  it('should parse webhook event', () => {
    const adapter = new FonnteProviderAdapter(config);
    const event = createMockFonnteEvent();
    const parsed = adapter.parseWebhookEvent(event);
    expect(parsed.content).toBe('HADIR');
  });
});
```

### Integration Tests

```typescript
describe('Fonnte Integration', () => {
  it('should process HADIR command', async () => {
    const event = createFonnteWebhookEvent({
      phone: '6281234567801',
      message: 'HADIR'
    });

    const result = await dispatchCommand(event);
    expect(result.success).toBe(true);
    expect(result.message).toContain('Berhasil hadir');
  });
});
```

---

## Provider-Specific Notes

### Fonnte

**Webhook Payload Format:**
```json
{
  "id": "unique-message-id",
  "sender": "6281234567801",
  "message": "HADIR",
  "device": "devicename",
  "url": "https://fonnte.com/api"
}
```

**API Response:**
```json
{
  "status": true,
  "id": "message-id",
  "message": "Message sent"
}
```

**Error Response:**
```json
{
  "status": false,
  "reason": "Invalid token"
}
```

### Wablas

**Webhook Payload Format:**
```json
{
  "id": "unique-message-id",
  "phone": "6281234567801",
  "message": "HADIR",
  "status": "received",
  "device": "devicename"
}
```

**API Response:**
```json
{
  "status": true,
  "data": {
    "id": "message-id"
  },
  "message": "Message sent"
}
```

---

## Next Steps Summary

### Immediate (After Meta Testing)
1. ✅ Test Meta adapter thoroughly
2. ✅ Document any Meta-specific issues
3. ✅ Update Meta adapter if needed

### Sprint 2: Fonnte
1. Sign up for Fonnte account
2. Complete Fonnte adapter
3. Test with demo tenant
4. Document Fonnte quirks

### Sprint 3: Wablas
1. Sign up for Wablas account
2. Complete Wablas adapter
3. Test with demo tenant
4. Document Wablas quirks

### Sprint 4: Multi-Provider
1. Implement provider selection logic
2. Add failover mechanism
3. Provider health monitoring
4. Load balancing

---

**Handoff Version:** 1.0
**Last Updated:** 2026-03-22
**Status:** Ready for Implementation
