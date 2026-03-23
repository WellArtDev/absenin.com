import { Router, Request, Response } from 'express';
import { getPrisma } from '../../shared/utils/database';
import { Logger } from '../../shared/middleware/logger';
import { AppError } from '../../shared/middleware/errorHandler';

export const positionRouter: Router = Router();

// GET /positions - Get all positions for a tenant
positionRouter.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.tenant) {
      throw new AppError('Tenant not specified', 400);
    }

    const { division_id } = req.query;

    const prisma = getPrisma();

    const where: any = {
      tenant_id: req.tenant.tenant_id
    };

    if (division_id) {
      where.division_id = division_id as string;
    }

    const positions = await prisma.position.findMany({
      where,
      select: {
        position_id: true,
        tenant_id: true,
        division_id: true,
        name: true,
        created_at: true,
        division: {
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

    Logger.info('Get positions list', { count: positions.length });

    return res.json({
      success: true,
      data: positions
    });

  } catch (error: any) {
    if (error instanceof AppError) {
      Logger.warn('Get positions failed', { error: error.message });
      return res.status(error.statusCode).json({
        success: false,
        error: {
          type: error.type,
          message: error.message
        }
      });
    }

    Logger.error('Get positions error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Internal server error'
      }
    });
  }
});

export default positionRouter;
