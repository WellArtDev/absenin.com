/**
 * Meta Cloud API Provider Adapter
 * Implements WhatsApp Business API from Meta
 */

import crypto from 'crypto';
import {
  IWhatsAppProvider,
  SendMessageResult,
  ParsedMessage,
  WhatsAppProvider,
  MetaProviderConfig
} from '../types';

export class MetaProviderAdapter implements IWhatsAppProvider {
  private config: MetaProviderConfig;
  private baseUrl: string;

  constructor(config: MetaProviderConfig) {
    this.config = config;
    this.baseUrl = `https://graph.facebook.com/${config.apiVersion || 'v18.0'}`;
  }

  getProviderName(): WhatsAppProvider {
    return WhatsAppProvider.META;
  }

  async sendMessage(phoneNumber: string, message: string): Promise<SendMessageResult> {
    try {
      // Format phone number (ensure it has country code, no +)
      const formattedPhone = phoneNumber.replace(/^\+/, '');

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
            to: formattedPhone,
            type: 'text',
            text: {
              body: message,
              preview_url: false // Disable link previews for security
            }
          })
        }
      );

      const data = await response.json() as any;

      if (!response.ok || data.error) {
        const errorMsg = typeof data.error === 'object'
          ? (data.error?.message || data.error?.error_user_msg || 'HTTP error')
          : 'HTTP error';
        return {
          success: false,
          status: 'error',
          error: errorMsg,
          provider: WhatsAppProvider.META
        };
      }

      return {
        success: true,
        messageId: data.messages?.[0]?.id,
        status: 'sent',
        provider: WhatsAppProvider.META
      };
    } catch (error: any) {
      return {
        success: false,
        status: 'error',
        error: error.message || 'Unknown error',
        provider: WhatsAppProvider.META
      };
    }
  }

  verifyWebhook(
    signature: string,
    payload: string,
    _headers?: Record<string, string>
  ): boolean {
    // Meta uses X-Hub-Signature-256 header
    // Format: sha256=<hmac-value>

    if (!signature || !this.config.webhookVerifyToken) {
      return false;
    }

    // Extract HMAC from signature
    const hmac = signature.replace('sha256=', '');

    // Compute expected HMAC
    const expectedHmac = crypto
      .createHmac('sha256', this.config.webhookVerifyToken)
      .update(payload)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(hmac, 'hex'),
      Buffer.from(expectedHmac, 'hex')
    );
  }

  parseWebhookEvent(event: any): ParsedMessage {
    try {
      const entry = event.entry?.[0];
      if (!entry) {
        throw new Error('Invalid webhook event: no entry');
      }

      const change = entry.changes?.[0];
      if (!change) {
        throw new Error('Invalid webhook event: no changes');
      }

      const value = change.value;
      if (!value || !value.messages) {
        throw new Error('Invalid webhook event: no messages');
      }

      const message = value.messages[0];
      if (!message) {
        throw new Error('Invalid webhook event: empty message array');
      }

      // Extract phone number (remove whatsapp: prefix if present)
      let phoneNumber = message.from;
      if (phoneNumber.startsWith('whatsapp:')) {
        phoneNumber = phoneNumber.replace('whatsapp:', '');
      }

      // Extract message content
      const content = message.text?.body || '';
      const command = content.trim().toUpperCase();

      return {
        provider: WhatsAppProvider.META,
        messageId: message.id,
        phoneNumber,
        content: command,
        metadata: {
          timestamp: message.timestamp,
          type: message.type,
          businessPhoneNumberId: value.metadata?.display_phone_number,
          payload: value
        },
        timestamp: new Date(parseInt(message.timestamp) * 1000)
      };
    } catch (error: any) {
      throw new Error(`Failed to parse Meta webhook event: ${error.message}`);
    }
  }

  formatWebhookResponse(): any {
    // Meta expects a 200 OK response
    return {
      status: 'ok',
      message: 'Webhook received'
    };
  }
}

/**
 * Verify Meta webhook challenge (for setup)
 */
export function verifyMetaWebhookChallenge(
  mode: string,
  token: string,
  challenge: string,
  verifyToken: string
): { valid: boolean; challenge?: string } {
  if (mode === 'subscribe' && token === verifyToken) {
    return {
      valid: true,
      challenge
    };
  }
  return { valid: false };
}
