"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingController = exports.BillingController = void 0;
const stripeService_1 = require("../services/stripeService");
const billingService_1 = require("../services/billingService");
const logger_1 = require("../utils/logger");
class BillingController {
    async createCheckoutSession(req, res, next) {
        try {
            if (!req.userId) {
                return next(new Error('User ID not found'));
            }
            const { campaignIds, successUrl, cancelUrl } = req.body;
            const result = await stripeService_1.stripeService.createCheckoutSession({
                userId: req.userId,
                campaignIds,
                successUrl,
                cancelUrl,
            });
            logger_1.logger.info('Stripe checkout session created', {
                userId: req.userId,
                sessionId: result.sessionId,
                campaignIds
            });
            const response = {
                success: true,
                data: result,
                message: 'Checkout session created successfully',
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async getPayment(req, res, next) {
        try {
            if (!req.userId) {
                return next(new Error('User ID not found'));
            }
            const { id } = req.params;
            const payment = await billingService_1.billingService.getPaymentById(id);
            if (!payment || payment.userId !== req.userId) {
                return next(new Error('Payment not found'));
            }
            const response = {
                success: true,
                data: { payment },
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async getUserBillingStats(req, res, next) {
        try {
            if (!req.userId) {
                return next(new Error('User ID not found'));
            }
            const stats = await billingService_1.billingService.getUserBillingStats(req.userId);
            const response = {
                success: true,
                data: stats,
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async getAvailableProducts(req, res, next) {
        try {
            const products = await stripeService_1.stripeService.getAvailableProducts();
            const response = {
                success: true,
                data: { products },
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async createCustomPrice(req, res, next) {
        try {
            const { customBudget } = req.body;
            if (!customBudget || customBudget < 150) {
                return next(new Error('Invalid budget amount'));
            }
            const price = await stripeService_1.stripeService.createCustomPrice(customBudget);
            const response = {
                success: true,
                data: { price },
                message: 'Custom price created successfully',
            };
            res.status(201).json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async getPayments(req, res, next) {
        try {
            if (!req.userId) {
                return next(new Error('User ID not found'));
            }
            const { status, page = 1, limit = 20 } = req.query;
            const offset = (Number(page) - 1) * Number(limit);
            const result = await stripeService_1.stripeService.getPaymentsByUser(req.userId, {
                status: status,
                limit: Number(limit),
                offset,
            });
            const response = {
                success: true,
                data: {
                    payments: result.payments,
                },
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total: result.total,
                    totalPages: Math.ceil(result.total / Number(limit)),
                },
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async downloadInvoice(req, res, next) {
        try {
            const { paymentId } = req.params;
            const invoiceUrl = await stripeService_1.stripeService.generateInvoice(paymentId);
            // Redirect to the invoice PDF URL
            res.redirect(invoiceUrl);
        }
        catch (error) {
            next(error);
        }
    }
    async handleStripeWebhook(req, res, next) {
        try {
            const signature = req.headers['stripe-signature'];
            const payload = req.body;
            await stripeService_1.stripeService.handleWebhook(payload, signature);
            logger_1.logger.info('Stripe webhook processed successfully');
            res.status(200).json({ received: true });
        }
        catch (error) {
            logger_1.logger.error('Stripe webhook error:', error);
            next(error);
        }
    }
}
exports.BillingController = BillingController;
exports.billingController = new BillingController();
//# sourceMappingURL=billingController.js.map