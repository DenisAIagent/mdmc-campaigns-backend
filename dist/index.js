"use strict";
/**
 * Main entry point for MDMC Music Ads Backend API
 * Production-ready Node.js/Express server with TypeScript
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = require("@/config/env");
const logger_1 = require("@/utils/logger");
const app_1 = __importDefault(require("./app"));
const PORT = env_1.env.API_PORT;
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger_1.logger.error('Uncaught Exception:', error);
    process.exit(1);
});
// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger_1.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
// Graceful shutdown
process.on('SIGTERM', () => {
    logger_1.logger.info('SIGTERM received. Starting graceful shutdown...');
    server.close(() => {
        logger_1.logger.info('Process terminated gracefully');
        process.exit(0);
    });
});
process.on('SIGINT', () => {
    logger_1.logger.info('SIGINT received. Starting graceful shutdown...');
    server.close(() => {
        logger_1.logger.info('Process terminated gracefully');
        process.exit(0);
    });
});
// Start server
const server = app_1.default.listen(PORT, () => {
    logger_1.logger.info(`🚀 MDMC Music Ads API Server started`, {
        port: PORT,
        environment: env_1.env.NODE_ENV,
        baseUrl: env_1.env.API_BASE_URL,
    });
    if (env_1.env.NODE_ENV === 'development') {
        logger_1.logger.info('📚 API Documentation available at: /v1/docs');
        logger_1.logger.info('❤️  Health check available at: /health');
    }
});
// Set server timeout (60 seconds)
server.timeout = 60000;
exports.default = server;
//# sourceMappingURL=index.js.map