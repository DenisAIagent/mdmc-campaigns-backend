/**
 * Main entry point for MDMC Music Ads Backend API
 * Production-ready Node.js/Express server with TypeScript
 */

import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import app from './app';

const PORT = env.API_PORT;

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Starting graceful shutdown...');
  
  server.close(() => {
    logger.info('Process terminated gracefully');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Starting graceful shutdown...');
  
  server.close(() => {
    logger.info('Process terminated gracefully');
    process.exit(0);
  });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`🚀 MDMC Music Ads API Server started`, {
    port: PORT,
    environment: env.NODE_ENV,
    baseUrl: env.API_BASE_URL,
  });

  if (env.NODE_ENV === 'development') {
    logger.info('📚 API Documentation available at: /v1/docs');
    logger.info('❤️  Health check available at: /health');
  }
});

// Set server timeout (60 seconds)
server.timeout = 60000;

export default server;