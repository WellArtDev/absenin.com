import { Router, Request, Response } from 'express';
import { getPrisma } from '../../shared/utils/database';
import { Logger } from '../../shared/middleware/logger';
import { AppError } from '../../shared/middleware/errorHandler';
import { WhatsAppProvider } from '@absenin/config';

export const notificationRouter: Router = Router();

// WhatsApp provider interface
interface WhatsAppMessage {
  to: string;
  template: string;
  variables?: Record<string, unknown>;
  provider?: 'meta' | 'wablas' | 'fonnte';
}

interface WhatsAppConfig {
  meta?: { access_token: string; phone_number_id: string };
  wablas?: { token: string };
  fonnte?: { token: string };
}

// POST /notifications/send
notificationRouter.post('/send', async (req: Request, res: Response) => {
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

    const { to, template, variables: _variables, provider }: WhatsAppMessage = req.body;

    if (!to || !template) {
      throw new AppError('Phone number and template are required', 400);
    }

    const prisma = getPrisma();

    // Get tenant settings
    const settings = await prisma.companySettings.findUnique({
      where: { tenant_id: req.tenant.tenant_id }
    });

    if (!settings) {
      return res.status(404).json({
        success: false,
        error: {
          type: 'NOT_FOUND',
          message: 'Company settings not found'
        }
      });
    }

    // Determine provider (from request or fallback to tenant setting)
    const selectedProvider = provider || settings.whatsapp_provider || WhatsAppProvider.META;

    // Get provider config
    const _providerConfig: WhatsAppConfig = (settings.whatsapp_config as any) || {};

    // TODO: Implement actual WhatsApp sending
    // This is a placeholder for MVP - actual provider implementations will come later

    Logger.info('WhatsApp notification queued', {
      tenantId: req.tenant.tenant_id,
      provider: selectedProvider,
      to,
      template
    });

    return res.json({
      success: true,
      message: 'Notification queued successfully',
      data: {
        provider: selectedProvider,
        status: 'queued'
      }
    });

  } catch (error) {
    Logger.error('Send notification error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Internal server error'
      }
    });
  }
});

// GET /notifications/providers
notificationRouter.get('/providers', async (req: Request, res: Response) => {
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
    const settings = await prisma.companySettings.findUnique({
      where: { tenant_id: req.tenant.tenant_id }
    });

    const providers = [
      {
        provider: WhatsAppProvider.META,
        name: 'Official Meta WhatsApp',
        is_active: settings?.whatsapp_provider === 'meta',
        config: {
          access_token: 'configured' in (settings?.whatsapp_config as any)
        }
      },
      {
        provider: WhatsAppProvider.WABLAS,
        name: 'Wablas',
        is_active: settings?.whatsapp_provider === 'wablas',
        config: {
          token: 'configured' in (settings?.whatsapp_config as any)
        }
      },
      {
        provider: WhatsAppProvider.FONNTE,
        name: 'Fonnte',
        is_active: settings?.whatsapp_provider === 'fonnte',
        config: {
          token: 'configured' in (settings?.whatsapp_config as any)
        }
      }
    ];

    Logger.info('Get WhatsApp providers', { tenantId: req.tenant.tenant_id, providerCount: providers.length });

    return res.json({
      success: true,
      data: providers
    });

  } catch (error) {
    Logger.error('Get providers error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Internal server error'
      }
    });
  }
});

// POST /notifications/test
notificationRouter.post('/test', async (req: Request, res: Response) => {
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

    const { provider, to: _to }: { provider?: string; to?: string } = req.body;

    if (!provider) {
      throw new AppError('Provider is required', 400);
    }

    const prisma = getPrisma();
    const _settings = await prisma.companySettings.findUnique({
      where: { tenant_id: req.tenant.tenant_id }
    });

    // TODO: Implement actual provider testing
    Logger.info('Test WhatsApp provider', {
      tenantId: req.tenant.tenant_id,
      provider
    });

    return res.json({
      success: true,
      message: 'Provider test initiated',
      data: {
        provider,
        status: 'testing'
      }
    });

  } catch (error) {
    Logger.error('Test provider error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Internal server error'
      }
    });
  }
});

// POST /notifications/configure
notificationRouter.post('/configure', async (req: Request, res: Response) => {
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

    const { provider, config }: { provider: string; config: WhatsAppConfig } = req.body;

    if (!provider) {
      throw new AppError('Provider is required', 400);
    }

    if (!config) {
      throw new AppError('Config is required', 400);
    }

    const prisma = getPrisma();

    // Update company settings with new WhatsApp config
    const updatedSettings = await prisma.companySettings.update({
      where: { tenant_id: req.tenant.tenant_id },
      data: {
        whatsapp_provider: provider,
        whatsapp_config: config as any
      }
    });

    Logger.info('WhatsApp provider configured', {
      tenantId: req.tenant.tenant_id,
      provider
    });

    return res.json({
      success: true,
      data: updatedSettings
    });

  } catch (error) {
    Logger.error('Configure WhatsApp provider error', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: 'Internal server error'
      }
    });
  }
});

export default notificationRouter;
