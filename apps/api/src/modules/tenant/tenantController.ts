import { Router, Request, Response } from 'express';
import { getPrisma } from '../../shared/utils/database';
import { Logger } from '../../shared/middleware/logger';
import { AppError } from '../../shared/middleware/errorHandler';

export const tenantRouter: Router = Router();

interface CreateTenantRequest {
  name: string;
  slug: string;
}

// POST /tenant/create
tenantRouter.post('/create', async (req: Request, res: Response) => {
  try {
    const { name, slug }: CreateTenantRequest = req.body;

    if (!name || !slug) {
      throw new AppError('Name and slug are required', 400);
    }

    const prisma = getPrisma();
    const tenant = await prisma.tenant.create({
      data: {
        name,
        slug
      }
    });

    Logger.info('Tenant created', { tenantId: tenant.tenant_id, name });

    return res.json({
      success: true,
      data: tenant
    });

  } catch (error) {
    Logger.error('Create tenant error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Internal server error'
      }
    });
  }
});

// GET /tenant/me
tenantRouter.get('/me', async (req: Request, res: Response) => {
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
    const tenant = await prisma.tenant.findUnique({
      where: { tenant_id: req.tenant.tenant_id },
      select: {
        tenant_id: true,
        name: true,
        slug: true,
        subscriptions: true,
        created_at: true
      }
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: {
          type: 'NOT_FOUND',
          message: 'Tenant not found'
        }
      });
    }

    Logger.info('Get tenant details', { tenantId: tenant.tenant_id });

    return res.json({
      success: true,
      data: tenant
    });

  } catch (error) {
    Logger.error('Get tenant error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Internal server error'
      }
    });
  }
});

// PATCH /tenant/update
tenantRouter.patch('/update', async (req: Request, res: Response) => {
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

    const updates = req.body;
    const prisma = getPrisma();
    const tenant = await prisma.tenant.update({
      where: { tenant_id: req.tenant.tenant_id },
      data: updates
    });

    Logger.info('Tenant updated', { tenantId: tenant.tenant_id });

    return res.json({
      success: true,
      data: tenant
    });

  } catch (error) {
    Logger.error('Update tenant error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Internal server error'
      }
    });
  }
});

export default tenantRouter;
