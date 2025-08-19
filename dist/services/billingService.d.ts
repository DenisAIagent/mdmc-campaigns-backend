import { PaymentStatus } from '@prisma/client';
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
export declare class BillingService {
    getUserPayments(userId: string, filters: PaymentFilters): Promise<{
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
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    getPaymentById(paymentId: string): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
        campaign: {
            status: import(".prisma/client").$Enums.CampaignStatus;
            id: string;
            clipUrl: string;
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
    }>;
    createPayment(data: {
        userId: string;
        campaignId?: string;
        stripeSessionId?: string;
        stripePaymentId?: string;
        amountCents: number;
        vatRate: number;
        currency: string;
    }): Promise<{
        campaign: {
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
    }>;
    updatePaymentStatus(paymentId: string, status: PaymentStatus, metadata?: any): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
        campaign: {
            status: import(".prisma/client").$Enums.CampaignStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            clipUrl: string;
            clipTitle: string;
            artistsList: string;
            countries: string[];
            clientAccountId: string;
            durationDays: number;
            startsAt: Date | null;
            endsAt: Date | null;
            actualStartedAt: Date | null;
            actualEndedAt: Date | null;
            googleCampaignId: string | null;
            googleAdGroupId: string | null;
            googleAdIds: string[];
            targetingConfig: import("@prisma/client/runtime/library").JsonValue | null;
            budgetConfig: import("@prisma/client/runtime/library").JsonValue | null;
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
    }>;
    getUserBillingStats(userId: string): Promise<BillingStats>;
    getInvoiceUrl(paymentId: string): Promise<string>;
    private generateInvoice;
    private generateInvoiceNumber;
    getPaymentByStripeSessionId(sessionId: string): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
        campaign: {
            status: import(".prisma/client").$Enums.CampaignStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            clipUrl: string;
            clipTitle: string;
            artistsList: string;
            countries: string[];
            clientAccountId: string;
            durationDays: number;
            startsAt: Date | null;
            endsAt: Date | null;
            actualStartedAt: Date | null;
            actualEndedAt: Date | null;
            googleCampaignId: string | null;
            googleAdGroupId: string | null;
            googleAdIds: string[];
            targetingConfig: import("@prisma/client/runtime/library").JsonValue | null;
            budgetConfig: import("@prisma/client/runtime/library").JsonValue | null;
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
    }>;
    getPaymentByStripePaymentId(paymentId: string): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
        campaign: {
            status: import(".prisma/client").$Enums.CampaignStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            clipUrl: string;
            clipTitle: string;
            artistsList: string;
            countries: string[];
            clientAccountId: string;
            durationDays: number;
            startsAt: Date | null;
            endsAt: Date | null;
            actualStartedAt: Date | null;
            actualEndedAt: Date | null;
            googleCampaignId: string | null;
            googleAdGroupId: string | null;
            googleAdIds: string[];
            targetingConfig: import("@prisma/client/runtime/library").JsonValue | null;
            budgetConfig: import("@prisma/client/runtime/library").JsonValue | null;
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
    }>;
    refundPayment(paymentId: string, reason?: string): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
        campaign: {
            status: import(".prisma/client").$Enums.CampaignStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            clipUrl: string;
            clipTitle: string;
            artistsList: string;
            countries: string[];
            clientAccountId: string;
            durationDays: number;
            startsAt: Date | null;
            endsAt: Date | null;
            actualStartedAt: Date | null;
            actualEndedAt: Date | null;
            googleCampaignId: string | null;
            googleAdGroupId: string | null;
            googleAdIds: string[];
            targetingConfig: import("@prisma/client/runtime/library").JsonValue | null;
            budgetConfig: import("@prisma/client/runtime/library").JsonValue | null;
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
    }>;
}
export declare const billingService: BillingService;
export {};
//# sourceMappingURL=billingService.d.ts.map