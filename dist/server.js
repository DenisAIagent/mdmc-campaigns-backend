"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const database_1 = require("./config/database");
const redis_1 = require("./config/redis");
const logger_1 = require("./utils/logger");
const errorHandler_1 = require("./middleware/errorHandler");
// Setup global error handlers
(0, errorHandler_1.setupGlobalErrorHandlers)();
const server = (0, http_1.createServer)(app_1.default);
// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
    logger_1.logger.info(`Received ${signal}. Starting graceful shutdown...`);
    server.close(async () => {
        logger_1.logger.info('HTTP server closed');
        try {
            // Close database connection
            await database_1.prisma.$disconnect();
            logger_1.logger.info('Database connection closed');
            // Close Redis connection
            await redis_1.redis.disconnect();
            logger_1.logger.info('Redis connection closed');
            logger_1.logger.info('Graceful shutdown completed');
            process.exit(0);
        }
        catch (error) {
            logger_1.logger.error('Error during graceful shutdown:', error);
            process.exit(1);
        }
    });
    // Force close after 30 seconds
    setTimeout(() => {
        logger_1.logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 30000);
};
// Setup graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
async function startServer() {
    try {
        // Connect to Redis
        await redis_1.redis.connect();
        logger_1.logger.info('✅ Redis connected successfully');
        // Test database connection
        await database_1.prisma.$connect();
        logger_1.logger.info('✅ Database connected successfully');
        // Start server
        server.listen(env_1.env.API_PORT, () => {
            logger_1.logger.info(`🚀 Server is running on port ${env_1.env.API_PORT}`);
            logger_1.logger.info(`📱 Environment: ${env_1.env.NODE_ENV}`);
            logger_1.logger.info(`🔗 API Base URL: ${env_1.env.API_BASE_URL}`);
            logger_1.logger.info(`📚 Health Check: ${env_1.env.API_BASE_URL}/health`);
            logger_1.logger.info(`📖 API Docs: ${env_1.env.API_BASE_URL}/v1/docs`);
        });
    }
    catch (error) {
        logger_1.logger.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger_1.logger.error('Uncaught Exception:', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    logger_1.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
// Start the server
startServer().catch((error) => {
    logger_1.logger.error('Failed to start server:', error);
    process.exit(1);
});
//# sourceMappingURL=server.js.map