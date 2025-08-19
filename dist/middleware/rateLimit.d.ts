import { Request, Response, NextFunction } from 'express';
export declare const createRateLimiter: (options: {
    windowMs: number;
    max: number;
    keyGenerator?: (req: Request) => string;
    skipIf?: (req: Request) => boolean;
    message?: string;
}) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const globalRateLimit: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const authRateLimit: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const apiRateLimit: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const uploadRateLimit: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const webhookRateLimit: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const googleAdsRateLimit: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const stripeRateLimit: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const emailRateLimit: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=rateLimit.d.ts.map