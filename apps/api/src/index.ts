// Main application entry point for Absenin API

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '@prisma/client';
import { config } from '@absenin/config';
import { Logger } from './shared/middleware/logger';
import { errorHandler } from './shared/middleware/errorHandler';
import { tenantMiddleware } from './shared/middleware/tenant';
import { authMiddleware } from './shared/middleware/auth';
import { permissionMiddleware } from './shared/middleware/auth';
import { csrfValidationMiddleware } from './shared/middleware/csrf';
import { authRouter } from './modules/auth/authController';
import { tenantRouter } from './modules/tenant/tenantController';
import { employeeRouter } from './modules/employee/employeeController';
import { attendanceRouter } from './modules/attendance/attendanceController';
import { roleRouter } from './modules/roles/roleController';
import { locationRouter } from './modules/location/locationController';
import { reportRouter } from './modules/report/reportController';
import * as whatsappController from './modules/whatsapp/whatsappController';
import * as whatsappHealthController from './modules/whatsapp/whatsappHealthController';

// Create Express app
const app = express();

// Trust proxy - important for nginx reverse proxy
app.set('trust proxy', true);

// Initialize Prisma client
const prisma = new PrismaClient();

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.getServer().cors.origin,
  credentials: config.getServer().cors.credentials
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Logging middleware
app.use((req, res, next) => {
  Logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Tenant middleware
app.use('/api/tenant/*', tenantMiddleware);
app.use('/api/attendance/*', tenantMiddleware);
app.use('/api/employees/*', tenantMiddleware);
app.use('/api/roles/*', tenantMiddleware);
app.use('/api/locations/*', tenantMiddleware);
app.use('/api/settings/*', tenantMiddleware);

// Auth middleware for protected endpoints
app.use('/api/tenant/*', authMiddleware);
app.use('/api/employees/*', authMiddleware);
app.use('/api/attendance/*', authMiddleware);
app.use('/api/roles/*', authMiddleware);
app.use('/api/locations/*', authMiddleware);

// Permission middleware for feature-based access
app.use('/api/attendance/*', permissionMiddleware('attendance'));
app.use('/api/employees/*', permissionMiddleware('employee'));
app.use('/api/roles/*', permissionMiddleware('role'));
app.use('/api/locations/*', permissionMiddleware('geofence'));
app.use('/api/reports/*', permissionMiddleware('report'));

// CSRF protection for state-changing operations on protected endpoints
// Applied to POST, PATCH, DELETE methods
app.use('/api/employees', csrfValidationMiddleware);
app.use('/api/attendance', csrfValidationMiddleware);
app.use('/api/roles', csrfValidationMiddleware);
app.use('/api/locations', csrfValidationMiddleware);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Absenin API is running',
    timestamp: new Date().toISOString(),
    environment: config.isDevelopment() ? 'development' : 'production'
  });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/tenant', tenantRouter);
app.use('/api/employees', employeeRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/roles', roleRouter);
app.use('/api/locations', locationRouter);
app.use('/api/reports', reportRouter);

// WhatsApp webhook routes (no auth/CSRF required)
app.get('/api/webhook/whatsapp/meta', whatsappController.verifyMetaWebhook);
app.post('/api/webhook/whatsapp/meta', whatsappController.handleMetaWebhook);
app.post('/api/webhook/whatsapp/fonnte', whatsappController.handleFonnteWebhook);
app.post('/api/webhook/whatsapp/wablas', whatsappController.handleWablasWebhook);

// WhatsApp health and status endpoints
app.get('/api/whatsapp/health', whatsappHealthController.getWhatsAppHealth);
app.get('/api/whatsapp/status', whatsappHealthController.getWhatsAppStatus);
app.get('/api/whatsapp/providers', whatsappHealthController.listProviders);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      type: 'NOT_FOUND',
      message: 'Endpoint not found'
    }
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  Logger.info('SIGTERM received, shutting down gracefully');
  prisma.$disconnect();
  process.exit(0);
});

// Start server
const PORT = config.getPort();
const server = app.listen(PORT, () => {
  Logger.info(`Absenin API running on port ${PORT}`);
});

export default server;
