/**
 * PULANG Command Handler
 * Check-out via WhatsApp
 */

import { PrismaClient } from '@prisma/client';
import { CommandParams, CommandResult, ICommandHandler } from '../types';

export class PulangCommand implements ICommandHandler {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  getCommandName(): string {
    return 'PULANG';
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

    // Check if checked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await this.prisma.attendanceRecord.findFirst({
      where: {
        employee_id: params.employeeId,
        checkin_time: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    if (!attendance) {
      return {
        valid: false,
        error: 'Anda belum melakukan HADIR hari ini, jadi belum bisa PULANG.'
      };
    }

    if (attendance.checkout_time) {
      const checkoutTime = new Date(attendance.checkout_time);
      const hours = checkoutTime.getHours().toString().padStart(2, '0');
      const minutes = checkoutTime.getMinutes().toString().padStart(2, '0');
      return {
        valid: false,
        error: `Anda sudah tercatat PULANG hari ini pada jam ${hours}:${minutes}.`
      };
    }

    return { valid: true };
  }

  async execute(params: CommandParams): Promise<CommandResult> {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');

    try {
      // Get today's attendance record
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const attendance = await this.prisma.attendanceRecord.findFirst({
        where: {
          employee_id: params.employeeId,
          checkin_time: {
            gte: today,
            lt: tomorrow
          }
        }
      });

      if (!attendance) {
        return {
          success: false,
          error: 'Attendance record not found',
          message: 'Anda belum melakukan HADIR hari ini, jadi belum bisa PULANG.'
        };
      }

      // Calculate work duration
      const checkinTime = new Date(attendance.checkin_time);
      const durationMs = now.getTime() - checkinTime.getTime();
      const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
      const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

      // Update checkout time
      const updated = await this.prisma.attendanceRecord.update({
        where: { record_id: attendance.record_id },
        data: {
          checkout_time: now
        }
      });

      return {
        success: true,
        message: `Berhasil pulang jam ${hours}:${minutes}\n\nDurasi kerja: ${durationHours} jam ${durationMinutes} menit`,
        data: {
          record_id: updated.record_id,
          checkout_time: now.toISOString(),
          duration_hours: durationHours,
          duration_minutes: durationMinutes
        }
      };
    } catch (error: any) {
      console.error('PULANG command error:', error);
      return {
        success: false,
        error: 'System error',
        message: 'Maaf, sistem sedang mengalami kendala. Silakan coba beberapa saat lagi.'
      };
    }
  }
}
