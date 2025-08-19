import { createServer } from 'http';
import app from './app';
import { env } from '@/config/env';
import { prisma } from '@/config/database';
import { redis } from '@/config/redis';
import { logger } from '@/utils/logger';
import { setupGlobalErrorHandlers } from '@/middleware/errorHandler';

// Setup global error handlers
setupGlobalErrorHandlers();

const server = createServer(app);

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close(async () => {
    logger.info('HTTP server closed');
    
    try {
      // Close database connection
      await prisma.$disconnect();
      logger.info('Database connection closed');
      
      // Close Redis connection
      await redis.disconnect();
      logger.info('Redis connection closed');
      
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  });
  
  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

// Setup graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

async function startServer() {
  try {
    // Connect to Redis
    await redis.connect();
    logger.info('✅ Redis connected successfully');
    
    // Test database connection
    await prisma.$connect();
    logger.info('✅ Database connected successfully');
    
    // Start server
    server.listen(env.API_PORT, () => {
      logger.info(`🚀 Server is running on port ${env.API_PORT}`);
      logger.info(`📱 Environment: ${env.NODE_ENV}`);
      logger.info(`🔗 API Base URL: ${env.API_BASE_URL}`);
      logger.info(`📚 Health Check: ${env.API_BASE_URL}/health`);
      logger.info(`📖 API Docs: ${env.API_BASE_URL}/v1/docs`);
    });
    
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});