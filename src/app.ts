import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { env } from '@/config/env';
import { redis } from '@/config/redis';
import { logger, morganStream } from '@/utils/logger';
import { errorHandler, addRequestId, notFoundHandler } from '@/middleware/errorHandler';
import { globalRateLimit } from '@/middleware/rateLimit';

// Import routes
import authRoutes from '@/routes/auth';
import campaignRoutes from '@/routes/campaigns';
import billingRoutes from '@/routes/billing';
// import googleRoutes from '@/routes/google';
// import alertRoutes from '@/routes/alerts';
// import adminRoutes from '@/routes/admin';

const app = express();

// Security middleware
app.use(helmet({
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
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://mdmc.fr',
      'https://www.mdmc.fr',
      'https://app.mdmc.fr',
    ];
    
    if (env.NODE_ENV === 'development') {
      allowedOrigins.push('http://localhost:5173'); // Vite dev server
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
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
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID and logging
app.use(addRequestId);

// HTTP request logging
if (env.NODE_ENV !== 'test') {
  const morgan = require('morgan');
  app.use(morgan('combined', { stream: morganStream }));
}

// Rate limiting
app.use(globalRateLimit);

// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: env.NODE_ENV,
    services: {
      database: 'ok', // We'll implement proper health checks later
      redis: redis.isHealthy() ? 'ok' : 'error',
    },
  };

  const statusCode = Object.values(health.services).every(status => status === 'ok') ? 200 : 503;
  res.status(statusCode).json(health);
});

// API routes
app.use('/auth', authRoutes);
app.use('/campaigns', campaignRoutes);
app.use('/api', billingRoutes); // For /api/create-checkout-session and /webhooks/stripe
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
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;