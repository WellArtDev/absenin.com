import { Router, Request, Response } from 'express';
import { getPrisma } from '../../shared/utils/database';
import { Logger } from '../../shared/middleware/logger';
import { AppError } from '../../shared/middleware/errorHandler';

export const divisionRouter: Router = Router();

// GET /divisions - Get all divisions for a tenant
divisionRouter.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.tenant) {
      throw new AppError('Tenant not specified', 400);
    }

    const prisma = getPrisma();

    const divisions = await prisma.division.findMany({
      where: {
        tenant_id: req.tenant.tenant_id
      },
      select: {
        division_id: true,
        tenant_id: true,
        name: true,
        parent_division_id: true,
        created_at: true,
        parent_division: {
          select: {
            division_id: true,
            name: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    Logger.info('Get divisions list', { count: divisions.length });

    return res.json({
      success: true,
      data: divisions
    });

  } catch (error: any) {
    if (error instanceof AppError) {
      Logger.warn('Get divisions failed', { error: error.message });
      return res.status(error.statusCode).json({
        success: false,
        error: {
          type: error.type,
          message: error.message
        }
      });
    }

    Logger.error('Get divisions error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Internal server error'
      }
    });
  }
});

export default divisionRouter;
