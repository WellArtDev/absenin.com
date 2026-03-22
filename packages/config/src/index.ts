// Configuration management for Absenin application

import { z } from 'zod';

// Environment variable schemas
export const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // JWT
  JWT_SECRET: z.string().min(1),
  JWT_EXPIRES_IN: z.string().default('24h'),

  // Next.js (optional, for frontend only)
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),

  // Port
  PORT: z.string().default('3001').transform((val) => parseInt(val, 10)),

  // Node.js
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Cloudinary (for image uploads)
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Redis
  REDIS_URL: z.string().url().optional(),

  // CORS
  FRONTEND_URL: z.string().url().optional()
});

export type EnvConfig = z.infer<typeof envSchema>;

// Database configuration
export const dbSchema = z.object({
  url: z.string().url(),
  sslmode: z.enum(['disable', 'require', 'verify-ca', 'verify-full']).default('disable'),
  pool: z.object({
    min: z.number().default(2),
    max: z.number().default(10),
    timeout: z.number().default(30000)
  }).default({})
});

export type DbConfig = z.infer<typeof dbSchema>;

// JWT configuration
export const jwtSchema = z.object({
  secret: z.string().min(1),
  expiresIn: z.string().default('24h'),
  algorithms: z.array(z.enum(['HS256', 'HS384', 'HS512'])).default(['HS256'])
});

export type JwtConfig = z.infer<typeof jwtSchema>;

// Server configuration
export const serverSchema = z.object({
  port: z.number().default(3001),
  host: z.string().default('0.0.0.0'),
  cors: z.object({
    origin: z.string().default('*'),
    credentials: z.boolean().default(true)
  }).default({})
});

export type ServerConfig = z.infer<typeof serverSchema>;

// Configuration loader
export class Config {
  private static instance: Config;
  private env!: EnvConfig;
  private db!: DbConfig;
  private jwt!: JwtConfig;
  private server!: ServerConfig;

  private constructor() {
    this.loadEnv();
    this.loadDbConfig();
    this.loadJwtConfig();
    this.loadServerConfig();
  }

  static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  private loadEnv(): void {
    const env = envSchema.parse(process.env);
    this.env = env;
  }

  private loadDbConfig(): void {
    const url = this.env.DATABASE_URL || process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is required');

    this.db = dbSchema.parse({
      url,
      sslmode: process.env.DB_SSLMODE || 'disable',
      pool: {
        min: parseInt(process.env.DB_POOL_MIN || '2', 10),
        max: parseInt(process.env.DB_POOL_MAX || '10', 10),
        timeout: parseInt(process.env.DB_POOL_TIMEOUT || '30000', 10)
      }
    });
  }

  private loadJwtConfig(): void {
    this.jwt = jwtSchema.parse({
      secret: this.env.JWT_SECRET || process.env.JWT_SECRET,
      expiresIn: this.env.JWT_EXPIRES_IN,
      algorithms: ['HS256']
    });
  }

  private loadServerConfig(): void {
    this.server = serverSchema.parse({
      port: this.env.PORT,
      host: process.env.HOST || '0.0.0.0',
      cors: {
        origin: this.env.FRONTEND_URL || process.env.FRONTEND_URL || '*',
        credentials: true
      }
    });
  }

  getEnv(): EnvConfig {
    return this.env;
  }

  getDb(): DbConfig {
    return this.db;
  }

  getJwt(): JwtConfig {
    return this.jwt;
  }

  getServer(): ServerConfig {
    return this.server;
  }

  // Helper methods
  isDevelopment(): boolean {
    return this.env.NODE_ENV === 'development';
  }

  isProduction(): boolean {
    return this.env.NODE_ENV === 'production';
  }

  isTest(): boolean {
    return this.env.NODE_ENV === 'test';
  }

  getPort(): number {
    return this.server.port;
  }

  getHost(): string {
    return this.server.host;
  }

  getCorsOrigin(): string {
    return this.server.cors.origin;
  }

  getDatabaseUrl(): string {
    return this.db.url;
  }

  getJwtSecret(): string {
    return this.jwt.secret;
  }

  getJwtExpiresIn(): string {
    return this.jwt.expiresIn;
  }

}

// Export singleton instance
export const config = Config.getInstance();

// Feature flags (can be overridden by environment variables)
export const FEATURES = {
  WHATSAPP_INTEGRATION: process.env.WHATSAPP_INTEGRATION === 'true',
  MAP_VIEW: process.env.MAP_VIEW === 'true',
  SELFIE_VERIFICATION: process.env.SELFIE_VERIFICATION === 'true',
  GEOLOCATION_VALIDATION: process.env.GEOLOCATION_VALIDATION === 'true',
  REPORTS: process.env.REPORTS === 'true',
  MULTI_BRANCH: process.env.MULTI_BRANCH === 'true',
  ROLE_BASED_ACCESS: process.env.ROLE_BASED_ACCESS === 'true'
} as const;

// Error types
export enum ErrorType {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  INTERNAL = 'INTERNAL'
}

// Log levels
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  TRACE = 'trace'
}

// WhatsApp providers
export enum WhatsAppProvider {
  META = 'meta',
  WABLAS = 'wablas',
  FONNTE = 'fonnte'
}

// Attendance verification types
export enum VerificationType {
  MANUAL = 'manual',
  GPS = 'gps',
  SELFIE = 'selfie',
  ADMIN = 'admin'
}

// Attendance statuses
export enum AttendanceStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

// JWT payload types
export interface JwtPayload {
  userId: string;
  email: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
  platformAdmin?: boolean;
  exp: number;
  iat: number;
}

// Error response format
export interface ErrorResponse {
  success: false;
  error: {
    type: ErrorType;
    message: string;
    code?: string;
    details?: unknown;
  };
}

// Success response format
export interface SuccessResponse<T = unknown> {
  success: true;
  data?: T;
  message?: string;
}

// Paginated response
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// Database query options
export interface QueryOptions {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  filter?: Record<string, unknown>;
  search?: string;
}

// Common API responses
export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

// File upload types
export enum UploadType {
  SELFIE = 'selfie',
  DOCUMENT = 'document',
  OTHER = 'other'
}

// Language support
export enum Language {
  ID = 'id',
  EN = 'en'
}

// Timezone
export enum Timezone {
  JAKARTA = 'Asia/Jakarta',
  UTC = 'UTC'
}

// Default configuration values
export const DEFAULTS = {
  TIMEZONE: 'Asia/Jakarta' as Timezone,
  WORK_START_TIME: '09:00' as string,
  WORK_END_TIME: '17:00' as string,
  LATE_TOLERANCE_MINUTES: 15 as number,
  DEFAULT_GEOFENCE_RADIUS_METERS: 100 as number,
  SELFIE_VERIFICATION_ENABLED: true as boolean
} as const;
