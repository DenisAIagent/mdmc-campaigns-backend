"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const billingController_1 = require("../controllers/billingController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const rateLimit_1 = require("../middleware/rateLimit");
const zod_1 = require("zod");
const express_2 = __importDefault(require("express"));
const router = (0, express_1.Router)();
// Rate limiting for billing operations
const billingRateLimit = (0, rateLimit_1.createRateLimit)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // 30 requests per window
    message: 'Too many billing requests, please try again later',
});
const checkoutRateLimit = (0, rateLimit_1.createRateLimit)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 checkout sessions per hour
    message: 'Too many checkout attempts, please try again later',
});
// Validation schemas
const createCheckoutSessionSchema = zod_1.z.object({
    body: zod_1.z.object({
        campaignIds: zod_1.z.array(zod_1.z.string().cuid()).min(1, 'At least one campaign required'),
        successUrl: zod_1.z.string().url('Valid success URL required'),
        cancelUrl: zod_1.z.string().url('Valid cancel URL required'),
    }),
});
const getPaymentsSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().transform(Number).default('1'),
        limit: zod_1.z.string().transform(Number).default('20'),
        status: zod_1.z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'all']).default('all'),
    }),
});
const paymentIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().cuid('Invalid payment ID'),
    }),
});
// Webhook route (no authentication, raw body needed)
router.post('/webhooks/stripe', express_2.default.raw({ type: 'application/json' }), billingController_1.billingController.handleStripeWebhook);
// Apply authentication to all other billing routes
router.use(auth_1.authenticate);
/**
 * POST /api/create-checkout-session
 * Create Stripe checkout session for campaign payment
 */
router.post('/create-checkout-session', checkoutRateLimit, (0, validation_1.validateRequest)(createCheckoutSessionSchema), billingController_1.billingController.createCheckoutSession);
/**
 * GET /payments
 * Get user's payment history
 */
router.get('/payments', billingRateLimit, (0, validation_1.validateRequest)(getPaymentsSchema), billingController_1.billingController.getPayments);
/**
 * GET /payments/:id
 * Get specific payment details
 */
router.get('/payments/:id', billingRateLimit, (0, validation_1.validateRequest)(paymentIdSchema), billingController_1.billingController.getPayment);
/**
 * GET /payments/:id/invoice
 * Download invoice for a payment
 */
router.get('/payments/:id/invoice', billingRateLimit, (0, validation_1.validateRequest)(paymentIdSchema), billingController_1.billingController.downloadInvoice);
/**
 * GET /stats
 * Get user's billing statistics
 */
router.get('/stats', billingRateLimit, billingController_1.billingController.getUserBillingStats);
/**
 * GET /products
 * Get available Stripe products/prices
 */
router.get('/products', billingRateLimit, billingController_1.billingController.getAvailableProducts);
/**
 * POST /custom-price
 * Create custom price for specific budget
 */
router.post('/custom-price', billingRateLimit, billingController_1.billingController.createCustomPrice);
exports.default = router;
//# sourceMappingURL=billing.js.map