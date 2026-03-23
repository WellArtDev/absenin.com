/**
 * SELESAI LEMBUR Command Handler
 * End overtime via WhatsApp
 */

import { PrismaClient } from '@prisma/client';
import { CommandParams, CommandResult, ICommandHandler } from '../types';

export class SelesaiLemburCommand implements ICommandHandler {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  getCommandName(): string {
    return 'SELESAI_LEMBUR';
  }

  async validate(params: CommandParams): Promise<{ valid: boolean; error?: string }> {
    // Check if employee exists and is active
    const employee = await this.prisma.employee.findUnique({
      where: { employee_id: params.employeeId }
    });

    if (!employee) {
      return { valid: false, error: 'Data karyawan tidak ditemukan. Silakan hubungi admin.' };
    }

    if (!employee.is_active) {
      return { valid: false, error: 'Akun karyawan Anda sedang tidak aktif. Silakan hubungi HR/Admin untuk aktivasi.' };
    }

    // Check if has active overtime today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const overtime = await this.prisma.overtimeRecord.findFirst({
      where: {
        employee_id: params.employeeId,
        start_time: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    if (!overtime) {
      return {
        valid: false,
        error: 'Anda belum melakukan LEMBUR hari ini. Ketik "LEMBUR" untuk memulai lembur.'
      };
    }

    if (overtime.end_time) {
      const endTime = new Date(overtime.end_time);
      const hours = endTime.getHours().toString().padStart(2, '0');
      const minutes = endTime.getMinutes().toString().padStart(2, '0');
      return {
        valid: false,
        error: `Anda sudah selesai LEMBUR hari ini pada jam ${hours}:${minutes}.`
      };
    }

    return { valid: true };
  }

  async execute(params: CommandParams): Promise<CommandResult> {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');

    try {
      // Get today's active overtime record
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const overtime = await this.prisma.overtimeRecord.findFirst({
        where: {
          employee_id: params.employeeId,
          start_time: {
            gte: today,
            lt: tomorrow
          }
        }
      });

      if (!overtime) {
        return {
          success: false,
          error: 'Overtime record not found',
          message: 'Anda belum melakukan LEMBUR hari ini. Ketik "LEMBUR" untuk memulai lembur.'
        };
      }

      // Calculate overtime duration
      const startTime = new Date(overtime.start_time);
      const durationMs = now.getTime() - startTime.getTime();
      const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
      const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

      // Update overtime record with end time
      const updated = await this.prisma.overtimeRecord.update({
        where: { overtime_id: overtime.overtime_id },
        data: {
          end_time: now
        }
      });

      return {
        success: true,
        message: `Berhasil selesai LEMBUR jam ${hours}:${minutes}\n\nDurasi lembur: ${durationHours} jam ${durationMinutes} menit\n\nTerima kasih atas kerja keras Anda!`,
        data: {
          overtime_id: updated.overtime_id,
          end_time: now.toISOString(),
          duration_hours: durationHours,
          duration_minutes: durationMinutes
        }
      };
    } catch (error: any) {
      console.error('SELESAI LEMBUR command error:', error);
      return {
        success: false,
        error: 'System error',
        message: 'Maaf, sistem sedang mengalami kendala. Silakan coba beberapa saat lagi.'
      };
    }
  }
}
