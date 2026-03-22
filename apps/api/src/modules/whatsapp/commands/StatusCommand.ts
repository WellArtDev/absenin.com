/**
 * STATUS Command Handler
 * Check attendance status via WhatsApp
 */

import { PrismaClient } from '@prisma/client';
import { CommandParams, CommandResult, ICommandHandler } from '../types';

export class StatusCommand implements ICommandHandler {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  getCommandName(): string {
    return 'STATUS';
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

    return { valid: true };
  }

  async execute(params: CommandParams): Promise<CommandResult> {
    try {
      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Find today's attendance
      const attendance = await this.prisma.attendanceRecord.findFirst({
        where: {
          employee_id: params.employeeId,
          checkin_time: {
            gte: today,
            lt: tomorrow
          }
        }
      });

      const currentHours = now.getHours().toString().padStart(2, '0');
      const currentMinutes = now.getMinutes().toString().padStart(2, '0');

      if (!attendance) {
        return {
          success: true,
          message: `Anda belum check-in hari ini.\n\nJam sekarang: ${currentHours}:${currentMinutes}`
        };
      }

      // Has checked in
      const checkinTime = new Date(attendance.checkin_time);
      const checkinHours = checkinTime.getHours().toString().padStart(2, '0');
      const checkinMinutes = checkinTime.getMinutes().toString().padStart(2, '0');

      if (!attendance.checkout_time) {
        // Currently working
        const durationMs = now.getTime() - checkinTime.getTime();
        const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
        const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

        return {
          success: true,
          message: `Anda sedang bekerja.\n\nCheck-in: ${checkinHours}:${checkinMinutes}\nDurasi: ${durationHours} jam ${durationMinutes} menit\nJam sekarang: ${currentHours}:${currentMinutes}`
        };
      }

      // Already checked out
      const checkoutTime = new Date(attendance.checkout_time);
      const checkoutHours = checkoutTime.getHours().toString().padStart(2, '0');
      const checkoutMinutes = checkoutTime.getMinutes().toString().padStart(2, '0');

      const durationMs = checkoutTime.getTime() - checkinTime.getTime();
      const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
      const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

      return {
        success: true,
        message: `Anda sudah selesai bekerja hari ini.\n\nCheck-in: ${checkinHours}:${checkinMinutes}\nCheck-out: ${checkoutHours}:${checkoutMinutes}\nDurasi: ${durationHours} jam ${durationMinutes} menit`
      };
    } catch (error: any) {
      console.error('STATUS command error:', error);
      return {
        success: false,
        error: 'System error',
        message: 'Maaf, sistem sedang mengalami kendala. Silakan coba beberapa saat lagi.'
      };
    }
  }
}
