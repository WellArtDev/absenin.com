/**
 * WhatsApp Health Controller
 * Provides health check and status endpoints for WhatsApp integration
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/whatsapp/health
 * Health check endpoint for WhatsApp integration
 */
export async function getWhatsAppHealth(_req: Request, res: Response): Promise<void> {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      integration: 'whatsapp',
      providers: {
        meta: await checkProviderHealth('meta'),
        fonnte: await checkProviderHealth('fonnte'),
        wablas: await checkProviderHealth('wablas')
      },
      database: await checkDatabaseHealth()
    };

    // Determine overall health
    const allHealthy = Object.values(health.providers).every(p => p.status !== 'error') &&
                       health.database.status === 'connected';

    res.status(allHealthy ? 200 : 503).json(health);
  } catch (error: any) {
    console.error('WhatsApp health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * GET /api/whatsapp/status
 * Detailed status for WhatsApp integration
 */
export async function getWhatsAppStatus(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.query.tenant as string;

    if (!tenantId) {
      res.status(400).json({
        error: 'Missing tenant_id query parameter'
      });
      return;
    }

    // Get integrations for tenant
    const integrations = await prisma.whatsAppIntegration.findMany({
      where: {
        tenant_id: tenantId,
        is_active: true
      },
      select: {
        integration_id: true,
        provider: true,
        phone_number: true,
        is_active: true,
        created_at: true
      }
    });

    // Get recent events for tenant (last 24 hours)
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    const recentEvents = await prisma.whatsAppEvent.findMany({
      where: {
        tenant_id: tenantId,
        created_at: {
          gte: yesterday
        }
      },
      select: {
        event_id: true,
        provider: true,
        phone_number: true,
        command: true,
        status: true,
        created_at: true
      },
      orderBy: {
        created_at: 'desc'
      },
      take: 100
    });

    // Calculate stats
    const stats = {
      total: recentEvents.length,
      success: recentEvents.filter(e => e.status === 'success').length,
      failed: recentEvents.filter(e => e.status === 'failed').length,
      byProvider: {} as Record<string, { total: number; success: number; failed: number }>
    };

    for (const event of recentEvents) {
      const provider = event.provider;
      if (!stats.byProvider[provider]) {
        stats.byProvider[provider] = { total: 0, success: 0, failed: 0 };
      }
      stats.byProvider[provider].total++;
      if (event.status === 'success') stats.byProvider[provider].success++;
      if (event.status === 'failed') stats.byProvider[provider].failed++;
    }

    res.status(200).json({
      tenant_id: tenantId,
      integrations,
      stats,
      recent_events: recentEvents.slice(0, 10) // Last 10 events
    });
  } catch (error: any) {
    console.error('WhatsApp status error:', error);
    res.status(500).json({
      error: error.message
    });
  }
}

/**
 * Check provider health
 */
async function checkProviderHealth(provider: string): Promise<{
  status: string;
  active: boolean;
  configured: boolean;
}> {
  try {
    const integration = await prisma.whatsAppIntegration.findFirst({
      where: {
        provider,
        is_active: true
      }
    });

    if (!integration) {
      return {
        status: 'not_configured',
        active: false,
        configured: false
      };
    }

    // Check if API key is configured
    const hasApiKey = integration.api_key && integration.api_key !== '{}';

    return {
      status: hasApiKey ? 'available' : 'misconfigured',
      active: integration.is_active,
      configured: hasApiKey
    };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_error) {
    return {
      status: 'error',
      active: false,
      configured: false
    };
  }
}

/**
 * Check database health
 */
async function checkDatabaseHealth(): Promise<{
  status: string;
  latency?: number;
}> {
  const startTime = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - startTime;

    return {
      status: 'connected',
      latency
    };
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  catch (_error) {
    return {
      status: 'disconnected'
    };
  }
}

/**
 * GET /api/whatsapp/providers
 * List all available WhatsApp providers
 */
export async function listProviders(_req: Request, res: Response): Promise<void> {
  try {
    const providers = await prisma.whatsAppIntegration.findMany({
      select: {
        integration_id: true,
        tenant_id: true,
        provider: true,
        phone_number: true,
        is_active: true,
        created_at: true
      }
    });

    res.status(200).json({
      providers,
      count: providers.length
    });
  } catch (error: any) {
    console.error('List providers error:', error);
    res.status(500).json({
      error: error.message
    });
  }
}
