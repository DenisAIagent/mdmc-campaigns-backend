import { Request, Response, NextFunction } from 'express';
import { stripeService } from '@/services/stripeService';
import { billingService } from '@/services/billingService';
import { ApiResponse } from '@/types/express';
import { logger } from '@/utils/logger';
import { PaymentStatus } from '@prisma/client';

export class BillingController {
  async createCheckoutSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) {
        return next(new Error('User ID not found'));
      }

      const { campaignIds, successUrl, cancelUrl } = req.body;

      const result = await stripeService.createCheckoutSession({
        userId: req.userId,
        campaignIds,
        successUrl,
        cancelUrl,
      });

      logger.info('Stripe checkout session created', { 
        userId: req.userId, 
        sessionId: result.sessionId,
        campaignIds 
      });

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Checkout session created successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) {
        return next(new Error('User ID not found'));
      }

      const { id } = req.params;
      const payment = await billingService.getPaymentById(id);

      if (!payment || payment.userId !== req.userId) {
        return next(new Error('Payment not found'));
      }

      const response: ApiResponse = {
        success: true,
        data: { payment },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getUserBillingStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) {
        return next(new Error('User ID not found'));
      }

      const stats = await billingService.getUserBillingStats(req.userId);

      const response: ApiResponse = {
        success: true,
        data: stats,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getAvailableProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const products = await stripeService.getAvailableProducts();

      const response: ApiResponse = {
        success: true,
        data: { products },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async createCustomPrice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { customBudget } = req.body;

      if (!customBudget || customBudget < 150) {
        return next(new Error('Invalid budget amount'));
      }

      const price = await stripeService.createCustomPrice(customBudget);

      const response: ApiResponse = {
        success: true,
        data: { price },
        message: 'Custom price created successfully',
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) {
        return next(new Error('User ID not found'));
      }

      const { status, page = 1, limit = 20 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const result = await stripeService.getPaymentsByUser(req.userId, {
        status: status as PaymentStatus,
        limit: Number(limit),
        offset,
      });

      const response: ApiResponse = {
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
    } catch (error) {
      next(error);
    }
  }

  async downloadInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { paymentId } = req.params;

      const invoiceUrl = await stripeService.generateInvoice(paymentId);

      // Redirect to the invoice PDF URL
      res.redirect(invoiceUrl);
    } catch (error) {
      next(error);
    }
  }

  async handleStripeWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = req.headers['stripe-signature'] as string;
      const payload = req.body;

      await stripeService.handleWebhook(payload, signature);

      logger.info('Stripe webhook processed successfully');

      res.status(200).json({ received: true });
    } catch (error) {
      logger.error('Stripe webhook error:', error);
      next(error);
    }
  }
}

export const billingController = new BillingController();