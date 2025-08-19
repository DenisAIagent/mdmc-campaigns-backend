"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditService = exports.AuditService = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("@/utils/logger");
const prisma = new client_1.PrismaClient();
class AuditService {
    async log(data) {
        try {
            await prisma.auditLog.create({
                data: {
                    userId: data.userId,
                    action: data.action,
                    resource: data.resource,
                    resourceId: data.resourceId,
                    oldValues: data.oldValues,
                    newValues: data.newValues,
                    metadata: data.metadata,
                    ipAddress: data.ipAddress,
                    userAgent: data.userAgent,
                },
            });
            logger_1.logger.debug('Audit log created', {
                action: data.action,
                resource: data.resource,
                resourceId: data.resourceId,
                userId: data.userId,
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to create audit log', {
                error: error instanceof Error ? error.message : 'Unknown error',
                data,
            });
            // Don't throw error to avoid breaking the main operation
        }
    }
    async getAuditLogs(filters) {
        const { userId, resource, action, page = 1, limit = 50, startDate, endDate, } = filters;
        const skip = (page - 1) * limit;
        const where = {};
        if (userId)
            where.userId = userId;
        if (resource)
            where.resource = resource;
        if (action)
            where.action = action;
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate)
                where.createdAt.gte = startDate;
            if (endDate)
                where.createdAt.lte = endDate;
        }
        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
            }),
            prisma.auditLog.count({ where }),
        ]);
        return {
            logs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }
    async getResourceHistory(resource, resourceId) {
        const logs = await prisma.auditLog.findMany({
            where: {
                resource,
                resourceId,
            },
            orderBy: { createdAt: 'asc' },
            include: {
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
        return logs;
    }
    async getUserActivity(userId, days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const logs = await prisma.auditLog.findMany({
            where: {
                userId,
                createdAt: {
                    gte: startDate,
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 100, // Limit to most recent 100 activities
        });
        // Group by action and resource for summary
        const summary = logs.reduce((acc, log) => {
            const key = `${log.action}_${log.resource}`;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        return {
            logs,
            summary,
            totalActions: logs.length,
        };
    }
    async cleanupOldLogs(daysToKeep = 365) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        const result = await prisma.auditLog.deleteMany({
            where: {
                createdAt: {
                    lt: cutoffDate,
                },
            },
        });
        logger_1.logger.info('Audit logs cleanup completed', {
            deletedCount: result.count,
            cutoffDate,
        });
        return result.count;
    }
}
exports.AuditService = AuditService;
exports.auditService = new AuditService();
//# sourceMappingURL=auditService.js.map