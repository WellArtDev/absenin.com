/**
 * HADIR Command Handler
 * Check-in via WhatsApp
 */

import { PrismaClient } from '@prisma/client';
import { CommandParams, CommandResult, ICommandHandler } from '../types';

export class HadirCommand implements ICommandHandler {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  getCommandName(): string {
    return 'HADIR';
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

    // Check if already checked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAttendance = await this.prisma.attendanceRecord.findFirst({
      where: {
        employee_id: params.employeeId,
        checkin_time: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    if (existingAttendance) {
      const checkinTime = new Date(existingAttendance.checkin_time);
      const hours = checkinTime.getHours().toString().padStart(2, '0');
      const minutes = checkinTime.getMinutes().toString().padStart(2, '0');
      return {
        valid: false,
        error: `Anda sudah tercatat HADIR hari ini pada jam ${hours}:${minutes}.`
      };
    }

    return { valid: true };
  }

  async execute(params: CommandParams): Promise<CommandResult> {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');

    try {
      // Create attendance record
      const attendance = await this.prisma.attendanceRecord.create({
        data: {
          tenant_id: params.tenantId,
          employee_id: params.employeeId,
          checkin_time: now,
          verification_type: 'whatsapp',
          status: 'pending'
        }
      });

      return {
        success: true,
        message: `Berhasil hadir jam ${hours}:${minutes}`,
        data: {
          record_id: attendance.record_id,
          checkin_time: now.toISOString()
        }
      };
    } catch (error: any) {
      console.error('HADIR command error:', error);
      return {
        success: false,
        error: 'System error',
        message: 'Maaf, sistem sedang mengalami kendala. Silakan coba beberapa saat lagi.'
      };
    }
  }
}
