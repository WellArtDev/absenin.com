import { Router, Request, Response } from 'express';
import { getPrisma } from '../../shared/utils/database';
import { Logger } from '../../shared/middleware/logger';
import { AppError } from '../../shared/middleware/errorHandler';

export const companySettingsRouter: Router = Router();

interface CompanySettingsRequest {
  company_name?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  working_days?: string[];
  work_start_time?: string;
  work_end_time?: string;
  late_tolerance_minutes?: number;
  default_geofence_radius_meters?: number;
}

// GET /settings/company - Get company settings
companySettingsRouter.get('/company', async (req: Request, res: Response) => {
  try {
    if (!req.tenant) {
      throw new AppError('Tenant not specified', 400);
    }

    const prisma = getPrisma();

    let settings = await prisma.companySettings.findUnique({
      where: {
        tenant_id: req.tenant.tenant_id
      }
    });

    // Create default settings if not exists
    if (!settings) {
      settings = await prisma.companySettings.create({
        data: {
          tenant_id: req.tenant.tenant_id,
          work_start_time: '08:00',
          work_end_time: '17:00',
          late_tolerance_minutes: 15,
          default_geofence_radius_meters: 100
        }
      });
    }

    // Extract company info from whatsapp_config if available
    const whatsappConfig = settings.whatsapp_config as any;
    const response = {
      ...settings,
      company_name: whatsappConfig?.company_name || '',
      company_address: whatsappConfig?.company_address || '',
      company_phone: whatsappConfig?.company_phone || '',
      company_email: whatsappConfig?.company_email || '',
      working_days: whatsappConfig?.working_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      working_hours_start: settings.work_start_time,
      working_hours_end: settings.work_end_time
    };

    return res.json({
      success: true,
      data: response
    });

  } catch (error: any) {
    if (error instanceof AppError) {
      Logger.warn('Get company settings failed', { error: error.message });
      return res.status(error.statusCode).json({
        success: false,
        error: {
          type: error.type,
          message: error.message
        }
      });
    }

    Logger.error('Get company settings error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Internal server error'
      }
    });
  }
});

// POST /settings/company - Create company settings
companySettingsRouter.post('/company', async (req: Request, res: Response) => {
  try {
    if (!req.tenant) {
      throw new AppError('Tenant not specified', 400);
    }

    const data: CompanySettingsRequest = req.body;

    const prisma = getPrisma();

    // Check if settings already exist
    const existing = await prisma.companySettings.findUnique({
      where: {
        tenant_id: req.tenant.tenant_id
      }
    });

    if (existing) {
      throw new AppError('Company settings already exist. Use PATCH to update.', 409);
    }

    // Store company info in whatsapp_config
    const whatsappConfig = {
      company_name: data.company_name || '',
      company_address: data.company_address || '',
      company_phone: data.company_phone || '',
      company_email: data.company_email || '',
      working_days: data.working_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    };

    const settings = await prisma.companySettings.create({
      data: {
        tenant_id: req.tenant.tenant_id,
        work_start_time: data.work_start_time || '08:00',
        work_end_time: data.work_end_time || '17:00',
        late_tolerance_minutes: data.late_tolerance_minutes || 15,
        default_geofence_radius_meters: data.default_geofence_radius_meters || 100,
        whatsapp_config: whatsappConfig
      }
    });

    const response = {
      ...settings,
      company_name: whatsappConfig.company_name,
      company_address: whatsappConfig.company_address,
      company_phone: whatsappConfig.company_phone,
      company_email: whatsappConfig.company_email,
      working_days: whatsappConfig.working_days,
      working_hours_start: settings.work_start_time,
      working_hours_end: settings.work_end_time
    };

    Logger.info('Company settings created', { tenantId: req.tenant.tenant_id });

    return res.status(201).json({
      success: true,
      data: response
    });

  } catch (error: any) {
    if (error instanceof AppError) {
      Logger.warn('Create company settings failed', { error: error.message });
      return res.status(error.statusCode).json({
        success: false,
        error: {
          type: error.type,
          message: error.message
        }
      });
    }

    Logger.error('Create company settings error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Internal server error'
      }
    });
  }
});

// PATCH /settings/company - Update company settings
companySettingsRouter.patch('/company', async (req: Request, res: Response) => {
  try {
    if (!req.tenant) {
      throw new AppError('Tenant not specified', 400);
    }

    const data: CompanySettingsRequest = req.body;

    const prisma = getPrisma();

    // Check if settings exist
    const existing = await prisma.companySettings.findUnique({
      where: {
        tenant_id: req.tenant.tenant_id
      }
    });

    if (!existing) {
      throw new AppError('Company settings not found. Use POST to create.', 404);
    }

    // Merge existing whatsapp_config with new company info
    const existingConfig = existing.whatsapp_config as any || {};
    const whatsappConfig = {
      ...existingConfig,
      company_name: data.company_name !== undefined ? data.company_name : existingConfig.company_name,
      company_address: data.company_address !== undefined ? data.company_address : existingConfig.company_address,
      company_phone: data.company_phone !== undefined ? data.company_phone : existingConfig.company_phone,
      company_email: data.company_email !== undefined ? data.company_email : existingConfig.company_email,
      working_days: data.working_days !== undefined ? data.working_days : existingConfig.working_days
    };

    const settings = await prisma.companySettings.update({
      where: {
        tenant_id: req.tenant.tenant_id
      },
      data: {
        work_start_time: data.work_start_time,
        work_end_time: data.work_end_time,
        late_tolerance_minutes: data.late_tolerance_minutes,
        default_geofence_radius_meters: data.default_geofence_radius_meters,
        whatsapp_config: whatsappConfig
      }
    });

    const response = {
      ...settings,
      company_name: whatsappConfig.company_name || '',
      company_address: whatsappConfig.company_address || '',
      company_phone: whatsappConfig.company_phone || '',
      company_email: whatsappConfig.company_email || '',
      working_days: whatsappConfig.working_days || [],
      working_hours_start: settings.work_start_time,
      working_hours_end: settings.work_end_time
    };

    Logger.info('Company settings updated', { tenantId: req.tenant.tenant_id });

    return res.json({
      success: true,
      data: response
    });

  } catch (error: any) {
    if (error instanceof AppError) {
      Logger.warn('Update company settings failed', { error: error.message });
      return res.status(error.statusCode).json({
        success: false,
        error: {
          type: error.type,
          message: error.message
        }
      });
    }

    Logger.error('Update company settings error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Internal server error'
      }
    });
  }
});

export default companySettingsRouter;
