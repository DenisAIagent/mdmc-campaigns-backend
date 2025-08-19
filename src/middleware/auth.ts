import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '@/config/database';
import { env } from '@/config/env';
import { AuthenticationError, AuthorizationError } from '@/utils/errors';
import { JwtPayload } from '@/types/express';
import { UserRole } from '@prisma/client';

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Token not provided');
    }

    const token = authHeader.substring(7);
    
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Token expired');
      }
      throw new AuthenticationError('Invalid token');
    }

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new AuthenticationError('User not found or inactive');
    }

    // Attach user to request
    req.user = user;
    req.userId = user.id;
    req.userRole = user.role;

    next();
  } catch (error) {
    next(error);
  }
};

export const authorize = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user || !req.userRole) {
        throw new AuthenticationError('Authentication required');
      }

      if (!allowedRoles.includes(req.userRole as UserRole)) {
        throw new AuthorizationError(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
        },
      });

      if (user && user.isActive) {
        req.user = user;
        req.userId = user.id;
        req.userRole = user.role;
      }
    } catch {
      // Ignore errors for optional auth
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Middleware to ensure the user owns the resource
export const requireOwnership = (resourceParam: string = 'id') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        throw new AuthenticationError('Authentication required');
      }

      const resourceId = req.params[resourceParam];
      if (!resourceId) {
        throw new AuthenticationError('Resource ID not provided');
      }

      // For CLIENT role, ensure they can only access their own resources
      if (req.userRole === UserRole.CLIENT) {
        // This will be implemented per resource type in the controllers
        req.params.ownerId = req.userId;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Middleware to validate API key for webhooks
export const validateApiKey = (validApiKey: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const apiKey = req.headers['x-api-key'] || req.query.api_key;
      
      if (!apiKey || apiKey !== validApiKey) {
        throw new AuthenticationError('Invalid API key');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};