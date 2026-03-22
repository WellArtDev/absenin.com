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
        error: error.message || 'Unknown error',
        provider: WhatsAppProvider.FONNTE
      };
    }
  }

  verifyWebhook(signature: string, payload: string, _headers?: Record<string, string>): boolean {
    // Fonnte uses token verification
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
    try {
      // Fonnte webhook payload format
      const sender = event.sender || event.phone;
      const message = event.message || event.text;
      const messageId = event.id || event.message_id;

      if (!sender || !message) {
        throw new Error('Invalid Fonnte webhook event: missing sender or message');
      }

      return {
        provider: WhatsAppProvider.FONNTE,
        messageId: messageId || `fonnte_${Date.now()}_${sender}`,
        phoneNumber: sender,
        content: message,
        metadata: {
          device: event.device,
          url: event.url,
          payload: event
        },
        timestamp: new Date()
      };
    } catch (error: any) {
      throw new Error(`Failed to parse Fonnte webhook event: ${error.message}`);
    }
  }

  formatWebhookResponse(): any {
    return { status: 'ok' };
  }
}
