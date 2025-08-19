import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
export declare const validate: (schema: {
    body?: ZodSchema;
    query?: ZodSchema;
    params?: ZodSchema;
}) => (req: Request, res: Response, next: NextFunction) => void;
export declare const commonSchemas: {
    id: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
    pagination: z.ZodObject<{
        page: z.ZodDefault<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
        limit: z.ZodDefault<z.ZodPipeline<z.ZodEffects<z.ZodString, number, string>, z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        limit?: number;
        page?: number;
    }, {
        limit?: string;
        page?: string;
    }>;
    googleCustomerId: z.ZodString;
    youtubeUrl: z.ZodEffects<z.ZodString, string, string>;
    countries: z.ZodArray<z.ZodString, "many">;
    dateRange: z.ZodEffects<z.ZodObject<{
        from: z.ZodPipeline<z.ZodEffects<z.ZodString, Date, string>, z.ZodDate>;
        to: z.ZodPipeline<z.ZodEffects<z.ZodString, Date, string>, z.ZodDate>;
    }, "strip", z.ZodTypeAny, {
        from?: Date;
        to?: Date;
    }, {
        from?: string;
        to?: string;
    }>, {
        from?: Date;
        to?: Date;
    }, {
        from?: string;
        to?: string;
    }>;
};
export declare const authSchemas: {
    signup: z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
        firstName: z.ZodString;
        lastName: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        password?: string;
        email?: string;
        firstName?: string;
        lastName?: string;
    }, {
        password?: string;
        email?: string;
        firstName?: string;
        lastName?: string;
    }>;
    login: z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        password?: string;
        email?: string;
    }, {
        password?: string;
        email?: string;
    }>;
    refreshToken: z.ZodObject<{
        refreshToken: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        refreshToken?: string;
    }, {
        refreshToken?: string;
    }>;
};
export declare const googleSchemas: {
    linkRequest: z.ZodObject<{
        customerId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        customerId?: string;
    }, {
        customerId?: string;
    }>;
    oauthCallback: z.ZodObject<{
        code: z.ZodString;
        state: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        code?: string;
        state?: string;
    }, {
        code?: string;
        state?: string;
    }>;
};
export declare const campaignSchemas: {
    create: z.ZodObject<{
        clipUrl: z.ZodEffects<z.ZodString, string, string>;
        clipTitle: z.ZodString;
        artistsList: z.ZodString;
        countries: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        clipUrl?: string;
        clipTitle?: string;
        artistsList?: string;
        countries?: string[];
    }, {
        clipUrl?: string;
        clipTitle?: string;
        artistsList?: string;
        countries?: string[];
    }>;
    update: z.ZodObject<{
        clipTitle: z.ZodOptional<z.ZodString>;
        artistsList: z.ZodOptional<z.ZodString>;
        countries: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        clipTitle?: string;
        artistsList?: string;
        countries?: string[];
    }, {
        clipTitle?: string;
        artistsList?: string;
        countries?: string[];
    }>;
    kpisQuery: z.ZodObject<{
        from: z.ZodOptional<z.ZodString>;
        to: z.ZodOptional<z.ZodString>;
        granularity: z.ZodDefault<z.ZodEnum<["daily", "weekly", "monthly"]>>;
    }, "strip", z.ZodTypeAny, {
        from?: string;
        to?: string;
        granularity?: "daily" | "weekly" | "monthly";
    }, {
        from?: string;
        to?: string;
        granularity?: "daily" | "weekly" | "monthly";
    }>;
};
export declare const billingSchemas: {
    checkoutSession: z.ZodObject<{
        campaignIds: z.ZodArray<z.ZodString, "many">;
        successUrl: z.ZodOptional<z.ZodString>;
        cancelUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        campaignIds?: string[];
        successUrl?: string;
        cancelUrl?: string;
    }, {
        campaignIds?: string[];
        successUrl?: string;
        cancelUrl?: string;
    }>;
};
export declare const alertSchemas: {
    list: z.ZodObject<{
        isRead: z.ZodOptional<z.ZodEffects<z.ZodString, boolean, string>>;
        severity: z.ZodOptional<z.ZodEnum<["INFO", "WARNING", "CRITICAL"]>>;
    }, "strip", z.ZodTypeAny, {
        isRead?: boolean;
        severity?: "INFO" | "WARNING" | "CRITICAL";
    }, {
        isRead?: string;
        severity?: "INFO" | "WARNING" | "CRITICAL";
    }>;
};
export declare const fileSchemas: {
    upload: z.ZodObject<{
        file: z.ZodObject<{
            mimetype: z.ZodString;
            size: z.ZodNumber;
            originalname: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            mimetype?: string;
            size?: number;
            originalname?: string;
        }, {
            mimetype?: string;
            size?: number;
            originalname?: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        file?: {
            mimetype?: string;
            size?: number;
            originalname?: string;
        };
    }, {
        file?: {
            mimetype?: string;
            size?: number;
            originalname?: string;
        };
    }>;
    csvUpload: z.ZodObject<{
        file: z.ZodObject<{
            mimetype: z.ZodEnum<["text/csv", "application/vnd.ms-excel"]>;
            size: z.ZodNumber;
            originalname: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            mimetype?: "text/csv" | "application/vnd.ms-excel";
            size?: number;
            originalname?: string;
        }, {
            mimetype?: "text/csv" | "application/vnd.ms-excel";
            size?: number;
            originalname?: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        file?: {
            mimetype?: "text/csv" | "application/vnd.ms-excel";
            size?: number;
            originalname?: string;
        };
    }, {
        file?: {
            mimetype?: "text/csv" | "application/vnd.ms-excel";
            size?: number;
            originalname?: string;
        };
    }>;
};
export declare const extractYouTubeVideoId: (url: string) => string | null;
export declare const validateYouTubeUrl: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateRequest: (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=validation.d.ts.map