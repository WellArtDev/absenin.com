import { Router, Request, Response } from 'express';
import { getPrisma } from '../../shared/utils/database';
import { Logger } from '../../shared/middleware/logger';

export const reportRouter: Router = Router();

interface ReportQuery {
  employee_id?: string;
  start_date?: string;
  end_date?: string;
  verification_type?: string;
  status?: string;
  page?: string;
  limit?: string;
}

// GET /reports/summary
reportRouter.get('/summary', async (req: Request, res: Response) => {
  try {
    if (!req.tenant) {
      return res.json({
        success: false,
        error: {
          type: 'BAD_REQUEST',
          message: 'Tenant not specified'
        }
      });
    }

    const prisma = getPrisma();
    const { start_date, end_date } = req.query;

    const where: any = {
      tenant_id: req.tenant.tenant_id
    };

    if (start_date) {
      where.checkin_time = {
        gte: new Date(String(start_date))
      };
    }

    if (end_date) {
      where.checkin_time = {
        lte: new Date(String(end_date))
      };
    }

    const records = await prisma.attendanceRecord.findMany({
      where,
      include: {
        employee: true
      }
    });

    // Calculate summary
    const summary = {
      total: records.length,
      present: records.filter(r => r.status === 'approved').length,
      pending: records.filter(r => r.status === 'pending').length,
      rejected: records.filter(r => r.status === 'rejected').length,
      by_verification_type: records.reduce((acc, record) => {
        const type = record.verification_type;
        if (!acc[type]) {
          acc[type] = { total: 0, approved: 0, pending: 0, rejected: 0 };
        }
        acc[type].total++;
        if (record.status === 'approved') acc[type].approved++;
        if (record.status === 'pending') acc[type].pending++;
        if (record.status === 'rejected') acc[type].rejected++;
        return acc;
      }, {} as Record<string, any>)
    };

    Logger.info('Get attendance summary', { totalRecords: records.length });

    return res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    Logger.error('Get summary error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Internal server error'
      }
    });
  }
});

// GET /reports/daily
reportRouter.get('/daily', async (req: Request, res: Response) => {
  try {
    if (!req.tenant) {
      return res.json({
        success: false,
        error: {
          type: 'BAD_REQUEST',
          message: 'Tenant not specified'
        }
      });
    }

    const query: ReportQuery = req.query;
    const prisma = getPrisma();

    const where: any = {
      tenant_id: req.tenant.tenant_id,
      checkin_time: {
        gte: new Date(query.start_date || '2025-01-01'),
        lte: new Date(query.end_date || '2025-12-31')
      }
    };

    if (query.employee_id) {
      where.employee_id = query.employee_id;
    }

    const records = await prisma.attendanceRecord.findMany({
      where,
      include: {
        employee: true
      },
      orderBy: { checkin_time: 'desc' }
    });

    Logger.info('Get daily report', { count: records.length });

    return res.json({
      success: true,
      data: records
    });

  } catch (error) {
    Logger.error('Get daily report error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Internal server error'
      }
    });
  }
});

// GET /reports/export
reportRouter.get('/export', async (req: Request, res: Response) => {
  try {
    if (!req.tenant) {
      return res.json({
        success: false,
        error: {
          type: 'BAD_REQUEST',
          message: 'Tenant not specified'
        }
      });
    }

    const query: any = req.query;
    const format = ((query.format as string) || 'csv').toLowerCase();

    const prisma = getPrisma();
    const records = await prisma.attendanceRecord.findMany({
      where: {
        tenant_id: req.tenant.tenant_id,
        ...query.start_date && { checkin_time: { gte: new Date(query.start_date) } },
        ...query.end_date && { checkin_time: { lte: new Date(query.end_date) } }
      },
      include: {
        employee: true
      },
      orderBy: { checkin_time: 'desc' }
    });

    if (format === 'csv') {
      // CSV Export
      const headers = 'Employee ID,Full Name,Check-in Time,Check-out Time,Status,Verification Type';
      const rows = records.map(r =>
        `${r.employee_id},${r.employee?.full_name},${r.checkin_time},${r.checkout_time || ''},${r.status},${r.verification_type}`
      );

      const csv = [headers, ...rows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=attendance_report_${Date.now()}.csv`);

      return res.send(csv);
    } else {
      return res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION',
          message: 'Unsupported format. Use csv'
        }
      });
    }

  } catch (error) {
    Logger.error('Export report error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Internal server error'
      }
    });
  }
});

export default reportRouter;
