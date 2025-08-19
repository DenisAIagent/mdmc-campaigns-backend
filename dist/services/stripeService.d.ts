import Stripe from 'stripe';
import { PaymentStatus } from '@prisma/client';
export declare class StripeService {
    private stripe;
    constructor();
    createCheckoutSession(data: {
        userId: string;
        campaignIds: string[];
        successUrl?: string;
        cancelUrl?: string;
        metadata?: Record<string, string>;
    }): Promise<{
        sessionId: string;
        checkoutUrl: string;
    }>;
    handleWebhook(payload: string | Buffer, signature: string): Promise<void>;
    getPaymentsByUser(userId: string, options?: {
        status?: PaymentStatus;
        limit?: number;
        offset?: number;
    }): Promise<{
        payments: ({
            campaign: {
                status: import(".prisma/client").$Enums.CampaignStatus;
                id: string;
                clipTitle: string;
            };
        } & {
            status: import(".prisma/client").$Enums.PaymentStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            campaignId: string | null;
            stripePaymentId: string | null;
            stripeSessionId: string | null;
            amountCents: number;
            vatRate: number;
            vatCents: number;
            totalCents: number;
            currency: string;
            paidAt: Date | null;
            invoiceNumber: string | null;
            invoiceUrl: string | null;
        })[];
        total: number;
    }>;
    generateInvoice(paymentId: string): Promise<string>;
    private handleCheckoutCompleted;
    private handlePaymentSucceeded;
    private handlePaymentFailed;
    private handleInvoiceFinalized;
    private getOrCreateTaxRate;
    getAvailableProducts(): Promise<Stripe.Product[]>;
    createCustomPrice(amountEur: number): Promise<Stripe.Price>;
}
export declare const stripeService: StripeService;
//# sourceMappingURL=stripeService.d.ts.map