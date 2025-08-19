import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const authorize: (allowedRoles: UserRole[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const optionalAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const requireOwnership: (resourceParam?: string) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const validateApiKey: (validApiKey: string) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map