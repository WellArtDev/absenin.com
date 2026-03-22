import * as winston from 'winston';

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'absenin-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// If not in production, log to the `console`
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Create logger utility
export const Logger = {
  info: (message: string, meta?: any) => logger.info(message, meta),
  error: (message: string, error?: Error | any, meta?: any) => {
    if (error) {
      logger.error(message, { error, ...meta });
    } else {
      logger.error(message, meta);
    }
  },
  warn: (message: string, meta?: any) => logger.warn(message, meta),
  debug: (message: string, meta?: any) => logger.debug(message, meta),
  trace: (message: string, meta?: any) => logger.silly(message, meta),
  log: (level: string, message: string, meta?: any) => logger.log({ level, message, ...meta })
};

export default Logger;
