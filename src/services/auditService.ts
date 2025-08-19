import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';

const prisma = new PrismaClient();

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

export class AuditService {
  async log(data: AuditLogData): Promise<void> {
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

      logger.debug('Audit log created', {
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        userId: data.userId,
      });
    } catch (error) {
      logger.error('Failed to create audit log', {
        error: error instanceof Error ? error.message : 'Unknown error',
        data,
      });
      // Don't throw error to avoid breaking the main operation
    }
  }

  async getAuditLogs(filters: {
    userId?: string;
    resource?: string;
    action?: string;
    page?: number;
    limit?: number;
    startDate?: Date;
    endDate?: Date;
  }) {
    const {
      userId,
      resource,
      action,
      page = 1,
      limit = 50,
      startDate,
      endDate,
    } = filters;

    const skip = (page - 1) * limit;

    const where: any = {};

    if (userId) where.userId = userId;
    if (resource) where.resource = resource;
    if (action) where.action = action;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
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

  async getResourceHistory(resource: string, resourceId: string) {
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

  async getUserActivity(userId: string, days: number = 30) {
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
    }, {} as Record<string, number>);

    return {
      logs,
      summary,
      totalActions: logs.length,
    };
  }

  async cleanupOldLogs(daysToKeep: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    logger.info('Audit logs cleanup completed', {
      deletedCount: result.count,
      cutoffDate,
    });

    return result.count;
  }
}

export const auditService = new AuditService();