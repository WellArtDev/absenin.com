/**
 * WhatsApp Module Types
 */

/**
 * Supported WhatsApp providers
 */
export enum WhatsAppProvider {
  META = 'meta',
  FONNTE = 'fonnte',
  WABLAS = 'wablas'
}

/**
 * Send message result
 */
export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  status: string;
  error?: string;
  provider: WhatsAppProvider;
}

/**
 * Parsed message from webhook
 */
export interface ParsedMessage {
  provider: WhatsAppProvider;
  messageId: string;
  phoneNumber: string;
  content: string;
  metadata: Record<string, any>;
  timestamp: Date;
}

/**
 * Command parameters
 */
export interface CommandParams {
  tenantId: string;
  employeeId: string;
  phoneNumber: string;
  command: string;
  messageId: string;
  provider: WhatsAppProvider;
  metadata: Record<string, any>;
}

/**
 * Command result
 */
export interface CommandResult {
  success: boolean;
  message: string;
  data?: Record<string, any>;
  error?: string;
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  [key: string]: string | undefined;
}

/**
 * Meta provider config
 */
export interface MetaProviderConfig extends ProviderConfig {
  accessToken: string;
  phoneNumberId: string;
  webhookVerifyToken: string;
  apiVersion?: string;
}

/**
 * Fonnte provider config
 */
export interface FonnteProviderConfig extends ProviderConfig {
  apiKey: string;
  webhookToken?: string;
}

/**
 * Wablas provider config
 */
export interface WablasProviderConfig extends ProviderConfig {
  apiKey: string;
  webhookToken?: string;
}

/**
 * WhatsApp provider interface
 */
export interface IWhatsAppProvider {
  /**
   * Get provider name
   */
  getProviderName(): WhatsAppProvider;

  /**
   * Send message to phone number
   */
  sendMessage(phoneNumber: string, message: string): Promise<SendMessageResult>;

  /**
   * Verify webhook signature
   */
  verifyWebhook(signature: string, payload: string, headers?: Record<string, string>): boolean;

  /**
   * Parse incoming webhook event
   */
  parseWebhookEvent(event: any): ParsedMessage;

  /**
   * Format response for webhook acknowledgement
   */
  formatWebhookResponse(): any;
}

/**
 * Command handler interface
 */
export interface ICommandHandler {
  /**
   * Get command name
   */
  getCommandName(): string;

  /**
   * Validate command
   */
  validate(params: CommandParams): Promise<{ valid: boolean; error?: string }>;

  /**
   * Execute command
   */
  execute(params: CommandParams): Promise<CommandResult>;
}
