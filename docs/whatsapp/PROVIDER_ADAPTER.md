# Provider Adapter Design
**Version:** 1.0
**Last Updated:** 2026-03-22
**Status:** Design Complete - Implementation In Progress

---

## Overview

Provider adapter interface for implementing WhatsApp gateway providers.

**Goal:** Provider-agnostic implementation that allows easy addition of new providers.

---

## Base Interface

```typescript
/**
 * WhatsApp Provider Interface
 * All provider adapters must implement this interface
 */
interface IWhatsAppProvider {
  /**
   * Get provider name
   */
  getProviderName(): WhatsAppProvider;

  /**
   * Send message to phone number
   * @param phoneNumber - Phone number with country code (e.g., "628123456789")
   * @param message - Message text to send
   * @returns Send result with message ID and status
   */
  sendMessage(phoneNumber: string, message: string): Promise<SendMessageResult>;

  /**
   * Verify webhook signature
   * @param signature - Signature from webhook header
   * @param payload - Raw webhook payload
   * @returns True if signature is valid
   */
  verifyWebhook(signature: string, payload: string): boolean;

  /**
   * Parse incoming webhook event
   * @param event - Raw webhook event from provider
   * @returns Parsed message with phone, content, and metadata
   */
  parseWebhookEvent(event: any): ParsedMessage;

  /**
   * Format response for webhook acknowledgement
   * @returns HTTP response body for webhook
   */
  formatWebhookResponse(): any;
}
```

---

## Type Definitions

```typescript
/**
 * Supported WhatsApp providers
 */
enum WhatsAppProvider {
  META = 'meta',
  FONNTE = 'fonnte',
  WABLAS = 'wablas'
}

/**
 * Send message result
 */
interface SendMessageResult {
  success: boolean;
  messageId?: string;
  status: string;
  error?: string;
  provider: WhatsAppProvider;
}

/**
 * Parsed message from webhook
 */
interface ParsedMessage {
  provider: WhatsAppProvider;
  messageId: string; // Unique ID for idempotency
  phoneNumber: string; // Sender's phone number
  content: string; // Message text
  metadata: Record<string, any>; // Provider-specific metadata
  timestamp: Date;
}

/**
 * Command parameters
 */
interface CommandParams {
  tenantId: string;
  employeeId: string;
  phoneNumber: string;
  command: string;
  messageId: string;
  metadata: Record<string, any>;
}
```

---

## Meta Cloud API Adapter

### Configuration

```typescript
interface MetaProviderConfig {
  accessToken: string; // WhatsApp Business API access token
  phoneNumberId: string; // WhatsApp phone number ID
  webhookVerifyToken: string; // Webhook verification token
  apiVersion: string; // API version (e.g., "v18.0")
}
```

### Implementation

