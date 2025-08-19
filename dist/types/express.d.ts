import { User } from '@prisma/client';
declare global {
    namespace Express {
        interface Request {
            user?: User;
            userId?: string;
            userRole?: string;
        }
    }
}
export interface AuthenticatedRequest extends Express.Request {
    user: User;
    userId: string;
    userRole: string;
}
export interface PaginationParams {
    page: number;
    limit: number;
    offset: number;
}
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export interface ErrorResponse {
    error: string;
    message: string;
    details?: unknown;
    statusCode: number;
}
export interface JwtPayload {
    userId: string;
    email: string;
    role: string;
    iat?: number;
    exp?: number;
}
export interface RefreshTokenPayload {
    userId: string;
    tokenId: string;
    iat?: number;
    exp?: number;
}
//# sourceMappingURL=express.d.ts.map