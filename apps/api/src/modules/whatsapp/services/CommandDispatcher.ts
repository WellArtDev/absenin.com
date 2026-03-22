/**
 * WhatsApp Command Dispatcher
 * Routes incoming commands to appropriate handlers
 */

import { PrismaClient } from '@prisma/client';
import { CommandParams, CommandResult, ParsedMessage } from '../types';
import { HadirCommand } from '../commands/HadirCommand';
import { PulangCommand } from '../commands/PulangCommand';
import { StatusCommand } from '../commands/StatusCommand';

export class CommandDispatcher {
  private prisma: PrismaClient;
  private handlers: Map<string, any>;

  constructor() {
    this.prisma = new PrismaClient();
    this.handlers = new Map();
    this.registerHandlers();
  }

  private registerHandlers() {
    this.handlers.set('HADIR', new HadirCommand());
    this.handlers.set('PULANG', new PulangCommand());
    this.handlers.set('STATUS', new StatusCommand());
  }

  /**
   * Process incoming WhatsApp message
   */
  async processMessage(message: ParsedMessage): Promise<CommandResult> {
    try {
      // Extract employee from phone number
      const employee = await this.getEmployeeByPhone(message.phoneNumber, message.metadata);

      if (!employee) {
        return {
          success: false,
          message: 'Nomor WhatsApp Anda belum terdaftar di sistem Absenin. Silakan hubungi admin perusahaan.',
          error: 'Employee not found'
        };
      }

      if (!employee.is_active) {
        return {
          success: false,
          message: 'Akun karyawan Anda sedang tidak aktif. Silakan hubungi HR/Admin untuk aktivasi.',
          error: 'Employee inactive'
        };
      }

      // Parse command
      const command = this.parseCommand(message.content);

      if (!command) {
        return this.getHelpMessage();
      }

      // Get handler
      const handler = this.handlers.get(command);
      if (!handler) {
        return this.getHelpMessage();
      }

      // Check idempotency (prevent duplicate processing)
      const idempotencyCheck = await this.checkIdempotency(
        employee.tenant_id,
        message.provider,
        message.messageId,
        command
      );

      if (idempotencyCheck.exists) {
        // Return previous response (duplicate message)
        return {
          success: true,
          message: idempotencyCheck.previousResponse || 'Perintah Anda sudah kami terima sebelumnya. Tidak perlu kirim ulang 🙏',
          data: { idempotent: true }
        };
      }

      // Build command parameters
      const params: CommandParams = {
        tenantId: employee.tenant_id,
        employeeId: employee.employee_id,
        phoneNumber: message.phoneNumber,
        command,
        messageId: message.messageId,
        provider: message.provider,
        metadata: message.metadata
      };

      // Validate command
      const validation = await handler.validate(params);
      if (!validation.valid) {
        return {
          success: false,
          message: validation.error || 'Command validation failed',
          error: validation.error
        };
      }

      // Execute command
      const result = await handler.execute(params);

      // Log event
      await this.logEvent(message, params, result);

      return result;
    } catch (error: any) {
      console.error('Command dispatch error:', error);
      return {
        success: false,
        message: 'Maaf, sistem sedang mengalami kendala. Silakan coba beberapa saat lagi.',
        error: error.message
      };
    }
  }

  /**
   * Get employee by WhatsApp phone number
   */
  private async getEmployeeByPhone(
    phoneNumber: string,
    _metadata: Record<string, any>
  ): Promise<any> {
    // Format phone number (try with and without country code)
    const formattedPhone = phoneNumber.replace(/^\+/, '');
    const phoneWithCountry = `62${formattedPhone.replace(/^62/, '')}`;

    // Try exact match first
    let employee = await this.prisma.employee.findFirst({
      where: {
        whatsapp_phone: formattedPhone
      },
      include: {
        tenant: true
      }
    });

    // Try with country code
    if (!employee) {
      employee = await this.prisma.employee.findFirst({
        where: {
          whatsapp_phone: phoneWithCountry
        },
        include: {
          tenant: true
        }
      });
    }

    return employee;
  }

  /**
   * Parse command from message content
   */
  private parseCommand(content: string): string | null {
    const command = content.trim().toUpperCase();

    // Valid commands
    const validCommands = ['HADIR', 'PULANG', 'STATUS', 'LEMBUR', 'SELESAI LEMBUR'];

    if (validCommands.includes(command)) {
      return command;
    }

    return null;
  }

  /**
   * Check idempotency to prevent duplicate processing
   * Scoped to: tenant_id + provider + message_id
   */
  private async checkIdempotency(
    tenantId: string,
    provider: string,
    messageId: string,
    _command: string
  ): Promise<{ exists: boolean; previousResponse?: string }> {
    const existingEvent = await this.prisma.whatsAppEvent.findUnique({
      where: {
        tenant_id_provider_message_id: {
          tenant_id: tenantId,
          provider: provider,
          message_id: messageId
        }
      },
      select: { response_text: true, status: true }
    });

    if (existingEvent && existingEvent.status === 'success') {
      return {
        exists: true,
        previousResponse: existingEvent.response_text || undefined
      };
    }

    return { exists: false };
  }

  /**
   * Log WhatsApp event to database
   */
  private async logEvent(
    message: ParsedMessage,
    params: CommandParams,
    result: CommandResult
  ): Promise<void> {
    try {
      await this.prisma.whatsAppEvent.create({
        data: {
          tenant_id: params.tenantId,
          provider: params.provider,
          phone_number: params.phoneNumber,
          message_id: params.messageId,
          command: params.command,
          request_payload: message.metadata as any,
          response_text: result.message,
          status: result.success ? 'success' : 'failed',
          error_message: result.error,
          processed_at: new Date()
        }
      });
    } catch (error) {
      // Log error but don't fail the command
      console.error('Failed to log WhatsApp event:', error);
    }
  }

  /**
   * Get help message for unknown commands
   */
  private getHelpMessage(): CommandResult {
    return {
      success: false,
      message: `Perintah tidak dikenali. Gunakan: HADIR, PULANG, STATUS, LEMBUR, atau SELESAI LEMBUR.

• HADIR - Check-in (absen masuk)
• PULANG - Check-out (absen pulang)
• STATUS - Cek status kehadiran
• LEMBUR - Mulai lembur
• SELESAI LEMBUR - Selesai lembur`
    };
  }
}