```typescript
class MetaProviderAdapter implements IWhatsAppProvider {
  private config: MetaProviderConfig;
  private baseUrl: string;

  constructor(config: MetaProviderConfig) {
    this.config = config;
    this.baseUrl = `https://graph.facebook.com/${config.apiVersion}`;
  }

  getProviderName(): WhatsAppProvider {
    return WhatsAppProvider.META;
  }

  async sendMessage(phoneNumber: string, message: string): Promise<SendMessageResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${this.config.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: phoneNumber,
            type: 'text',
            text: { body: message }
          })
        }
      );

      const data = await response.json();

      if (data.error) {
        return {
          success: false,
          status: 'error',
          error: data.error.message,
          provider: WhatsAppProvider.META
        };
      }

      return {
        success: true,
        messageId: data.messages[0].id,
        status: 'sent',
        provider: WhatsAppProvider.META
      };
    } catch (error) {
      return {
        success: false,
        status: 'error',
        error: error.message,
        provider: WhatsAppProvider.META
      };
    }
  }

  verifyWebhook(signature: string, payload: string): boolean {
    // Meta uses X-Hub-Signature-256 header
    const hmac = crypto.createHmac('sha256', this.config.accessToken);
    hmac.update(payload);
    const digest = hmac.digest('hex');
    return `sha256=${digest}` === signature;
  }

  parseWebhookEvent(event: any): ParsedMessage {
    const entry = event.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    return {
      provider: WhatsAppProvider.META,
      messageId: value?.messages?.[0]?.id,
      phoneNumber: value?.messages?.[0]?.from,
      content: value?.messages?.[0]?.text?.body,
      metadata: {
        timestamp: value?.messages?.[0]?.timestamp,
        type: value?.messages?.[0]?.type
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

**URL:** `POST /api/whatsapp/meta/webhook`

**Verification (GET):**
- Meta sends GET request with challenge
- Verify `hub.verify_token` matches config
- Return `hub.challenge` in response

**Webhook Event (POST):**
- Verify X-Hub-Signature-256 header
- Parse incoming message
- Return 200 OK

---

## Fonnte Adapter

### Configuration

```typescript
interface FonnteProviderConfig {
  apiKey: string; // Fonnte API key
  webhookToken?: string; // Webhook verification token (if available)
}
```

### Implementation

```typescript
class FonnteProviderAdapter implements IWhatsAppProvider {
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
      const response = await fetch(`${this.baseUrl}/send`, {
        method: 'POST',
        headers: {
          'Authorization': this.config.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          target: phoneNumber,
          message: message,
          countryCode: '62' // Indonesia
        })
      });

      const data = await response.json();

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
        error: data.reason,
        provider: WhatsAppProvider.FONNTE
      };
    } catch (error) {
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
      const data = JSON.parse(payload);
      return data.token === this.config.webhookToken;
    }
    return true; // Accept all if no token configured
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

**URL:** `POST /api/whatsapp/fonnte/webhook`

**Note:** Fonnte webhook structure may vary - verify with Fonnte documentation

---

## Wablas Adapter

### Configuration

```typescript
interface WablasProviderConfig {
  apiKey: string; // Wablas API key
  webhookToken?: string; // Webhook verification token
}
```

### Implementation

```typescript
class WablasProviderAdapter implements IWhatsAppProvider {
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
      const response = await fetch(`${this.baseUrl}/api/v2/send-message`, {
        method: 'POST',
        headers: {
          'Authorization': this.config.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: phoneNumber,
          message: message
        })
      });

      const data = await response.json();

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
        error: data.message,
        provider: WhatsAppProvider.WABLAS
      };
    } catch (error) {
      return {
        success: false,
        status: 'error',
        error: error.message,
        provider: WhatsAppProvider.WABLAS
      };
    }
  }

  verifyWebhook(signature: string, payload: string): boolean {
    // Wablas may use token verification
    if (this.config.webhookToken) {
      const data = JSON.parse(payload);
      return data.token === this.config.webhookToken;
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

**URL:** `POST /api/whatsapp/wablas/webhook`

**Note:** Wablas webhook structure may vary - verify with Wablas documentation

---

## Provider Factory

```typescript
/**
 * Factory for creating provider instances
 */
class WhatsAppProviderFactory {
  /**
   * Create provider instance based on type
   */
  static createProvider(
    provider: WhatsAppProvider,
    config: any
  ): IWhatsAppProvider {
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

  /**
   * Create provider from integration record
   */
  static createFromIntegration(integration: WhatsAppIntegration): IWhatsAppProvider {
    const config = this.extractConfig(integration);
    return this.createProvider(integration.provider as WhatsAppProvider, config);
  }

  /**
   * Extract provider config from integration
   */
  private static extractConfig(integration: WhatsAppIntegration): any {
    const baseConfig = JSON.parse(integration.api_key || '{}');

    switch (integration.provider) {
      case 'meta':
        return {
          accessToken: baseConfig.accessToken,
          phoneNumberId: baseConfig.phoneNumberId,
          webhookVerifyToken: baseConfig.webhookVerifyToken,
          apiVersion: baseConfig.apiVersion || 'v18.0'
        };
      case 'fonnte':
        return {
          apiKey: baseConfig.apiKey,
          webhookToken: baseConfig.webhookToken
        };
      case 'wablas':
        return {
          apiKey: baseConfig.apiKey,
          webhookToken: baseConfig.webhookToken
        };
      default:
        throw new Error(`Unknown provider: ${integration.provider}`);
    }
  }
}
```

---

## Error Handling

### Provider Errors

**Timeout:**
```typescript
{
  success: false,
  status: 'timeout',
  error: 'Request timeout after 30s',
  provider: WhatsAppProvider.META
}
```

**Invalid Credentials:**
```typescript
{
  success: false,
  status: 'auth_error',
  error: 'Invalid access token',
  provider: WhatsAppProvider.META
}
```

**Rate Limit:**
```typescript
{
  success: false,
  status: 'rate_limited',
  error: 'Too many requests',
  provider: WhatsAppProvider.META
}
```

### Retry Strategy

```typescript
/**
 * Retry configuration per provider
 */
interface RetryConfig {
  maxRetries: number;
  backoffMs: number;
  retryableErrors: string[];
}

const RETRY_CONFIGS: Record<WhatsAppProvider, RetryConfig> = {
  [WhatsAppProvider.META]: {
    maxRetries: 3,
    backoffMs: 1000,
    retryableErrors: ['timeout', 'rate_limited', 'ECONNRESET']
  },
  [WhatsAppProvider.FONNTE]: {
    maxRetries: 2,
    backoffMs: 2000,
    retryableErrors: ['timeout', 'rate_limited']
  },
  [WhatsAppProvider.WABLAS]: {
    maxRetries: 2,
    backoffMs: 2000,
    retryableErrors: ['timeout', 'rate_limited']
  }
};
```

---

## Testing

### Unit Tests

```typescript
describe('MetaProviderAdapter', () => {
  it('should send message successfully', async () => {
    const adapter = new MetaProviderAdapter(mockConfig);
    const result = await adapter.sendMessage('628123456789', 'Test message');
    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });

  it('should verify webhook signature', () => {
    const adapter = new MetaProviderAdapter(mockConfig);
    const payload = JSON.stringify({ test: 'data' });
    const signature = adapter.signPayload(payload);
    expect(adapter.verifyWebhook(signature, payload)).toBe(true);
  });

  it('should parse webhook event', () => {
    const adapter = new MetaProviderAdapter(mockConfig);
    const event = createMockWebhookEvent();
    const parsed = adapter.parseWebhookEvent(event);
    expect(parsed.phoneNumber).toBe('628123456789');
    expect(parsed.content).toBe('HADIR');
  });
});
```

### Integration Tests

```typescript
describe('WhatsApp Integration', () => {
  it('should process HADIR command end-to-end', async () => {
    // Send test webhook
    const webhookResponse = await sendTestWebhook({
      provider: 'meta',
      message: 'HADIR',
      phone: '628123456789'
    });

    expect(webhookResponse.status).toBe(200);

    // Verify attendance record created
    const attendance = await getAttendanceByPhone('628123456789');
    expect(attendance).toBeDefined();
    expect(attendance.checkin_time).toBeDefined();

    // Verify response sent
    const messages = await getSentMessages();
    expect(messages[0].content).toContain('Berhasil hadir');
  });
});
```

---

## Implementation Checklist

### Meta Adapter (Phase 1)
- [ ] Implement `MetaProviderAdapter` class
- [ ] Implement `sendMessage()` method
- [ ] Implement `verifyWebhook()` method
- [ ] Implement `parseWebhookEvent()` method
- [ ] Create webhook endpoint `/api/whatsapp/meta/webhook`
- [ ] Add webhook verification (GET)
- [ ] Add webhook handler (POST)
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Test with Meta sandbox

### Fonnte Adapter (Phase 2)
- [ ] Implement `FonnteProviderAdapter` class
- [ ] Implement all interface methods
- [ ] Create webhook endpoint
- [ ] Write tests
- [ ] Test with Fonnte API

### Wablas Adapter (Phase 3)
- [ ] Implement `WablasProviderAdapter` class
- [ ] Implement all interface methods
- [ ] Create webhook endpoint
- [ ] Write tests
- [ ] Test with Wablas API

---

**Provider Adapter Design Version:** 1.0
**Last Updated:** 2026-03-22
**Status:** Design Complete - Implementation In Progress
