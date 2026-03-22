/**
 * WhatsApp Webhook Controller
 * Handles webhook endpoints for all WhatsApp providers
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { MetaProviderAdapter, verifyMetaWebhookChallenge } from './adapters/MetaProviderAdapter';
import { FonnteProviderAdapter } from './adapters/FonnteProviderAdapter';
import { CommandDispatcher } from './services/CommandDispatcher';
import { WhatsAppProvider, MetaProviderConfig, FonnteProviderConfig } from './types';

const prisma = new PrismaClient();

/**
 * GET /api/webhook/whatsapp/meta
 * Verify webhook for Meta (setup challenge)
 */
export async function verifyMetaWebhook(req: Request, res: Response): Promise<void> {
  try {
    const mode = req.query['hub.mode'] as string;
    const token = req.query['hub.verify_token'] as string;
    const challenge = req.query['hub.challenge'] as string;

    // Get verify token from environment or integration
    const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN || '';

    const result = verifyMetaWebhookChallenge(mode, token, challenge, verifyToken);

    if (result.valid && result.challenge) {
      res.status(200).send(result.challenge);
      return;
    }

    res.status(403).json({ error: 'Verification failed' });
  } catch (error: any) {
    console.error('Meta webhook verification error:', error);
    res.status(500).json({ error: 'Verification error' });
  }
}

/**
 * POST /api/webhook/whatsapp/meta
 * Handle incoming webhook from Meta
 */
export async function handleMetaWebhook(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();

  try {
    // Get raw payload for signature verification
    const rawPayload = JSON.stringify(req.body);
    const signature = req.headers['x-hub-signature-256'] as string;

    if (!signature) {
      res.status(401).json({ error: 'Missing signature' });
      return;
    }

    // Load Meta integration config
    const integration = await loadIntegrationConfig(WhatsAppProvider.META);
    if (!integration) {
      console.error('Meta WhatsApp integration not found');
      res.status(200).send('OK'); // Acknowledge webhook even if no config
      return;
    }

    // Verify webhook signature
    const config: MetaProviderConfig = JSON.parse(integration.api_key || '{}');
    const adapter = new MetaProviderAdapter(config);

    const isValid = adapter.verifyWebhook(signature, rawPayload);
    if (!isValid) {
      res.status(403).json({ error: 'Invalid signature' });
      return;
    }

    // Parse webhook event
    const parsedMessage = adapter.parseWebhookEvent(req.body);

    // Dispatch command
    const dispatcher = new CommandDispatcher();
    const result = await dispatcher.processMessage(parsedMessage);

    // Send response back via WhatsApp (if needed)
    if (result.success && result.message) {
      try {
        await adapter.sendMessage(parsedMessage.phoneNumber, result.message);
      } catch (error) {
        console.error('Failed to send WhatsApp response:', error);
        // Don't fail the webhook if response fails
      }
    }

    const duration = Date.now() - startTime;
    console.log(`Meta webhook processed in ${duration}ms`);

    // Acknowledge webhook
    res.status(200).json(adapter.formatWebhookResponse());
  } catch (error: any) {
    console.error('Meta webhook handling error:', error);

    // Still acknowledge webhook to prevent retries
    res.status(200).json({
      status: 'error',
      message: 'Webhook received but processing failed'
    });
  }
}

/**
 * Load WhatsApp integration config from database
 */
async function loadIntegrationConfig(provider: WhatsAppProvider): Promise<any> {
  try {
    // Get first active integration for this provider
    const integration = await prisma.whatsAppIntegration.findFirst({
      where: {
        provider,
        is_active: true
      }
    });

    return integration;
  } catch (error) {
    console.error('Failed to load integration config:', error);
    return null;
  }
}

/**
 * Fonnte webhook handler
 */
export async function handleFonnteWebhook(req: Request, res: Response): Promise<void> {
  try {
    // Load Fonnte integration config
    const integration = await loadIntegrationConfig(WhatsAppProvider.FONNTE);
    if (!integration) {
      console.error('Fonnte WhatsApp integration not found');
      res.status(200).send('OK'); // Acknowledge webhook even if no config
      return;
    }

    // Verify webhook (token-based)
    const rawPayload = JSON.stringify(req.body);
    const signature = req.headers['x-fonnte-signature'] as string;

    const config: FonnteProviderConfig = JSON.parse(integration.api_key || '{}');
    const adapter = new FonnteProviderAdapter(config);

    // Fonnte uses token verification (less secure than signature)
    const isValid = adapter.verifyWebhook(signature || '', rawPayload);

    if (!isValid) {
      console.warn('Fonnte webhook verification failed');
      res.status(200).send('OK'); // Still acknowledge to avoid retries
      return;
    }

    // Parse webhook event
    const parsedMessage = adapter.parseWebhookEvent(req.body);

    // Dispatch command
    const dispatcher = new CommandDispatcher();

    // Command requires provider in parsed message
    const result = await dispatcher.processMessage({
      ...parsedMessage,
      provider: WhatsAppProvider.FONNTE
    });

    // Send response via Fonnte
    if (result.success && result.message) {
      await adapter.sendMessage(parsedMessage.phoneNumber, result.message);
    }

    res.status(200).json(adapter.formatWebhookResponse());
  } catch (error: any) {
    console.error('Fonnte webhook error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
}

/**
 * Wablas webhook handler (skeleton for next phase)
 */
export async function handleWablasWebhook(req: Request, res: Response): Promise<void> {
  res.status(501).json({
    error: 'Not Implemented',
    message: 'Wablas adapter will be implemented in next phase'
  });
}
