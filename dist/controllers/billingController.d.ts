import { Request, Response, NextFunction } from 'express';
export declare class BillingController {
    createCheckoutSession(req: Request, res: Response, next: NextFunction): Promise<void>;
    getPayment(req: Request, res: Response, next: NextFunction): Promise<void>;
    getUserBillingStats(req: Request, res: Response, next: NextFunction): Promise<void>;
    getAvailableProducts(req: Request, res: Response, next: NextFunction): Promise<void>;
    createCustomPrice(req: Request, res: Response, next: NextFunction): Promise<void>;
    getPayments(req: Request, res: Response, next: NextFunction): Promise<void>;
    downloadInvoice(req: Request, res: Response, next: NextFunction): Promise<void>;
    handleStripeWebhook(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const billingController: BillingController;
//# sourceMappingURL=billingController.d.ts.map