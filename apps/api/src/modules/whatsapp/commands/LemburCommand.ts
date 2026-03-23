/**
 * LEMBUR Command Handler
 * Start overtime via WhatsApp
 */

import { PrismaClient } from '@prisma/client';
import { CommandParams, CommandResult, ICommandHandler } from '../types';

export class LemburCommand implements ICommandHandler {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  getCommandName(): string {
    return 'LEMBUR';
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
        error: 'Anda belum melakukan HADIR hari ini, jadi belum bisa LEMBUR.'
      };
    }

    // Check if already checked out
    if (!attendance.checkout_time) {
      return {
        valid: false,
        error: 'Anda belum melakukan PULANG hari ini, jadi belum bisa LEMBUR.'
      };
    }

    // Check if already on overtime today
    const existingOvertime = await this.prisma.overtimeRecord.findFirst({
      where: {
        employee_id: params.employeeId,
        start_time: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    if (existingOvertime) {
      const startTime = new Date(existingOvertime.start_time);
      const hours = startTime.getHours().toString().padStart(2, '0');
      const minutes = startTime.getMinutes().toString().padStart(2, '0');

      if (!existingOvertime.end_time) {
        return {
          valid: false,
          error: `Anda sedang dalam status LEMBUR sejak jam ${hours}:${minutes}. Ketik "SELESAI LEMBUR" untuk mengakhiri lembur.`
        };
      } else {
        return {
          valid: false,
          error: `Anda sudah selesai LEMBUR hari ini sejak jam ${hours}:${minutes}.`
        };
      }
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
          message: 'Anda belum melakukan HADIR hari ini, jadi belum bisa LEMBUR.'
        };
      }

      // Create overtime record
      const overtime = await this.prisma.overtimeRecord.create({
        data: {
          tenant_id: params.tenantId,
          employee_id: params.employeeId,
          attendance_record_id: attendance.record_id,
          start_time: now,
          status: 'pending'
        }
      });

      return {
        success: true,
        message: `Berhasil mulai LEMBUR jam ${hours}:${minutes}\n\nKetik "SELESAI LEMBUR" untuk mengakhiri lembur.`,
        data: {
          overtime_id: overtime.overtime_id,
          start_time: now.toISOString()
        }
      };
    } catch (error: any) {
      console.error('LEMBUR command error:', error);
      return {
        success: false,
        error: 'System error',
        message: 'Maaf, sistem sedang mengalami kendala. Silakan coba beberapa saat lagi.'
      };
    }
  }
}
