import { Router } from 'express';
import { billingController } from '@/controllers/billingController';
import { authenticate } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validation';
import { createRateLimit } from '@/middleware/rateLimit';
import { z } from 'zod';
import express from 'express';

const router = Router();

// Rate limiting for billing operations
const billingRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per window
  message: 'Too many billing requests, please try again later',
});

const checkoutRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 checkout sessions per hour
  message: 'Too many checkout attempts, please try again later',
});

// Validation schemas
const createCheckoutSessionSchema = z.object({
  body: z.object({
    campaignIds: z.array(z.string().cuid()).min(1, 'At least one campaign required'),
    successUrl: z.string().url('Valid success URL required'),
    cancelUrl: z.string().url('Valid cancel URL required'),
  }),
});

const getPaymentsSchema = z.object({
  query: z.object({
    page: z.string().transform(Number).default('1'),
    limit: z.string().transform(Number).default('20'),
    status: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'all']).default('all'),
  }),
});

const paymentIdSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid payment ID'),
  }),
});

// Webhook route (no authentication, raw body needed)
router.post(
  '/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  billingController.handleStripeWebhook
);

// Apply authentication to all other billing routes
router.use(authenticate);

/**
 * POST /api/create-checkout-session
 * Create Stripe checkout session for campaign payment
 */
router.post(
  '/create-checkout-session',
  checkoutRateLimit,
  validateRequest(createCheckoutSessionSchema),
  billingController.createCheckoutSession
);

/**
 * GET /payments
 * Get user's payment history
 */
router.get(
  '/payments',
  billingRateLimit,
  validateRequest(getPaymentsSchema),
  billingController.getPayments
);

/**
 * GET /payments/:id
 * Get specific payment details
 */
router.get(
  '/payments/:id',
  billingRateLimit,
  validateRequest(paymentIdSchema),
  billingController.getPayment
);

/**
 * GET /payments/:id/invoice
 * Download invoice for a payment
 */
router.get(
  '/payments/:id/invoice',
  billingRateLimit,
  validateRequest(paymentIdSchema),
  billingController.downloadInvoice
);

/**
 * GET /stats
 * Get user's billing statistics
 */
router.get(
  '/stats',
  billingRateLimit,
  billingController.getUserBillingStats
);

/**
 * GET /products
 * Get available Stripe products/prices
 */
router.get(
  '/products',
  billingRateLimit,
  billingController.getAvailableProducts
);

/**
 * POST /custom-price
 * Create custom price for specific budget
 */
router.post(
  '/custom-price',
  billingRateLimit,
  billingController.createCustomPrice
);

export default router;