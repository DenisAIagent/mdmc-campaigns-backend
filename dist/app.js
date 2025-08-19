"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const env_1 = require("@/config/env");
const redis_1 = require("@/config/redis");
const logger_1 = require("@/utils/logger");
const errorHandler_1 = require("@/middleware/errorHandler");
const rateLimit_1 = require("@/middleware/rateLimit");
// Import routes
const auth_1 = __importDefault(require("@/routes/auth"));
const campaigns_1 = __importDefault(require("@/routes/campaigns"));
const billing_1 = __importDefault(require("@/routes/billing"));
// import googleRoutes from '@/routes/google';
// import alertRoutes from '@/routes/alerts';
// import adminRoutes from '@/routes/admin';
const app = (0, express_1.default)();
// Security middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));
// CORS configuration
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin)
            return callback(null, true);
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3001',
            'https://mdmc.fr',
            'https://www.mdmc.fr',
            'https://app.mdmc.fr',
        ];
        if (env_1.env.NODE_ENV === 'development') {
            allowedOrigins.push('http://localhost:5173'); // Vite dev server
        }
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-Request-ID',
        'X-API-Key',
    ],
}));
// Compression
app.use((0, compression_1.default)());
// Body parsing
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Request ID and logging
app.use(errorHandler_1.addRequestId);
// HTTP request logging
if (env_1.env.NODE_ENV !== 'test') {
    const morgan = require('morgan');
    app.use(morgan('combined', { stream: logger_1.morganStream }));
}
// Rate limiting
app.use(rateLimit_1.globalRateLimit);
// Health check endpoint
app.get('/health', (req, res) => {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: env_1.env.NODE_ENV,
        services: {
            database: 'ok', // We'll implement proper health checks later
            redis: redis_1.redis.isHealthy() ? 'ok' : 'error',
        },
    };
    const statusCode = Object.values(health.services).every(status => status === 'ok') ? 200 : 503;
    res.status(statusCode).json(health);
});
// API routes
app.use('/auth', auth_1.default);
app.use('/campaigns', campaigns_1.default);
app.use('/api', billing_1.default); // For /api/create-checkout-session and /webhooks/stripe
// app.use('/v1/google', googleRoutes);
// app.use('/v1/alerts', alertRoutes);
// app.use('/v1/admin', adminRoutes);
// API documentation
app.get('/v1/docs', (req, res) => {
    res.json({
        message: 'MDMC Music Ads API',
        version: '1.0.0',
        documentation: 'https://docs.mdmc.fr/api',
        endpoints: {
            auth: '/v1/auth',
            google: '/v1/google',
            campaigns: '/v1/campaigns',
            billing: '/v1/billing',
            alerts: '/v1/alerts',
            admin: '/v1/admin',
        },
    });
});
// Catch 404 and forward to error handler
app.use(errorHandler_1.notFoundHandler);
// Error handling middleware (must be last)
app.use(errorHandler_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map