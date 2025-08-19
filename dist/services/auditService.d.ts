interface AuditLogData {
    userId?: string;
    action: string;
    resource: string;
    resourceId?: string;
    oldValues?: any;
    newValues?: any;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
}
export declare class AuditService {
    log(data: AuditLogData): Promise<void>;
    getAuditLogs(filters: {
        userId?: string;
        resource?: string;
        action?: string;
        page?: number;
        limit?: number;
        startDate?: Date;
        endDate?: Date;
    }): Promise<{
        logs: ({
            user: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            userId: string | null;
            action: string;
            resource: string;
            resourceId: string | null;
            oldValues: import("@prisma/client/runtime/library").JsonValue | null;
            newValues: import("@prisma/client/runtime/library").JsonValue | null;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            ipAddress: string | null;
            userAgent: string | null;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    getResourceHistory(resource: string, resourceId: string): Promise<({
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        userId: string | null;
        action: string;
        resource: string;
        resourceId: string | null;
        oldValues: import("@prisma/client/runtime/library").JsonValue | null;
        newValues: import("@prisma/client/runtime/library").JsonValue | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        ipAddress: string | null;
        userAgent: string | null;
    })[]>;
    getUserActivity(userId: string, days?: number): Promise<{
        logs: {
            id: string;
            createdAt: Date;
            userId: string | null;
            action: string;
            resource: string;
            resourceId: string | null;
            oldValues: import("@prisma/client/runtime/library").JsonValue | null;
            newValues: import("@prisma/client/runtime/library").JsonValue | null;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            ipAddress: string | null;
            userAgent: string | null;
        }[];
        summary: Record<string, number>;
        totalActions: number;
    }>;
    cleanupOldLogs(daysToKeep?: number): Promise<number>;
}
export declare const auditService: AuditService;
export {};
//# sourceMappingURL=auditService.d.ts.map