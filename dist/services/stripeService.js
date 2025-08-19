"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeService = exports.StripeService = void 0;
const stripe_1 = __importDefault(require("stripe"));
const database_1 = require("@/config/database");
const redis_1 = require("@/config/redis");
const env_1 = require("@/config/env");
const logger_1 = require("@/utils/logger");
const errors_1 = require("@/utils/errors");
const client_1 = require("@prisma/client");
class StripeService {
    stripe;
    constructor() {
        this.stripe = new stripe_1.default(env_1.env.STRIPE_SECRET_KEY, {
            apiVersion: '2023-10-16',
            typescript: true,
        });
    }
    async createCheckoutSession(data) {
        try {
            const { userId, campaignIds, successUrl, cancelUrl, metadata = {} } = data;
            // Validate campaigns belong to user
            const campaigns = await database_1.prisma.campaignRequest.findMany({
                where: {
                    id: { in: campaignIds },
                    clientAccount: { userId },
                },
                include: { clientAccount: { include: { user: true } } },
            });
            if (campaigns.length !== campaignIds.length) {
                throw new errors_1.StripeError('Some campaigns not found or not accessible');
            }
            // Calculate amounts
            const pricePerCampaign = env_1.env.DEFAULT_CAMPAIGN_PRICE_EUR * 100; // Convert to cents
            const vatRate = env_1.env.VAT_RATE;
            const amountCents = campaigns.length * pricePerCampaign;
            const vatCents = Math.round(amountCents * vatRate);
            const totalCents = amountCents + vatCents;
            // Get user email
            const userEmail = campaigns[0]?.clientAccount?.user?.email;
            if (!userEmail) {
                throw new Error('User email not found');
            }
            // Create line items
            const lineItems = [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: campaigns.length === 1
                                ? `Campagne YouTube Ads - ${campaigns[0]?.clipTitle || 'Sans titre'}`
                                : `${campaigns.length} Campagnes YouTube Ads`,
                            metadata: {
                                type: 'youtube_ads_campaign',
                                duration_days: '30',
                            },
                        },
                        unit_amount: pricePerCampaign,
                        tax_behavior: 'exclusive',
                    },
                    quantity: campaigns.length,
                },
            ];
            // Create tax rate for Estonian VAT
            const taxRate = await this.getOrCreateTaxRate();
            // Create checkout session
            const session = await this.stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: lineItems,
                mode: 'payment',
                customer_email: userEmail,
                success_url: successUrl || `${env_1.env.API_BASE_URL.replace('/v1', '')}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: cancelUrl || `${env_1.env.API_BASE_URL.replace('/v1', '')}/checkout/cancel`,
                automatic_tax: {
                    enabled: false, // We'll handle tax manually
                },
                tax_id_collection: {
                    enabled: true,
                },
                invoice_creation: {
                    enabled: true,
                    invoice_data: {
                        description: `Campagnes YouTube Ads - ${new Date().toLocaleDateString('fr-FR')}`,
                        metadata: {
                            user_id: userId,
                            campaign_ids: campaignIds.join(','),
                        },
                        footer: 'MDMC Music Ads - Plateforme self-serve de campagnes YouTube Ads',
                    },
                },
                payment_intent_data: {
                    description: campaigns.length === 1
                        ? `Campagne: ${campaigns[0]?.clipTitle || 'Sans titre'}`
                        : `${campaigns.length} campagnes YouTube Ads`,
                    metadata: {
                        user_id: userId,
                        campaign_ids: campaignIds.join(','),
                        amount_eur: (amountCents / 100).toString(),
                        vat_eur: (vatCents / 100).toString(),
                        total_eur: (totalCents / 100).toString(),
                        ...metadata,
                    },
                },
                metadata: {
                    user_id: userId,
                    campaign_ids: campaignIds.join(','),
                    type: 'campaign_payment',
                },
                locale: 'fr',
                billing_address_collection: 'required',
                shipping_address_collection: {
                    allowed_countries: ['FR', 'BE', 'CH', 'LU', 'MC'],
                },
            });
            if (!session.id || !session.url) {
                throw new errors_1.StripeError('Failed to create checkout session');
            }
            // Create payment records in database
            for (const campaign of campaigns) {
                await database_1.prisma.payment.create({
                    data: {
                        userId,
                        campaignId: campaign.id,
                        stripeSessionId: session.id,
                        amountCents: pricePerCampaign,
                        vatRate,
                        vatCents: Math.round(pricePerCampaign * vatRate),
                        totalCents: pricePerCampaign + Math.round(pricePerCampaign * vatRate),
                        status: client_1.PaymentStatus.PENDING,
                    },
                });
            }
            logger_1.logger.info('Stripe checkout session created', {
                userId,
                sessionId: session.id,
                campaignIds,
                amountCents,
                vatCents,
                totalCents,
            });
            return {
                sessionId: session.id,
                checkoutUrl: session.url,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to create Stripe checkout session:', error);
            if (error instanceof errors_1.StripeError) {
                throw error;
            }
            if (error instanceof stripe_1.default.errors.StripeError) {
                throw new errors_1.StripeError(error.message, error);
            }
            throw new errors_1.StripeError('Failed to create checkout session', error);
        }
    }
    async handleWebhook(payload, signature) {
        try {
            const event = this.stripe.webhooks.constructEvent(payload, signature, env_1.env.STRIPE_WEBHOOK_SECRET);
            logger_1.logger.info('Stripe webhook received', { type: event.type, id: event.id });
            switch (event.type) {
                case 'checkout.session.completed':
                    await this.handleCheckoutCompleted(event.data.object);
                    break;
                case 'payment_intent.succeeded':
                    await this.handlePaymentSucceeded(event.data.object);
                    break;
                case 'payment_intent.payment_failed':
                    await this.handlePaymentFailed(event.data.object);
                    break;
                case 'invoice.finalized':
                    await this.handleInvoiceFinalized(event.data.object);
                    break;
                default:
                    logger_1.logger.info('Unhandled Stripe webhook event type', { type: event.type });
            }
        }
        catch (error) {
            logger_1.logger.error('Stripe webhook error:', error);
            throw new errors_1.StripeError('Failed to process webhook', error);
        }
    }
    async getPaymentsByUser(userId, options = {}) {
        const { status, limit = 20, offset = 0 } = options;
        const where = { userId };
        if (status) {
            where.status = status;
        }
        const [payments, total] = await Promise.all([
            database_1.prisma.payment.findMany({
                where,
                include: {
                    campaign: {
                        select: { id: true, clipTitle: true, status: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            database_1.prisma.payment.count({ where }),
        ]);
        return { payments, total };
    }
    async generateInvoice(paymentId) {
        try {
            const payment = await database_1.prisma.payment.findUnique({
                where: { id: paymentId },
                include: {
                    user: true,
                    campaign: true,
                },
            });
            if (!payment) {
                throw new errors_1.NotFoundError('Payment not found');
            }
            if (!payment.stripePaymentId) {
                throw new errors_1.StripeError('Stripe payment ID not found');
            }
            // Get payment intent from Stripe
            const paymentIntent = await this.stripe.paymentIntents.retrieve(payment.stripePaymentId);
            if (!paymentIntent.invoice) {
                throw new errors_1.StripeError('Invoice not found for payment');
            }
            // Get invoice details
            const invoice = await this.stripe.invoices.retrieve(paymentIntent.invoice);
            // Generate invoice PDF URL
            const invoiceUrl = invoice.invoice_pdf;
            if (!invoiceUrl) {
                throw new errors_1.StripeError('Invoice PDF not available');
            }
            // Update payment with invoice information
            await database_1.prisma.payment.update({
                where: { id: paymentId },
                data: {
                    invoiceUrl,
                    invoiceNumber: invoice.number,
                },
            });
            return invoiceUrl;
        }
        catch (error) {
            logger_1.logger.error('Failed to generate invoice:', error);
            throw new errors_1.StripeError('Failed to generate invoice', error);
        }
    }
    async handleCheckoutCompleted(session) {
        try {
            const userId = session.metadata?.user_id;
            const campaignIds = session.metadata?.campaign_ids?.split(',') || [];
            if (!userId || !campaignIds.length) {
                throw new Error('Missing metadata in checkout session');
            }
            // Update payment status
            await database_1.prisma.payment.updateMany({
                where: {
                    userId,
                    stripeSessionId: session.id,
                },
                data: {
                    stripePaymentId: session.payment_intent,
                    status: client_1.PaymentStatus.PAID,
                    paidAt: new Date(),
                },
            });
            // Update campaigns to QUEUED status
            await database_1.prisma.campaignRequest.updateMany({
                where: {
                    id: { in: campaignIds },
                    clientAccount: { userId },
                },
                data: {
                    status: 'QUEUED',
                },
            });
            logger_1.logger.info('Checkout completed successfully', {
                userId,
                sessionId: session.id,
                campaignIds,
            });
            // TODO: Send confirmation email
            // TODO: Create alert for account manager
        }
        catch (error) {
            logger_1.logger.error('Error handling checkout completion:', error);
            throw error;
        }
    }
    async handlePaymentSucceeded(paymentIntent) {
        try {
            const userId = paymentIntent.metadata?.user_id;
            if (!userId) {
                logger_1.logger.warn('Payment succeeded without user_id metadata', {
                    paymentIntentId: paymentIntent.id
                });
                return;
            }
            // Ensure payment is marked as paid
            await database_1.prisma.payment.updateMany({
                where: {
                    stripePaymentId: paymentIntent.id,
                },
                data: {
                    status: client_1.PaymentStatus.PAID,
                    paidAt: new Date(),
                },
            });
            logger_1.logger.info('Payment succeeded', {
                userId,
                paymentIntentId: paymentIntent.id,
                amount: paymentIntent.amount,
            });
        }
        catch (error) {
            logger_1.logger.error('Error handling payment success:', error);
            throw error;
        }
    }
    async handlePaymentFailed(paymentIntent) {
        try {
            const userId = paymentIntent.metadata?.user_id;
            if (!userId) {
                logger_1.logger.warn('Payment failed without user_id metadata', {
                    paymentIntentId: paymentIntent.id
                });
                return;
            }
            // Mark payment as failed
            await database_1.prisma.payment.updateMany({
                where: {
                    stripePaymentId: paymentIntent.id,
                },
                data: {
                    status: client_1.PaymentStatus.FAILED,
                },
            });
            logger_1.logger.warn('Payment failed', {
                userId,
                paymentIntentId: paymentIntent.id,
                lastPaymentError: paymentIntent.last_payment_error,
            });
            // TODO: Send failure notification email
            // TODO: Create alert
        }
        catch (error) {
            logger_1.logger.error('Error handling payment failure:', error);
            throw error;
        }
    }
    async handleInvoiceFinalized(invoice) {
        try {
            if (!invoice.payment_intent) {
                return;
            }
            // Update payment with invoice details
            await database_1.prisma.payment.updateMany({
                where: {
                    stripePaymentId: invoice.payment_intent,
                },
                data: {
                    invoiceUrl: invoice.invoice_pdf,
                    invoiceNumber: invoice.number,
                },
            });
            logger_1.logger.info('Invoice finalized', {
                invoiceId: invoice.id,
                invoiceNumber: invoice.number,
                paymentIntentId: invoice.payment_intent,
            });
        }
        catch (error) {
            logger_1.logger.error('Error handling invoice finalization:', error);
            throw error;
        }
    }
    async getOrCreateTaxRate() {
        try {
            // Check if tax rate already exists in cache
            const cachedTaxRateId = await redis_1.redis.get('stripe:tax_rate:estonia_vat');
            if (cachedTaxRateId) {
                return cachedTaxRateId;
            }
            // Try to find existing tax rate
            const taxRates = await this.stripe.taxRates.list({
                limit: 100,
            });
            const existingTaxRate = taxRates.data.find(rate => rate.percentage === env_1.env.VAT_RATE * 100 &&
                rate.jurisdiction === 'EE' &&
                rate.active);
            if (existingTaxRate) {
                await redis_1.redis.set('stripe:tax_rate:estonia_vat', existingTaxRate.id, 86400); // Cache for 24h
                return existingTaxRate.id;
            }
            // Create new tax rate
            const taxRate = await this.stripe.taxRates.create({
                display_name: 'TVA Estonienne',
                description: 'Taxe sur la valeur ajoutée en Estonie',
                jurisdiction: 'EE',
                percentage: env_1.env.VAT_RATE * 100, // 22%
                inclusive: false,
                active: true,
            });
            // Cache the tax rate ID
            await redis_1.redis.set('stripe:tax_rate:estonia_vat', taxRate.id, 86400);
            return taxRate.id;
        }
        catch (error) {
            logger_1.logger.error('Failed to get or create tax rate:', error);
            throw new errors_1.StripeError('Failed to setup tax rate', error);
        }
    }
    async getAvailableProducts() {
        try {
            const products = await this.stripe.products.list({
                active: true,
                limit: 10,
            });
            return products.data;
        }
        catch (error) {
            logger_1.logger.error('Failed to get Stripe products:', error);
            throw new errors_1.StripeError('Failed to get products', error);
        }
    }
    async createCustomPrice(amountEur) {
        try {
            const amountCents = Math.round(amountEur * 100);
            const price = await this.stripe.prices.create({
                currency: 'eur',
                unit_amount: amountCents,
                product_data: {
                    name: `Campagne YouTube Ads personnalisée - ${amountEur}€`,
                    metadata: {
                        type: 'custom_campaign',
                        duration_days: '30',
                    },
                },
                metadata: {
                    type: 'custom_campaign',
                    amount_eur: amountEur.toString(),
                },
            });
            logger_1.logger.info('Custom price created', {
                priceId: price.id,
                amountEur,
                amountCents,
            });
            return price;
        }
        catch (error) {
            logger_1.logger.error('Failed to create custom price:', error);
            throw new errors_1.StripeError('Failed to create custom price', error);
        }
    }
}
exports.StripeService = StripeService;
exports.stripeService = new StripeService();
//# sourceMappingURL=stripeService.js.map