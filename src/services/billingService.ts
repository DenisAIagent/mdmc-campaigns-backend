import { PrismaClient, PaymentStatus } from '@prisma/client';
import { NotFoundError, BadRequestError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { env } from '@/config/env';

const prisma = new PrismaClient();

interface PaymentFilters {
  page: number;
  limit: number;
  status?: string;
}

interface BillingStats {
  totalSpent: number;
  totalCampaigns: number;
  activeCampaigns: number;
  pendingPayments: number;
  monthlySpend: number;
  currency: string;
}

export class BillingService {
  async getUserPayments(userId: string, filters: PaymentFilters) {
    const { page, limit, status } = filters;
    const skip = (page - 1) * limit;

    const where: any = {
      userId,
    };

    if (status && status !== 'all') {
      where.status = status.toUpperCase() as PaymentStatus;
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          campaign: {
            select: {
              id: true,
              clipTitle: true,
              status: true,
            },
          },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getPaymentById(paymentId: string) {
    return await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        campaign: {
          select: {
            id: true,
            clipTitle: true,
            status: true,
            clipUrl: true,
          },
        },
      },
    });
  }

  async createPayment(data: {
    userId: string;
    campaignId?: string;
    stripeSessionId?: string;
    stripePaymentId?: string;
    amountCents: number;
    vatRate: number;
    currency: string;
  }) {
    const { userId, campaignId, stripeSessionId, stripePaymentId, amountCents, vatRate, currency } = data;

    const vatCents = Math.round(amountCents * vatRate);
    const totalCents = amountCents + vatCents;

    const payment = await prisma.payment.create({
      data: {
        userId,
        campaignId,
        stripeSessionId,
        stripePaymentId,
        amountCents,
        vatRate,
        vatCents,
        totalCents,
        currency,
        status: PaymentStatus.PENDING,
      },
      include: {
        campaign: {
          select: {
            id: true,
            clipTitle: true,
          },
        },
      },
    });

    logger.info('Payment created', {
      paymentId: payment.id,
      userId,
      campaignId,
      totalCents,
    });

    return payment;
  }

  async updatePaymentStatus(paymentId: string, status: PaymentStatus, metadata?: any) {
    const updateData: any = {
      status,
    };

    if (status === PaymentStatus.PAID) {
      updateData.paidAt = new Date();
    }

    if (metadata?.stripePaymentId) {
      updateData.stripePaymentId = metadata.stripePaymentId;
    }

    if (metadata?.invoiceUrl) {
      updateData.invoiceUrl = metadata.invoiceUrl;
    }

    if (metadata?.invoiceNumber) {
      updateData.invoiceNumber = metadata.invoiceNumber;
    }

    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: updateData,
      include: {
        campaign: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    logger.info('Payment status updated', {
      paymentId,
      status,
      userId: payment.userId,
    });

    return payment;
  }

  async getUserBillingStats(userId: string): Promise<BillingStats> {
    // Get all user payments
    const payments = await prisma.payment.findMany({
      where: { userId },
      include: {
        campaign: true,
      },
    });

    // Calculate total spent (only paid payments)
    const paidPayments = payments.filter(p => p.status === PaymentStatus.PAID);
    const totalSpent = paidPayments.reduce((sum, payment) => sum + payment.totalCents, 0) / 100; // Convert to euros

    // Get campaign stats
    const campaigns = await prisma.campaignRequest.findMany({
      where: {
        clientAccount: {
          userId,
        },
      },
    });

    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter(c => 
      ['RUNNING', 'QUEUED', 'PAUSED'].includes(c.status)
    ).length;

    // Pending payments count
    const pendingPayments = payments.filter(p => p.status === PaymentStatus.PENDING).length;

    // Calculate monthly spend (current month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyPayments = paidPayments.filter(p => 
      p.paidAt && p.paidAt >= startOfMonth
    );
    const monthlySpend = monthlyPayments.reduce((sum, payment) => sum + payment.totalCents, 0) / 100;

    return {
      totalSpent,
      totalCampaigns,
      activeCampaigns,
      pendingPayments,
      monthlySpend,
      currency: 'EUR',
    };
  }

  async getInvoiceUrl(paymentId: string): Promise<string> {
    const payment = await this.getPaymentById(paymentId);
    
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    if (payment.status !== PaymentStatus.PAID) {
      throw new BadRequestError('Invoice only available for paid payments');
    }

    if (payment.invoiceUrl) {
      return payment.invoiceUrl;
    }

    // Generate invoice if not exists
    const invoiceUrl = await this.generateInvoice(payment);
    
    // Update payment with invoice URL
    await prisma.payment.update({
      where: { id: paymentId },
      data: { invoiceUrl },
    });

    return invoiceUrl;
  }

  private async generateInvoice(payment: any): Promise<string> {
    // This would integrate with a PDF generation service or Stripe invoices
    // For now, return a placeholder URL
    const invoiceNumber = this.generateInvoiceNumber(payment.id);
    
    // In a real implementation, this would:
    // 1. Generate a PDF invoice with payment details
    // 2. Upload to cloud storage (S3, etc.)
    // 3. Return the public URL
    
    logger.info('Generated invoice', {
      paymentId: payment.id,
      invoiceNumber,
    });

    return `${env.API_BASE_URL}/invoices/${invoiceNumber}.pdf`;
  }

  private generateInvoiceNumber(paymentId: string): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const shortId = paymentId.slice(-6).toUpperCase();
    
    return `INV-${year}${month}-${shortId}`;
  }

  async getPaymentByStripeSessionId(sessionId: string) {
    return await prisma.payment.findUnique({
      where: { stripeSessionId: sessionId },
      include: {
        campaign: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async getPaymentByStripePaymentId(paymentId: string) {
    return await prisma.payment.findUnique({
      where: { stripePaymentId: paymentId },
      include: {
        campaign: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async refundPayment(paymentId: string, reason?: string) {
    const payment = await this.getPaymentById(paymentId);
    
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    if (payment.status !== PaymentStatus.PAID) {
      throw new BadRequestError('Can only refund paid payments');
    }

    // Update payment status
    const refundedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.REFUNDED,
      },
      include: {
        campaign: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    logger.info('Payment refunded', {
      paymentId,
      userId: payment.userId,
      reason,
    });

    return refundedPayment;
  }
}

export const billingService = new BillingService();